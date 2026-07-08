"""
Redis 기반 면접 세션 상태 저장소.

Redis 장애 시 동작 정책:
- 세션 메타(seq, member_id 등) 조회 실패 → None 반환, 호출부에서 신규 세션으로 처리
- push 시 seq 증가 / buffer 저장 실패 → 로그 기록 후 in-process seq로 fallback
- pending_llm 저장 실패 → 로그 기록, trigger 유실 (LLM 재시도 없음 — Spring retry로 보완)
- rate limit 조회 실패 → 허용으로 처리 (false negative 방향)
"""

import json
import logging
import time
from typing import Any

import redis.asyncio as aioredis

from core.config import get_settings

_log = logging.getLogger(__name__)

# Redis key 접두사
_PREFIX = "interview"


def _key_meta(session_id: str) -> str:
    return f"{_PREFIX}:session:{session_id}:meta"


def _key_seq(session_id: str) -> str:
    return f"{_PREFIX}:session:{session_id}:seq"


def _key_buffer(session_id: str) -> str:
    return f"{_PREFIX}:session:{session_id}:buffer"


def _key_pending(session_id: str) -> str:
    return f"{_PREFIX}:pending_llm:{session_id}"


def _key_rate(session_id: str) -> str:
    return f"{_PREFIX}:rate:{session_id}"


def _ttl() -> int:
    return get_settings().redis_session_ttl_seconds


# ── 세션 메타 ────────────────────────────────────────────────────────────────

async def save_session_meta(redis: aioredis.Redis, session_id: str, meta: dict[str, Any]) -> None:
    """직렬화 가능한 세션 필드를 Redis Hash에 저장한다."""
    serializable = {
        k: json.dumps(v, ensure_ascii=False) if isinstance(v, (list, dict, set)) else (v if v is not None else "")
        for k, v in meta.items()
    }
    # set → list 변환 (JSON 직렬화)
    for k, v in meta.items():
        if isinstance(v, set):
            serializable[k] = json.dumps(list(v), ensure_ascii=False)
    try:
        pipe = redis.pipeline()
        pipe.hset(_key_meta(session_id), mapping=serializable)
        pipe.expire(_key_meta(session_id), _ttl())
        await pipe.execute()
    except Exception as exc:
        _log.warning("[Session: %s] save_session_meta failed: %s", session_id, exc)


async def load_session_meta(redis: aioredis.Redis, session_id: str) -> dict[str, Any] | None:
    """Redis Hash에서 세션 메타를 복원한다. 키가 없으면 None 반환."""
    try:
        raw = await redis.hgetall(_key_meta(session_id))
        if not raw:
            return None
        return _deserialize_meta(raw)
    except Exception as exc:
        _log.warning("[Session: %s] load_session_meta failed: %s", session_id, exc)
        return None


def _deserialize_meta(raw: dict[str, str]) -> dict[str, Any]:
    list_fields = {"answer_history", "msg_buffer", "used_fallback_questions", "voice_quality_by_order"}
    result: dict[str, Any] = {}
    for k, v in raw.items():
        if k in list_fields:
            parsed = json.loads(v) if v else []
            if k == "used_fallback_questions":
                result[k] = set(parsed)
            elif k == "voice_quality_by_order":
                result[k] = {int(order): ratio for order, ratio in (parsed if isinstance(parsed, list) else parsed.items())}
            else:
                result[k] = parsed
        elif v == "":
            result[k] = None
        else:
            result[k] = v
    return result


async def delete_session(redis: aioredis.Redis, session_id: str) -> None:
    try:
        await redis.delete(
            _key_meta(session_id),
            _key_seq(session_id),
            _key_buffer(session_id),
        )
    except Exception as exc:
        _log.warning("[Session: %s] delete_session failed: %s", session_id, exc)


async def refresh_session_ttl(redis: aioredis.Redis, session_id: str) -> None:
    try:
        pipe = redis.pipeline()
        for key in [_key_meta(session_id), _key_seq(session_id), _key_buffer(session_id)]:
            pipe.expire(key, _ttl())
        await pipe.execute()
    except Exception as exc:
        _log.warning("[Session: %s] refresh_session_ttl failed: %s", session_id, exc)


