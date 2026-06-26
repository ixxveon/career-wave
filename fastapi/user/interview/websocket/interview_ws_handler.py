import asyncio
import json
import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from fastapi.websockets import WebSocketState
from jose import JWTError, jwt

import httpx

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
    member_id: str = ""
    seq: int = 0
    # 재연결 시 미전달 메시지 재전송용 버퍼 (Scale-out 시 Redis 전환 예정)
    msg_buffer: list[dict[str, Any]] = field(default_factory=list)
    # Phase 4 — LLM 파이프라인 컨텍스트
    interview_type: str | None = None       # TECHNICAL | PERSONALITY | PROJECT
    session_type: str | None = None         # TEXT | VOICE
    answer_history: list[dict[str, str]] = field(default_factory=list)  # [{question, answer}, ...]
    rag_context: str | None = None          # RAG 인덱싱된 문서 텍스트
    used_fallback_questions: set[str] = field(default_factory=set)  # 중복 폴백 방지
    voice_quality_by_order: dict[int, float] = field(default_factory=dict)  # questionOrder → voiceQualityRatio


_sessions: dict[str, _SessionContext] = {}
_pending_llm: dict[str, dict[str, Any]] = {}  # WS 연결 전 도착한 LLM trigger 임시 보관
_MSG_BUFFER_MAX = 50
_RECONNECT_WINDOW_SECONDS = 300  # 재연결 대기 윈도우 (5분)


async def _expire_session(session_id: str, ctx: _SessionContext) -> None:
    """재연결 윈도우 경과 후 세션 컨텍스트 및 STT 버퍼를 해제한다."""
    await asyncio.sleep(_RECONNECT_WINDOW_SECONDS)
    if _sessions.get(session_id) is ctx:
        _sessions.pop(session_id, None)
        from user.interview.pipeline.stt_pipeline import _audio_buffers
        _audio_buffers.pop(session_id, None)
        _base_log.info("[Session: %s] session expired after reconnect window", session_id)


def _verify_jwt(token: str) -> dict[str, Any]:
    settings = get_settings()
    return jwt.decode(token, settings.jwt_secret, algorithms=["HS256", "HS384"], audience="user")


async def _verify_session_ownership(session_id: str, member_id: str) -> bool:
    """Spring 내부 API로 session_id가 member_id 소유인지 검증한다."""
    settings = get_settings()
    url = (
        f"{settings.spring_base_url.rstrip('/')}"
        f"/internal/api/v1/interview/callback/{session_id}/verify"
        f"?memberId={member_id}"
    )
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(url, headers={"X-Internal-Secret": settings.webhook_secret})
            return response.status_code == 200
    except Exception as exc:
        _base_log.warning("[Session: %s] ownership verify request failed: %s", session_id, exc)
        return False


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
        claims = _verify_jwt(token)
        member_id: str = claims.get("sub", "")
    except JWTError:
        await websocket.accept()
        await websocket.close(code=1008)
        slog.warning("WS connection rejected: invalid or missing JWT")
        return

    # ── 세션 소유권 검증 ────────────────────────────────────────────────────
    # 재연결 포함 모든 경로에서 Spring 내부 API로 소유권 및 세션 진행 상태 검증
    if not await _verify_session_ownership(session_id, member_id):
        await websocket.accept()
        await websocket.close(code=1008)
        slog.warning("WS connection rejected: session ownership mismatch memberId=%s", member_id)
        return

    await websocket.accept()

    # ── 중복 연결 처리 ───────────────────────────────────────────────────────
    await _close_existing(session_id, slog)

    # 기존 컨텍스트에서 seq·buffer 계승 (재연결 시 sequenceNumber 연속성 보장)
    prev = _sessions.get(session_id)
    ctx = _SessionContext(
        ws=websocket,
        member_id=member_id,
        seq=prev.seq if prev else 0,
        msg_buffer=prev.msg_buffer if prev else [],
    )
    _sessions[session_id] = ctx

    slog.info("WS connected: lastReceivedSeq=%s", lastReceivedSequenceNumber)

    # ── WS 연결 전 도착한 LLM trigger가 있으면 지금 실행 ────────────────────
    if session_id in _pending_llm and lastReceivedSequenceNumber is None and prev is None:
        pending_llm = _pending_llm.pop(session_id)
        if pending_llm.get("sessionType"):
            ctx.session_type = pending_llm["sessionType"]
        if pending_llm.get("interviewType"):
            ctx.interview_type = pending_llm["interviewType"]
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
        # 새 연결로 교체된 경우엔 타이머를 걸지 않음
        if _sessions.get(session_id) is ctx:
            # 소켓은 끊겼지만 seq·buffer는 재연결 윈도우 동안 보존
            asyncio.create_task(_expire_session(session_id, ctx))
            slog.info("holding buffer for %ds reconnect window", _RECONNECT_WINDOW_SECONDS)


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
        "audioChunk": None if is_final else audio_data,
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
