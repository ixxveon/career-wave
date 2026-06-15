import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from core.security import verify_internal_secret
from user.resume.schema.request import AnalyzeDocumentRequest
from user.resume.schema.response import TriggerAcceptedResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["resume"])

# 현재 처리 중인 documentId 추적 (단일 프로세스 MVP 용도)
_processing: set[str] = set()


@router.post(
    "/resume/analyze",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=TriggerAcceptedResponse,
    dependencies=[Depends(verify_internal_secret)],
)
async def analyze_resume(
    request: AnalyzeDocumentRequest,
    background_tasks: BackgroundTasks,
) -> TriggerAcceptedResponse:
    document_id = request.document_id

    if document_id in _processing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "success": False,
                "errorCode": "DOCUMENT_ALREADY_PROCESSING",
                "message": "이미 처리 중인 documentId입니다.",
                "detail": {"documentId": document_id},
            },
        )

    _processing.add(document_id)
    background_tasks.add_task(_run_analysis, request)
    logger.info(f"[{document_id}] Analysis accepted — queued as background task")

    return TriggerAcceptedResponse(documentId=document_id)


async def _run_analysis(request: AnalyzeDocumentRequest) -> None:
    """분석 오케스트레이션은 Phase 4에서 resume_service.py로 위임한다."""
    document_id = request.document_id
    try:
        pass
    finally:
        _processing.discard(document_id)
