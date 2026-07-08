import asyncio
import json
import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from fastapi.websockets import WebSocketState
from jose import JWTError, jwt

import httpx

from core.config import get_settings
from core.redis import get_redis
from user.interview.store import session_store

_spring_client: httpx.AsyncClient | None = None


def _get_spring_client() -> httpx.AsyncClient:
    global _spring_client
    if _spring_client is None:
        _spring_client = httpx.AsyncClient(timeout=3.0)
    return _spring_client

_base_log = logging.getLogger(__name__)

router = APIRouter(tags=["interview-ws"])


class InterviewErrorCode(str, Enum):
    AI_PIPELINE_ERROR = "INTERVIEW_AI_PIPELINE_ERROR"
    STT_FAILED = "INTERVIEW_STT_FAILED"
    TTS_FAILED = "INTERVIEW_TTS_FAILED"
    LLM_FAILED = "INTERVIEW_LLM_FAILED"
    SESSION_EXPIRED = "INTERVIEW_SESSION_EXPIRED"
    CALLBACK_FAILED = "INTERVIEW_CALLBACK_FAILED"
    DUPLICATED_CONNECTION = "INTERVIEW_DUPLICATED_CONNECTION"


class _SessionAdapter(logging.LoggerAdapter):
    def process(self, msg: str, kwargs: dict[str, Any]) -> tuple[str, dict[str, Any]]:
        return f"[Session: {self.extra['session_id']}] {msg}", kwargs


def _make_log(session_id: str) -> _SessionAdapter:
    return _SessionAdapter(_base_log, {"session_id": session_id})


_EXPIRY_WARNING_SECONDS = 60

# 인프로세스 WebSocket 레지스트리 (직렬화 불가 — 각 노드에서 유지)
@dataclass
class _LiveSession:
    ws: WebSocket
    member_id: str
    token_exp: float
    # Redis 장애 시 fallback용 in-process seq (정상 시엔 Redis seq 사용)
    _local_seq: int = field(default=0)


_live_sessions: dict[str, _LiveSession] = {}

_RECONNECT_WINDOW_SECONDS = 300


async def _expire_session(session_id: str, live: _LiveSession) -> None:
    """재연결 윈도우 경과 후 세션 상태를 Redis에서 제거한다."""
    await asyncio.sleep(_RECONNECT_WINDOW_SECONDS)
    if _live_sessions.get(session_id) is live:
        _live_sessions.pop(session_id, None)
        redis = await get_redis()
        await session_store.delete_session(redis, session_id)
        from user.interview.pipeline.stt_pipeline import _audio_buffers
        _audio_buffers.pop(session_id, None)
        _base_log.info("[Session: %s] session expired after reconnect window", session_id)


def _verify_jwt(token: str) -> dict[str, Any]:
    settings = get_settings()
    return jwt.decode(token, settings.jwt_secret, algorithms=["HS256", "HS384"], audience="user")


async def _verify_session_ownership(session_id: str, member_id: str) -> bool | None:
    settings = get_settings()
    url = (
        f"{settings.spring_base_url.rstrip('/')}"
        f"/internal/api/v1/interview/callback/{session_id}/verify"
        f"?memberId={member_id}"
    )
    try:
        response = await _get_spring_client().get(url, headers={"X-Internal-Secret": settings.webhook_secret})
        return response.status_code == 200
    except Exception as exc:
        _base_log.warning("[Session: %s] ownership verify request failed: %s", session_id, exc)
        return None


async def _close_existing(session_id: str, slog: _SessionAdapter) -> None:
    existing = _live_sessions.get(session_id)
    if existing is None:
        return
    try:
        if existing.ws.client_state != WebSocketState.DISCONNECTED:
            await existing.ws.send_text(json.dumps({
                "type": "ERROR",
                "sequenceNumber": None,
                "content": "다른 기기에서 동일한 세션으로 연결되었습니다.",
                "questionOrder": None,
                "chunkIndex": None,
                "isFinal": None,
                "voiceQualityRatio": None,
                "audioData": None,
                "errorCode": InterviewErrorCode.DUPLICATED_CONNECTION,
            }))
            await existing.ws.close(code=1000)
            slog.info("existing WS closed with DUPLICATED_CONNECTION")
    except Exception:
        slog.warning("failed to close existing WS cleanly — already disconnected")


