import asyncio
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from core.config import get_settings
from core.rate_limit import is_rate_limited
from core.security import verify_internal_secret
from user.interview.pipeline import stt_pipeline
from user.interview.pipeline import llm_pipeline
from user.interview.pipeline import report_pipeline
from user.interview.prompts.interview_prompts import MAX_RAG_CONTEXT_CHARS
from core.redis import get_redis
from user.interview.store import session_store
from user.interview.websocket.interview_ws_handler import (
    get_session_meta,
    is_session_live,
    update_session_meta,
)

log = logging.getLogger(__name__)

_bg_tasks: set[asyncio.Task] = set()

_ALLOWED_AUDIO_CONTENT_TYPES = {"audio/webm", "audio/mp4", "audio/ogg"}


def _on_task_done(task: asyncio.Task) -> None:
    _bg_tasks.discard(task)
    if not task.cancelled() and (exc := task.exception()):
        log.error("background task failed: %s", exc, exc_info=exc)


router = APIRouter(
    prefix="/interview",
    tags=["interview-internal"],
    dependencies=[Depends(verify_internal_secret)],
)


# ── 요청 DTO ────────────────────────────────────────────────────────────────

class TextAnswerRequest(BaseModel):
    sessionId: str
    memberId: str
    questionOrder: int
    answerText: str
    questionText: str = ""
    sessionType: str = "TEXT"  # TEXT | VOICE
    interviewType: str | None = None   # TECHNICAL | PERSONALITY | PROJECT
    focusType: str | None = None       # FOLLOW_UP | TECHNICAL_DEPTH | DELIVERY | FLUENCY
    targetCompany: str | None = None   # 기업명 (맞춤 질문 생성용)
    documentId: str | None = None      # 서류 연결 시 Spring이 전달 — 첫 질문 RAG 대기 판단용


class RagContextRequest(BaseModel):
    sessionId: str
    memberId: str
    documentId: str
    documentFilePath: str


class ReportTriggerRequest(BaseModel):
    sessionId: str
    memberId: str
    sessionType: str = "TEXT"  # TEXT | VOICE | VIDEO


# ── 라우터 ──────────────────────────────────────────────────────────────────

@router.post("/sessions/{session_id}/trigger/voice-chunk", status_code=202)
async def trigger_voice_chunk(
    session_id: str,
    questionOrder: int = Form(...),
    chunkIndex: int = Form(...),
    isFinal: bool = Form(...),
    audioChunk: UploadFile = File(...),
    redis=Depends(get_redis),
) -> dict[str, object]:
    """
    Spring → FastAPI 음성 청크 전달 트리거.
    STT 파이프라인을 백그라운드로 실행하고 202 응답을 즉시 반환한다.
    """
    settings = get_settings()

    if questionOrder < 1:
        raise HTTPException(status_code=400, detail="questionOrder는 1 이상이어야 합니다.")
    if chunkIndex < 0:
        raise HTTPException(status_code=400, detail="chunkIndex는 0 이상이어야 합니다.")

    content_type = (audioChunk.content_type or "").split(";")[0].strip().lower()
    if content_type not in _ALLOWED_AUDIO_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail=f"허용되지 않는 audio content-type: {content_type}")

    audio_bytes = await audioChunk.read()
    if len(audio_bytes) > settings.audio_chunk_max_bytes:
        raise HTTPException(status_code=413, detail="음성 청크 크기가 허용 한도를 초과했습니다.")

    if await is_rate_limited(redis, session_id):
        log.warning("rate limit exceeded: sessionId=%s", session_id)
        raise HTTPException(status_code=429, detail="요청이 너무 많습니다. 잠시 후 다시 시도해주세요.")

    task = asyncio.create_task(
        stt_pipeline.transcribe_chunk(
            audio_bytes=audio_bytes,
            session_id=session_id,
            question_order=questionOrder,
            chunk_index=chunkIndex,
            is_final=isFinal,
        )
    )
    _bg_tasks.add(task)
    task.add_done_callback(_on_task_done)

    log.info(
        "STT pipeline triggered: sessionId=%s, chunkIndex=%d, isFinal=%s",
        session_id,
        chunkIndex,
        isFinal,
    )

    return {"accepted": True, "sessionId": session_id, "chunkIndex": chunkIndex}


