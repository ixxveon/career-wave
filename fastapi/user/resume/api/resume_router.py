import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.responses import JSONResponse

from core.security import verify_internal_secret
from user.resume.schema.request import AnalyzeDocumentRequest
from user.resume.schema.response import TriggerAcceptedResponse
from user.resume.service.webhook_client import send_webhook

logger = logging.getLogger(__name__)

router = APIRouter(tags=["resume"])

# 현재 처리 중인 documentId 추적 (단일 프로세스 MVP 용도)
_processing: set[str] = set()

_responses = {
    202: {
        "description": "분석 요청 수락 — 백그라운드 분석 시작",
        "content": {
            "application/json": {
                "example": {
                    "accepted": True,
                    "documentId": "550e8400-e29b-41d4-a716-446655440000",
                }
            }
        },
    },
    403: {
        "description": "X-Internal-Secret 헤더 누락 또는 불일치",
        "content": {
            "application/json": {
                "example": {"detail": "Invalid internal secret"}
            }
        },
    },
    409: {
        "description": "동일 documentId가 이미 처리 중",
        "content": {
            "application/json": {
                "example": {
                    "detail": {
                        "success": False,
                        "errorCode": "DOCUMENT_ALREADY_PROCESSING",
                        "message": "이미 처리 중인 documentId입니다.",
                        "detail": {"documentId": "550e8400-e29b-41d4-a716-446655440000"},
                    }
                }
            }
        },
    },
    422: {
        "description": "요청 바디 유효성 검증 실패 (fileUrl 누락, content 범위 초과 등)",
        "content": {
            "application/json": {
                "example": {
                    "detail": [
                        {
                            "type": "value_error",
                            "loc": [],
                            "msg": "fileUrl is required for RESUME type",
                        }
                    ]
                }
            }
        },
    },
}


@router.post(
    "/resume/analyze",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=TriggerAcceptedResponse,
    responses=_responses,
    summary="서류 분석 트리거",
    description=(
        "Spring Boot로부터 서류 분석 요청을 수신합니다.\n\n"
        "- `fileType: RESUME` — S3 파일 URL 기반 이력서 분석\n"
        "- `fileType: COVER_LETTER` — 직접 입력 자기소개서 분석\n\n"
        "요청 즉시 `202 Accepted`를 반환하고 분석은 백그라운드로 진행됩니다.\n"
        "진행 상태는 Spring Boot Webhook 콜백(`PENDING → ANALYZING → COMPLETED/FAILED`)으로 전달됩니다."
    ),
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
    # Phase 4에서 resume_service.analyze_document(request)로 교체
    document_id = request.document_id
    try:
        await send_webhook(document_id, {"status": "PENDING", "progress": 0})
        await send_webhook(document_id, {"status": "ANALYZING", "progress": 50})
        await send_webhook(
            document_id,
            {
                "status": "COMPLETED",
                "progress": 100,
                "scoreJobFitness": 80,
                "scoreTechStack": 75,
                "scoreQuantified": 70,
                "scoreLogical": 85,
                "scoreTotal": 78,
                "overallReview": "[stub] Phase 4 구현 전 mock 응답입니다.",
                "feedbackText": "[]",
                "errorMessage": None,
            },
        )
        logger.info(f"[{document_id}] Stub analysis completed — mock COMPLETED webhook sent")
    except Exception:
        logger.error(f"[{document_id}] Stub webhook delivery failed", exc_info=True)
        await send_webhook(
            document_id,
            {
                "status": "FAILED",
                "progress": 0,
                "scoreJobFitness": None,
                "scoreTechStack": None,
                "scoreQuantified": None,
                "scoreLogical": None,
                "scoreTotal": None,
                "overallReview": None,
                "feedbackText": None,
                "errorMessage": "분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
            },
        )
    finally:
        _processing.discard(document_id)