@router.websocket("/ws/user/interview/{session_id}/ai")
async def interview_ws(
    websocket: WebSocket,
    session_id: str,
    token: str | None = Query(default=None),
    lastReceivedSequenceNumber: int | None = Query(default=None),
) -> None:
    slog = _make_log(session_id)

    # ── JWT 검증 ──────────────────────────────────────────────────────────────
    try:
        if not token:
            raise JWTError("token missing")
        claims = _verify_jwt(token)
        member_id: str = claims.get("sub", "")
        raw_exp = claims.get("exp")
        if raw_exp is None:
            raise JWTError("exp claim missing")
        token_exp: float = float(raw_exp)
    except (JWTError, TypeError, ValueError):
        await websocket.accept()
        await websocket.close(code=1008)
        slog.warning("WS connection rejected: invalid or missing JWT")
        return

    # ── 세션 소유권 검증 ──────────────────────────────────────────────────────
    is_reconnect = lastReceivedSequenceNumber is not None
    spring_result = await _verify_session_ownership(session_id, member_id)

    if spring_result is False:
        await websocket.accept()
        await websocket.close(code=1008)
        slog.warning("WS connection rejected: session ownership mismatch memberId=%s", member_id)
        return
    elif spring_result is None:
        # Spring 통신 장애 — Redis 또는 인프로세스 메타로 fallback
        redis = await get_redis()
        meta = await session_store.load_session_meta(redis, session_id)
        stored_member = (meta or {}).get("member_id") or (
            _live_sessions[session_id].member_id if session_id in _live_sessions else None
        )
        if is_reconnect and stored_member == member_id:
            slog.warning(
                "Spring verify unavailable — allowing reconnect via stored state: memberId=%s",
                member_id,
            )
        else:
            await websocket.accept()
            await websocket.close(code=1008)
            slog.warning(
                "WS connection rejected: Spring verify unavailable and no stored state: memberId=%s",
                member_id,
            )
            return

    await websocket.accept()

    # ── 중복 연결 처리 ────────────────────────────────────────────────────────
    await _close_existing(session_id, slog)

    redis = await get_redis()

    # Redis에서 기존 seq 계승 (재연결 시 연속성 보장)
    prev_seq = await session_store.get_seq(redis, session_id)
    live = _LiveSession(ws=websocket, member_id=member_id, token_exp=token_exp)
    live._local_seq = prev_seq
    _live_sessions[session_id] = live

    # 세션 메타 저장 (LLM 파이프라인 컨텍스트 — connect 시점에 기존 메타 유지 또는 초기화)
    existing_meta = await session_store.load_session_meta(redis, session_id)
    if not existing_meta:
        await session_store.save_session_meta(redis, session_id, {
            "member_id": member_id,
            "interview_type": None,
            "focus_type": None,
            "session_type": None,
            "target_company": None,
            "recent_answer_quality": None,
            "answer_history": [],
            "rag_context": None,
            "used_fallback_questions": set(),
            "voice_quality_by_order": {},
        })
    else:
        await session_store.refresh_session_ttl(redis, session_id)

    slog.info("WS connected: lastReceivedSeq=%s", lastReceivedSequenceNumber)

    # ── WS 연결 전 도착한 LLM trigger flush ───────────────────────────────────
    # 재연결 윈도우 중 WS가 끊긴 상태로 trigger가 도착한 경우에도 flush가 필요하므로
    # is_reconnect / existing_meta 여부와 무관하게 항상 pending을 확인한다.
    pending_llm = await session_store.pop_pending_llm(redis, session_id)
    if pending_llm:
        # pending에 담긴 컨텍스트를 메타에 반영
        patch: dict[str, Any] = {}
        for field in ("sessionType", "interviewType", "focusType", "targetCompany"):
            if pending_llm.get(field):
                meta_key = {
                    "sessionType": "session_type",
                    "interviewType": "interview_type",
                    "focusType": "focus_type",
                    "targetCompany": "target_company",
                }[field]
                patch[meta_key] = pending_llm[field]
        if patch:
            merged = {**(existing_meta or {}), **patch}
            await session_store.save_session_meta(redis, session_id, merged)

        from user.interview.pipeline import llm_pipeline
        asyncio.create_task(
            llm_pipeline.generate_and_deliver_question(
                session_id=session_id,
                question_order=pending_llm["questionOrder"],
                answer_text=pending_llm["answerText"],
                question_text=pending_llm.get("questionText"),
            )
        )
        slog.info("flushed pending LLM trigger: questionOrder=%s", pending_llm["questionOrder"])

    # ── 재연결 시 미전달 메시지 재전송 ────────────────────────────────────────
    if lastReceivedSequenceNumber is not None:
        buffer = await session_store.get_buffer(redis, session_id)
        pending = [m for m in buffer if m["sequenceNumber"] > lastReceivedSequenceNumber]
        for msg in pending:
            try:
                await websocket.send_text(json.dumps(msg))
            except Exception:
                slog.warning("replay send failed: seq=%d", msg["sequenceNumber"])
        slog.info("replayed %d messages after reconnect", len(pending))

    # ── JWT 만료 감시 태스크 ──────────────────────────────────────────────────
    async def _watch_token_expiry() -> None:
        now = time.time()
        remaining = live.token_exp - now
        if remaining <= 0:
            await send_error(session_id, "JWT가 이미 만료되었습니다. 재연결이 필요합니다.", InterviewErrorCode.SESSION_EXPIRED)
            slog.warning("token already expired on connect — closing WS: exp=%.0f", live.token_exp)
            try:
                await live.ws.close(code=1008)
            except Exception:
                pass
            return

        warning_delay = remaining - _EXPIRY_WARNING_SECONDS
        if warning_delay > 0:
            await asyncio.sleep(warning_delay)
            if _live_sessions.get(session_id) is live:
                await send_error(
                    session_id,
                    f"JWT가 {_EXPIRY_WARNING_SECONDS}초 후 만료됩니다. 토큰을 갱신해주세요.",
                    InterviewErrorCode.SESSION_EXPIRED,
                )
                slog.info("token expiry warning sent: exp=%.0f", live.token_exp)
                await asyncio.sleep(_EXPIRY_WARNING_SECONDS)
        else:
            await asyncio.sleep(remaining)

        if _live_sessions.get(session_id) is live:
            await send_error(session_id, "JWT가 만료되었습니다. 재연결이 필요합니다.", InterviewErrorCode.SESSION_EXPIRED)
            slog.warning("token expired — closing WS: exp=%.0f", live.token_exp)
            try:
                await live.ws.close(code=1008)
            except Exception:
                pass

    expiry_task = asyncio.create_task(_watch_token_expiry())

    # ── 연결 유지 ─────────────────────────────────────────────────────────────
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        slog.info("WS disconnected")
    finally:
        expiry_task.cancel()
        if _live_sessions.get(session_id) is live:
            asyncio.create_task(_expire_session(session_id, live))
            slog.info("holding buffer for %ds reconnect window", _RECONNECT_WINDOW_SECONDS)


