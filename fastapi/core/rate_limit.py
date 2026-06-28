import time
from collections import deque
from threading import Lock


class SessionRateLimiter:
    """세션 단위 슬라이딩 윈도우 Rate Limiter.

    프로세스 메모리 기반 — 단일 인스턴스 환경 전용.
    Scale-out 환경에서는 Redis 기반으로 교체가 필요하다.
    """

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

            # 윈도우 밖 타임스탬프 제거
            while bucket and bucket[0] < cutoff:
                bucket.popleft()

            # 윈도우 만료로 버킷이 비었으면 엔트리 자체를 제거
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


# 5초 단위 청크 기준 10초 윈도우에서 최대 6회 허용
# (정상 플로우: 5초 청크 → 10초당 최대 2개 + 여유분)
voice_chunk_limiter = SessionRateLimiter(max_requests=6, window_seconds=10.0)
