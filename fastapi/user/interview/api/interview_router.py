import asyncio
import logging

from fastapi import APIRouter, Depends, File, Form, UploadFile

from core.security import verify_internal_secret
from user.interview.pipeline import stt_pipeline

log = logging.getLogger(__name__)

_bg_tasks: set[asyncio.Task] = set()

router = APIRouter(
    prefix="/interview",
    tags=["interview-internal"],
    dependencies=[Depends(verify_internal_secret)],
)


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


# Phase 4: POST /sessions/{session_id}/trigger/text-answer  (LLM 파이프라인 트리거)
# Phase 4: POST /sessions/{session_id}/rag-context          (RAG 컨텍스트 등록)
# Phase 5: POST /sessions/{session_id}/trigger/report       (리포트 생성 트리거)
