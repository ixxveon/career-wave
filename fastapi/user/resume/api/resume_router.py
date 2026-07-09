import logging
from uuid import uuid4

import redis.asyncio as aioredis
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from core.redis import get_redis
from core.security import verify_internal_secret
from user.resume.schema.request import AnalyzeDocumentRequest
from user.resume.schema.response import TriggerAcceptedResponse
from user.resume.service import resume_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["resume"])

_PROCESSING_KEY_PREFIX = "resume:processing:"
_PROCESSING_TTL = 600  # OpenAI 타임아웃(120s) + 큐 대기 여유분

# 보유 토큰이 일치할 때만 키를 삭제하는 원자적 Lua 스크립트
_RELEASE_SCRIPT = """
if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
else
    return 0
end
"""

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
    redis: aioredis.Redis = Depends(get_redis),
) -> TriggerAcceptedResponse:
    document_id = str(request.document_id)
    lock_key = f"{_PROCESSING_KEY_PREFIX}{document_id}"
    lock_token = uuid4().hex

    acquired = await redis.set(lock_key, lock_token, nx=True, ex=_PROCESSING_TTL)
    if not acquired:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "success": False,
                "errorCode": "DOCUMENT_ALREADY_PROCESSING",
                "message": "이미 처리 중인 documentId입니다.",
                "detail": {"documentId": document_id},
            },
        )

    background_tasks.add_task(_run_analysis, request, redis, lock_key, lock_token)
    logger.info(f"[{document_id}] Analysis accepted — queued as background task")

    return TriggerAcceptedResponse(documentId=document_id)


async def _run_analysis(
    request: AnalyzeDocumentRequest,
    redis: aioredis.Redis,
    lock_key: str,
    lock_token: str,
) -> None:
    document_id = str(request.document_id)
    try:
        await resume_service.analyze_document(request)
    finally:
        await redis.eval(_RELEASE_SCRIPT, 1, lock_key, lock_token)
        logger.debug(f"[{document_id}] Processing lock released")
