import logging

from fastapi import APIRouter, Depends, HTTPException, status

from core.security import verify_internal_secret
from admin.cs.schema.request import NoticeDraftRequest, FaqDraftRequest, InquiryDraftRequest
from admin.cs.schema.response import CsAiDraftResponse
from admin.cs.service import generate_notice_draft, generate_faq_draft, generate_inquiry_draft

logger = logging.getLogger(__name__)

router = APIRouter(tags=["admin-cs-ai"])

_responses = {
    200: {
        "description": "초안 생성 성공",
        "content": {
            "application/json": {
                "example": {"draft": "생성된 초안 내용입니다."}
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
    "/notice-draft",
    response_model=CsAiDraftResponse,
    responses=_responses,
    summary="공지사항 초안 생성",
    description="카테고리와 제목을 기반으로 공지사항 본문 초안을 생성합니다.",
    dependencies=[Depends(verify_internal_secret)],
)
async def notice_draft_handler(request: NoticeDraftRequest) -> CsAiDraftResponse:
    try:
        draft = await generate_notice_draft(request)
        return CsAiDraftResponse(draft=draft)
    except Exception:
        logger.error("[CS AI] notice-draft 생성 실패", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "success": False,
                "errorCode": "AI_SERVER_UNAVAILABLE",
                "message": "AI 서버와 통신 중 오류가 발생했습니다.",
                "detail": {},
            },
        )


@router.post(
    "/faq-draft",
    response_model=CsAiDraftResponse,
    responses=_responses,
    summary="FAQ 답변 초안 생성",
    description="질문을 기반으로 FAQ 답변 초안을 생성합니다.",
    dependencies=[Depends(verify_internal_secret)],
)
async def faq_draft_handler(request: FaqDraftRequest) -> CsAiDraftResponse:
    try:
        draft = await generate_faq_draft(request)
        return CsAiDraftResponse(draft=draft)
    except Exception:
        logger.error("[CS AI] faq-draft 생성 실패", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "success": False,
                "errorCode": "AI_SERVER_UNAVAILABLE",
                "message": "AI 서버와 통신 중 오류가 발생했습니다.",
                "detail": {},
            },
        )


@router.post(
    "/inquiry-draft",
    response_model=CsAiDraftResponse,
    responses=_responses,
    summary="문의 답변 초안 생성",
    description="문의 카테고리, 제목, 내용을 기반으로 답변 초안을 생성합니다.",
    dependencies=[Depends(verify_internal_secret)],
)
async def inquiry_draft_handler(request: InquiryDraftRequest) -> CsAiDraftResponse:
    try:
        draft = await generate_inquiry_draft(request)
        return CsAiDraftResponse(draft=draft)
    except Exception:
        logger.error("[CS AI] inquiry-draft 생성 실패", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "success": False,
                "errorCode": "AI_SERVER_UNAVAILABLE",
                "message": "AI 서버와 통신 중 오류가 발생했습니다.",
                "detail": {},
            },
        )
