import logging

from fastapi import APIRouter, Depends

from core.security import verify_internal_secret

log = logging.getLogger(__name__)

router = APIRouter(
    prefix="/interview",
    tags=["interview-internal"],
    dependencies=[Depends(verify_internal_secret)],
)

# Phase 3: POST /sessions/{session_id}/trigger/voice-chunk  (STT 파이프라인 트리거)
# Phase 4: POST /sessions/{session_id}/trigger/text-answer  (LLM 파이프라인 트리거)
# Phase 4: POST /sessions/{session_id}/rag-context          (RAG 컨텍스트 등록)
# Phase 5: POST /sessions/{session_id}/trigger/report       (리포트 생성 트리거)
