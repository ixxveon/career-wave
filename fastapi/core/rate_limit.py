"""
Redis 기반 슬라이딩 윈도우 Rate Limiter.

Redis 장애 시 허용(false negative) 방향으로 처리한다.
호환성을 위해 기존 SessionRateLimiter 인터페이스를 유지하되
비동기 Redis 버전을 별도로 제공한다.
"""

import time
from collections import deque
from threading import Lock

import redis.asyncio as aioredis


class SessionRateLimiter:
    """프로세스 내 슬라이딩 윈도우 Rate Limiter (단일 인스턴스 fallback용)."""

    def __init__(self, max_requests: int, window_seconds: float) -> None:
        self._max_requests = max_requests
        self._window_seconds = window_seconds
        self._buckets: dict[str, deque[float]] = {}
        self._lock = Lock()

    def is_allowed(self, session_id: str) -> bool:
        now = time.monotonic()
        cutoff = now - self._window_seconds

        with self._lock:
            bucket = self._buckets.setdefault(session_id, deque())
            while bucket and bucket[0] < cutoff:
                bucket.popleft()
            if not bucket and session_id in self._buckets:
                del self._buckets[session_id]
                bucket = self._buckets.setdefault(session_id, deque())
            if len(bucket) >= self._max_requests:
                return False
            bucket.append(now)
            return True

    def clear(self, session_id: str) -> None:
        with self._lock:
            self._buckets.pop(session_id, None)


async def is_rate_limited(
    redis: aioredis.Redis,
    session_id: str,
    max_requests: int = 6,
    window_seconds: float = 10.0,
) -> bool:
    """Redis 슬라이딩 윈도우 rate limit 체크. 초과 시 True 반환."""
    from user.interview.store.session_store import rate_limit_check_and_record
    allowed = await rate_limit_check_and_record(redis, session_id, max_requests, window_seconds)
    return not allowed


# 하위 호환용 — 단일 인스턴스 환경에서만 사용
# Scale-out 환경에서는 is_rate_limited() 비동기 함수를 사용한다.
voice_chunk_limiter = SessionRateLimiter(max_requests=6, window_seconds=10.0)