# ── 내부 Push 헬퍼 ────────────────────────────────────────────────────────────

async def _push(session_id: str, payload: dict[str, Any]) -> None:
    live = _live_sessions.get(session_id)
    if live is None:
        _base_log.warning("[Session: %s] push skipped: no active WS", session_id)
        return

    redis = await get_redis()
    seq = await session_store.increment_seq(redis, session_id)
    if seq == -1:
        # Redis 장애 시 in-process fallback
        live._local_seq += 1
        seq = live._local_seq
    else:
        # Redis 정상 시에도 fallback 카운터를 동기화해 일시 장애 후 seq 역행 방지
        live._local_seq = seq

    payload["sequenceNumber"] = seq
    await session_store.push_to_buffer(redis, session_id, payload)

    try:
        await live.ws.send_text(json.dumps(payload, ensure_ascii=False))
    except Exception:
        _base_log.warning("[Session: %s] push failed: seq=%d", session_id, seq)


# ── 세션 메타 접근 헬퍼 (파이프라인에서 사용) ─────────────────────────────────

async def get_session_meta(session_id: str) -> dict[str, Any] | None:
    redis = await get_redis()
    return await session_store.load_session_meta(redis, session_id)


async def update_session_meta(session_id: str, patch: dict[str, Any]) -> None:
    redis = await get_redis()
    meta = await session_store.load_session_meta(redis, session_id) or {}
    meta.update(patch)
    await session_store.save_session_meta(redis, session_id, meta)


def is_session_live(session_id: str) -> bool:
    """현재 프로세스에 살아있는 WS 연결이 있는지 확인한다."""
    return session_id in _live_sessions


# ── Public Push API ──────────────────────────────────────────────────────────

async def send_stt_partial(
    session_id: str,
    content: str,
    question_order: int,
    chunk_index: int,
) -> None:
    await _push(session_id, {
        "type": "STT_PARTIAL",
        "content": content,
        "questionOrder": question_order,
        "chunkIndex": chunk_index,
        "isFinal": False,
        "voiceQualityRatio": None,
        "audioData": None,
        "errorCode": None,
    })


async def send_stt_final(
    session_id: str,
    content: str,
    question_order: int,
    voice_quality_ratio: float,
) -> None:
    await _push(session_id, {
        "type": "STT_FINAL",
        "content": content,
        "questionOrder": question_order,
        "chunkIndex": None,
        "isFinal": True,
        "voiceQualityRatio": voice_quality_ratio,
        "audioData": None,
        "errorCode": None,
    })


async def send_tts_audio(
    session_id: str,
    audio_data: str,
    question_order: int,
    chunk_index: int,
    is_final: bool,
) -> None:
    await _push(session_id, {
        "type": "TTS_AUDIO_END" if is_final else "TTS_AUDIO",
        "content": None,
        "questionOrder": question_order,
        "chunkIndex": None if is_final else chunk_index,
        "isFinal": is_final,
        "voiceQualityRatio": None,
        "audioChunk": None if is_final else audio_data,
        "errorCode": None,
    })


async def send_answer_hint(
    session_id: str,
    hint: str,
    question_order: int,
) -> None:
    await _push(session_id, {
        "type": "ANSWER_HINT",
        "content": hint,
        "questionOrder": question_order,
        "chunkIndex": None,
        "isFinal": None,
        "voiceQualityRatio": None,
        "audioData": None,
        "errorCode": None,
    })


async def send_error(
    session_id: str,
    content: str,
    error_code: InterviewErrorCode,
    question_order: int | None = None,
) -> None:
    await _push(session_id, {
        "type": "ERROR",
        "content": content,
        "questionOrder": question_order,
        "chunkIndex": None,
        "isFinal": None,
        "voiceQualityRatio": None,
        "audioData": None,
        "errorCode": error_code,
    })