# ── seq / msg_buffer ─────────────────────────────────────────────────────────

_MSG_BUFFER_MAX = 50


async def increment_seq(redis: aioredis.Redis, session_id: str) -> int:
    """seq를 원자적으로 1 증가시키고 새 값을 반환한다. 실패 시 -1 반환."""
    try:
        val = await redis.incr(_key_seq(session_id))
        await redis.expire(_key_seq(session_id), _ttl())
        return int(val)
    except Exception as exc:
        _log.warning("[Session: %s] increment_seq failed: %s", session_id, exc)
        return -1


async def get_seq(redis: aioredis.Redis, session_id: str) -> int:
    try:
        val = await redis.get(_key_seq(session_id))
        return int(val) if val else 0
    except Exception as exc:
        _log.warning("[Session: %s] get_seq failed: %s", session_id, exc)
        return 0


async def set_seq(redis: aioredis.Redis, session_id: str, seq: int) -> None:
    try:
        await redis.set(_key_seq(session_id), seq, ex=_ttl())
    except Exception as exc:
        _log.warning("[Session: %s] set_seq failed: %s", session_id, exc)


async def push_to_buffer(redis: aioredis.Redis, session_id: str, payload: dict[str, Any]) -> None:
    try:
        pipe = redis.pipeline()
        pipe.rpush(_key_buffer(session_id), json.dumps(payload, ensure_ascii=False))
        pipe.ltrim(_key_buffer(session_id), -_MSG_BUFFER_MAX, -1)
        pipe.expire(_key_buffer(session_id), _ttl())
        await pipe.execute()
    except Exception as exc:
        _log.warning("[Session: %s] push_to_buffer failed: %s", session_id, exc)


async def get_buffer(redis: aioredis.Redis, session_id: str) -> list[dict[str, Any]]:
    try:
        raw_list = await redis.lrange(_key_buffer(session_id), 0, -1)
        return [json.loads(r) for r in raw_list]
    except Exception as exc:
        _log.warning("[Session: %s] get_buffer failed: %s", session_id, exc)
        return []


# ── pending LLM trigger ──────────────────────────────────────────────────────

async def save_pending_llm(redis: aioredis.Redis, session_id: str, payload: dict[str, Any]) -> None:
    try:
        await redis.set(
            _key_pending(session_id),
            json.dumps(payload, ensure_ascii=False),
            ex=_ttl(),
        )
    except Exception as exc:
        _log.warning("[Session: %s] save_pending_llm failed: %s", session_id, exc)


async def pop_pending_llm(redis: aioredis.Redis, session_id: str) -> dict[str, Any] | None:
    try:
        raw = await redis.getdel(_key_pending(session_id))
        return json.loads(raw) if raw else None
    except Exception as exc:
        _log.warning("[Session: %s] pop_pending_llm failed: %s", session_id, exc)
        return None


async def has_pending_llm(redis: aioredis.Redis, session_id: str) -> bool:
    try:
        return bool(await redis.exists(_key_pending(session_id)))
    except Exception:
        return False


# ── rate limit (슬라이딩 윈도우 — Redis Sorted Set) ──────────────────────────

async def rate_limit_check_and_record(
    redis: aioredis.Redis,
    session_id: str,
    max_requests: int,
    window_seconds: float,
) -> bool:
    """
    슬라이딩 윈도우 rate limit 체크.
    Returns True(허용) / False(초과).
    Redis 장애 시 True(허용) 반환.
    """
    key = _key_rate(session_id)
    now = time.time()
    window_start = now - window_seconds
    ttl = get_settings().redis_rate_limit_ttl_seconds

    try:
        pipe = redis.pipeline()
        pipe.zremrangebyscore(key, "-inf", window_start)  # 만료 항목 제거
        pipe.zcard(key)                                    # 현재 윈도우 내 count
        pipe.zadd(key, {str(now): now})                   # 현재 요청 기록
        pipe.expire(key, ttl)
        results = await pipe.execute()
        current_count = results[1]
        return int(current_count) < max_requests
    except Exception as exc:
        _log.warning("[Session: %s] rate_limit_check failed (allowing): %s", session_id, exc)
        return True
