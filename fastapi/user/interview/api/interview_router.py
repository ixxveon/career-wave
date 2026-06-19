import asyncio
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, UploadFile
from pydantic import BaseModel

from core.config import get_settings
from core.security import verify_internal_secret
from user.interview.pipeline import stt_pipeline
from user.interview.pipeline import llm_pipeline
from user.interview.prompts.interview_prompts import MAX_RAG_CONTEXT_CHARS
from user.interview.websocket.interview_ws_handler import _sessions

log = logging.getLogger(__name__)

_bg_tasks: set[asyncio.Task] = set()

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
    interviewType: str | None = None  # TECHNICAL | PERSONALITY | PROJECT


class RagContextRequest(BaseModel):
    sessionId: str
    memberId: str
    documentId: str
    documentFilePath: str


# ── 라우터 ──────────────────────────────────────────────────────────────────

@router.post("/sessions/{session_id}/trigger/voice-chunk", status_code=202)
async def trigger_voice_chunk(
    session_id: str,
    question_order: int = Form(...),
    chunk_index: int = Form(...),
    is_final: bool = Form(...),
    audio_chunk: UploadFile = File(...),
) -> dict[str, object]:
    """
    Spring → FastAPI 음성 청크 전달 트리거.
    STT 파이프라인을 백그라운드로 실행하고 202 응답을 즉시 반환한다.
    """
    audio_bytes = await audio_chunk.read()

    task = asyncio.create_task(
        stt_pipeline.transcribe_chunk(
            audio_bytes=audio_bytes,
            session_id=session_id,
            question_order=question_order,
            chunk_index=chunk_index,
            is_final=is_final,
        )
    )
    _bg_tasks.add(task)
    task.add_done_callback(_bg_tasks.discard)

    log.info(
        "STT pipeline triggered: sessionId=%s, chunkIndex=%d, isFinal=%s",
        session_id,
        chunk_index,
        is_final,
    )

    return {"accepted": True, "sessionId": session_id, "chunkIndex": chunk_index}


@router.post("/sessions/{session_id}/trigger/text-answer", status_code=202)
async def trigger_text_answer(
    session_id: str,
    body: TextAnswerRequest,
) -> dict[str, object]:
    """
    Spring → FastAPI 텍스트 답변 저장 완료 트리거.
    LLM 파이프라인을 백그라운드로 실행하고 202 응답을 즉시 반환한다.
    """
    ctx = _sessions.get(session_id)
    if ctx is not None:
        if ctx.session_type is None:
            ctx.session_type = body.sessionType
        if ctx.interview_type is None and body.interviewType:
            ctx.interview_type = body.interviewType

    task = asyncio.create_task(
        llm_pipeline.generate_and_deliver_question(
            session_id=session_id,
            question_order=body.questionOrder,
            answer_text=body.answerText,
            question_text=body.questionText,
        )
    )
    _bg_tasks.add(task)
    task.add_done_callback(_bg_tasks.discard)

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
    task = asyncio.create_task(
        _index_rag_context(session_id, body.documentFilePath)
    )
    _bg_tasks.add(task)
    task.add_done_callback(_bg_tasks.discard)

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
        ctx = _sessions.get(session_id)
        if ctx is not None:
            ctx.rag_context = truncated
            log.info("[Session: %s] RAG context indexed: charLen=%d", session_id, len(truncated))
        else:
            log.warning("[Session: %s] RAG index skipped: no active session", session_id)
    except Exception as e:
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


# Phase 5: POST /sessions/{session_id}/trigger/report  (리포트 생성 트리거)
