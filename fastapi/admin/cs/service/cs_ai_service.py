import logging
from functools import lru_cache

from openai import AsyncOpenAI

from core.config import get_settings
from admin.cs.prompts.cs_prompts import (
    NOTICE_DRAFT_SYSTEM_PROMPT,
    FAQ_DRAFT_SYSTEM_PROMPT,
    INQUIRY_DRAFT_SYSTEM_PROMPT,
    build_notice_draft_user_prompt,
    build_faq_draft_user_prompt,
    build_inquiry_draft_user_prompt,
)
from admin.cs.schema.request import NoticeDraftRequest, FaqDraftRequest, InquiryDraftRequest

logger = logging.getLogger(__name__)


@lru_cache
def _get_openai_client() -> AsyncOpenAI:
    return AsyncOpenAI(api_key=get_settings().openai_api_key)


async def _call_openai(system_prompt: str, user_prompt: str) -> str:
    settings = get_settings()
    client = _get_openai_client()

    completion = await client.chat.completions.create(
        model=settings.openai_model_light,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        timeout=settings.openai_llm_timeout_seconds,
    )

    usage = completion.usage
    logger.info(
        f"[CS AI] Token usage — "
        f"input={usage.prompt_tokens} output={usage.completion_tokens} total={usage.total_tokens}"
    )

    return completion.choices[0].message.content or ""


async def generate_notice_draft(request: NoticeDraftRequest) -> str:
    logger.info(f"[CS AI] notice-draft — category={request.category}")
    return await _call_openai(
        NOTICE_DRAFT_SYSTEM_PROMPT,
        build_notice_draft_user_prompt(request.category, request.title),
    )


async def generate_faq_draft(request: FaqDraftRequest) -> str:
    logger.info("[CS AI] faq-draft")
    return await _call_openai(
        FAQ_DRAFT_SYSTEM_PROMPT,
        build_faq_draft_user_prompt(request.question),
    )


async def generate_inquiry_draft(request: InquiryDraftRequest) -> str:
    logger.info(f"[CS AI] inquiry-draft — category={request.category}")
    return await _call_openai(
        INQUIRY_DRAFT_SYSTEM_PROMPT,
        build_inquiry_draft_user_prompt(request.category, request.title, request.content),
    )