@router.post("/sessions/{session_id}/trigger/text-answer", status_code=202)
async def trigger_text_answer(
    session_id: str,
    body: TextAnswerRequest,
) -> dict[str, object]:
    """
    Spring → FastAPI 텍스트 답변 저장 완료 트리거.
    LLM 파이프라인을 백그라운드로 실행하고 202 응답을 즉시 반환한다.
    """
    if body.sessionId != session_id:
        raise HTTPException(status_code=400, detail="path sessionId와 body sessionId가 일치하지 않습니다.")

    # 무음·hallucination으로 빈 답변이 제출된 경우 LLM 트리거를 건너뜀.
    # 프론트 guard가 있더라도 서버에서도 방어해 꼬리질문 오발 방지.
    if not body.answerText.strip():
        log.info(
            "LLM trigger skipped (empty answerText): sessionId=%s, questionOrder=%d",
            session_id, body.questionOrder,
        )
        return {"accepted": True, "sessionId": session_id, "questionOrder": body.questionOrder}

    # 서류 연결 면접 첫 질문: LLM 백그라운드 태스크보다 먼저 PENDING을 기록해
    # rag_status=None 을 "서류 없음"으로 오인하는 레이스 컨디션을 방지한다.
    if body.questionOrder == 0 and body.documentId is not None:
        await update_session_meta(session_id, {"rag_status": "PENDING"})

    if not is_session_live(session_id):
        # WS 연결 전 도착한 경우 — Redis pending 큐에 보관 후 WS 연결 시 flush
        redis = await get_redis()
        await session_store.save_pending_llm(redis, session_id, {
            "questionOrder": body.questionOrder,
            "answerText": body.answerText,
            "questionText": body.questionText,
            "sessionType": body.sessionType,
            "interviewType": body.interviewType,
            "focusType": body.focusType,
            "targetCompany": body.targetCompany,
        })
        log.info("LLM trigger queued (WS not yet connected): sessionId=%s", session_id)
    else:
        # WS 연결 중 — 세션 메타를 Redis에서 읽어 컨텍스트 필드 보완
        meta = await get_session_meta(session_id) or {}
        patch: dict = {}
        if not meta.get("session_type"):
            patch["session_type"] = body.sessionType
        if not meta.get("interview_type") and body.interviewType:
            patch["interview_type"] = body.interviewType
        if not meta.get("focus_type") and body.focusType:
            patch["focus_type"] = body.focusType
        if not meta.get("target_company") and body.targetCompany:
            patch["target_company"] = body.targetCompany
        if patch:
            await update_session_meta(session_id, patch)

        task = asyncio.create_task(
            llm_pipeline.generate_and_deliver_question(
                session_id=session_id,
                question_order=body.questionOrder,
                answer_text=body.answerText,
                question_text=body.questionText,
            )
        )
        _bg_tasks.add(task)
        task.add_done_callback(_on_task_done)

    log.info(
        "LLM pipeline triggered: sessionId=%s, questionOrder=%d, sessionType=%s",
        session_id,
        body.questionOrder,
        body.sessionType,
    )

    return {"accepted": True, "sessionId": session_id, "questionOrder": body.questionOrder}


