import json
import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from fastapi.websockets import WebSocketState
from jose import JWTError, jwt

from core.config import get_settings

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
    """모든 파이프라인 로그에 [Session: {sessionId}] 컨텍스트를 자동 주입한다."""

    def process(self, msg: str, kwargs: dict[str, Any]) -> tuple[str, dict[str, Any]]:
        return f"[Session: {self.extra['session_id']}] {msg}", kwargs


def _make_log(session_id: str) -> _SessionAdapter:
    return _SessionAdapter(_base_log, {"session_id": session_id})


@dataclass
class _SessionContext:
    ws: WebSocket
    seq: int = 0
    # 재연결 시 미전달 메시지 재전송용 버퍼 (Phase 6에서 Redis 전환 예정)
    msg_buffer: list[dict[str, Any]] = field(default_factory=list)


_sessions: dict[str, _SessionContext] = {}
_MSG_BUFFER_MAX = 50


def _verify_jwt(token: str) -> dict[str, Any]:
    settings = get_settings()
    return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])


async def _close_existing(session_id: str, slog: _SessionAdapter) -> None:
    """중복 연결 감지 시 기존 소켓에 에러 메시지를 전송한 뒤 close(1000)한다."""
    existing = _sessions.get(session_id)
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
    """
    FastAPI WebSocket — Server → Client 단방향 Push 채널.
    클라이언트는 연결만 수립하며 업링크 메시지를 전송하지 않는다.
    sequenceNumber는 서버가 Push하는 메시지에만 포함된다.
    """
    slog = _make_log(session_id)

    # ── JWT 검증 ────────────────────────────────────────────────────────────
    try:
        if not token:
            raise JWTError("token missing")
        _verify_jwt(token)
    except JWTError:
        await websocket.close(code=1008)
        slog.warning("WS connection rejected: invalid or missing JWT")
        return

    await websocket.accept()

    # ── 중복 연결 처리 ───────────────────────────────────────────────────────
    await _close_existing(session_id, slog)

    # 기존 컨텍스트에서 seq·buffer 계승 (재연결 시 sequenceNumber 연속성 보장)
    prev = _sessions.get(session_id)
    ctx = _SessionContext(
        ws=websocket,
        seq=prev.seq if prev else 0,
        msg_buffer=prev.msg_buffer if prev else [],
    )
    _sessions[session_id] = ctx

    slog.info("WS connected: lastReceivedSeq=%s", lastReceivedSequenceNumber)

    # ── 재연결 시 미전달 메시지 재전송 ──────────────────────────────────────
    if lastReceivedSequenceNumber is not None:
        pending = [m for m in ctx.msg_buffer if m["sequenceNumber"] > lastReceivedSequenceNumber]
        for msg in pending:
            try:
                await websocket.send_text(json.dumps(msg))
            except Exception:
                slog.warning("replay send failed: seq=%d", msg["sequenceNumber"])
        slog.info("replayed %d messages after reconnect", len(pending))

    # ── 연결 유지 (서버 Push 전용 채널) ─────────────────────────────────────
    try:
        while True:
            # 클라이언트 ping/keep-alive 수신 후 무시 (연결 유지 목적)
            await websocket.receive_text()
    except WebSocketDisconnect:
        slog.info("WS disconnected")
    finally:
        # 새 연결로 교체된 경우엔 제거하지 않음
        # Phase 6: 5분 좀비 세션 타이머로 교체 예정
        if _sessions.get(session_id) is ctx:
            _sessions.pop(session_id, None)


# ── 내부 Push 헬퍼 ──────────────────────────────────────────────────────────

async def _push(session_id: str, payload: dict[str, Any]) -> None:
    ctx = _sessions.get(session_id)
    if ctx is None:
        _base_log.warning("[Session: %s] push skipped: no active WS", session_id)
        return
    ctx.seq += 1
    payload["sequenceNumber"] = ctx.seq
    ctx.msg_buffer.append(payload)
    if len(ctx.msg_buffer) > _MSG_BUFFER_MAX:
        ctx.msg_buffer.pop(0)
    try:
        await ctx.ws.send_text(json.dumps(payload, ensure_ascii=False))
    except Exception:
        _base_log.warning("[Session: %s] push failed: seq=%d", session_id, ctx.seq)


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
        "audioData": None if is_final else audio_data,
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
