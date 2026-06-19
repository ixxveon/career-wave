import logging

from fastapi import APIRouter, Depends, HTTPException, status

from core.security import verify_internal_secret
from admin.report.schema.request import ReportAnalysisRequest
from admin.report.schema.response import ReportAnalysisResponse
from admin.report.service.report_ai_service import analyze_report

logger = logging.getLogger(__name__)

router = APIRouter(tags=["admin-report-ai"])

_responses = {
    200: {
        "description": "신고 AI 분석 성공",
        "content": {
            "application/json": {
                "example": {
                    "severity": "높음",
                    "category": "ABUSE",
                    "suggestion": "명백한 욕설이 포함되어 있습니다. 즉시 블라인드 처리를 권고합니다.",
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
    503: {
        "description": "OpenAI 타임아웃 또는 API 오류",
        "content": {
            "application/json": {
                "example": {
                    "success": False,
                    "errorCode": "AI_SERVER_UNAVAILABLE",
                    "message": "AI 서버와 통신 중 오류가 발생했습니다.",
                    "detail": {},
                }
            }
        },
    },
}


@router.post(
    "/report-analysis",
    response_model=ReportAnalysisResponse,
    responses=_responses,
    summary="신고 콘텐츠 AI 분석",
    description=(
        "신고 정보를 기반으로 심각도·카테고리·처리 제안을 분석합니다.\n\n"
        "- Spring Boot의 신고 상세 조회 시 `ai_suggestion`이 null일 때 호출됩니다.\n"
        "- Spring Boot가 분석 결과를 `reports.ai_suggestion`에 저장합니다.\n"
        "- FastAPI 장애 시 Spring Boot는 비크리티컬 처리하여 신고 상세 조회를 정상 반환합니다."
    ),
    dependencies=[Depends(verify_internal_secret)],
)
async def report_analysis(request: ReportAnalysisRequest) -> ReportAnalysisResponse:
    try:
        return await analyze_report(request)
    except Exception as exc:
        logger.error("[Report AI] report-analysis 실패", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "success": False,
                "errorCode": "AI_SERVER_UNAVAILABLE",
                "message": "AI 서버와 통신 중 오류가 발생했습니다.",
                "detail": {},
            },
        ) from exc