@router.post("/sessions/{session_id}/rag-context")
async def register_rag_context(
    session_id: str,
    body: RagContextRequest,
) -> dict[str, object]:
    """
    Spring → FastAPI RAG 컨텍스트 등록.
    서류 텍스트를 세션 컨텍스트에 저장하고 즉시 200 응답을 반환한다.
    실패해도 세션을 중단하지 않고 일반 면접 모드로 진행한다.
    """
    if body.sessionId != session_id:
        raise HTTPException(status_code=400, detail="path sessionId와 body sessionId가 일치하지 않습니다.")

    # 인덱싱 시작 전 PENDING 상태 기록 — LLM 파이프라인이 대기 여부를 판단하는 데 사용
    await update_session_meta(session_id, {"rag_status": "PENDING"})

    task = asyncio.create_task(
        _index_rag_context(session_id, body.documentFilePath)
    )
    _bg_tasks.add(task)
    task.add_done_callback(_on_task_done)

    log.info(
        "RAG context registration triggered: sessionId=%s, documentId=%s",
        session_id,
        body.documentId,
    )

    return {"accepted": True, "sessionId": session_id}


def _resolve_safe_path(file_path: str) -> Path:
    """
    요청으로 전달된 파일 경로가 허용 디렉터리 안에 있는지 검증한다.
    Path Traversal 공격 방지용.
    """
    base = Path(get_settings().document_base_dir).resolve()
    resolved = (base / Path(file_path).name).resolve()
    if not str(resolved).startswith(str(base)):
        raise ValueError(f"허용되지 않는 파일 경로: {file_path}")
    return resolved


async def _index_rag_context(session_id: str, document_file_path: str) -> None:
    """서류 파일에서 텍스트를 추출해 세션 컨텍스트에 저장한다. 실패 시 일반 모드로 폴백."""
    try:
        safe_path = _resolve_safe_path(document_file_path)
        text = await _extract_document_text(str(safe_path))
        truncated = text[:MAX_RAG_CONTEXT_CHARS]
        await update_session_meta(session_id, {"rag_context": truncated, "rag_status": "READY"})
        log.info("[Session: %s] RAG context indexed: charLen=%d", session_id, len(truncated))
    except Exception as e:
        await update_session_meta(session_id, {"rag_status": "FAILED"})
        log.warning(
            "[Session: %s] RAG indexing failed (fallback to general mode): %s",
            session_id, e,
        )


async def _extract_document_text(file_path: str) -> str:
    """서류 파일 경로에서 텍스트를 추출한다. PDF/DOCX 지원."""
    import asyncio
    return await asyncio.to_thread(_extract_sync, file_path)


def _extract_sync(file_path: str) -> str:
    if file_path.lower().endswith(".pdf"):
        import pdfplumber
        with pdfplumber.open(file_path) as pdf:
            return "\n".join(
                page.extract_text() or ""
                for page in pdf.pages
            ).strip()
    elif file_path.lower().endswith((".docx", ".doc")):
        from docx import Document
        doc = Document(file_path)
        return "\n".join(p.text for p in doc.paragraphs).strip()
    else:
        with open(file_path, encoding="utf-8") as f:
            return f.read()


@router.post("/sessions/{session_id}/trigger/report", status_code=202)
async def trigger_report(
    session_id: str,
    body: ReportTriggerRequest,
) -> dict[str, object]:
    """
    Spring → FastAPI 리포트 생성 트리거.
    리포트 파이프라인을 백그라운드로 실행하고 202 응답을 즉시 반환한다.
    """
    if body.sessionId != session_id:
        raise HTTPException(status_code=400, detail="path sessionId와 body sessionId가 일치하지 않습니다.")

    task = asyncio.create_task(
        report_pipeline.generate_and_send_report(
            session_id=session_id,
            session_type=body.sessionType,
        )
    )
    _bg_tasks.add(task)
    task.add_done_callback(_on_task_done)

    # Redis Sorted Set TTL이 만료 처리하므로 별도 정리 불필요

    log.info(
        "report pipeline triggered: sessionId=%s, sessionType=%s",
        session_id,
        body.sessionType,
    )

    return {"accepted": True, "sessionId": session_id}
