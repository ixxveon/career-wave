import asyncio
import json
import logging
from functools import lru_cache

from openai import AsyncOpenAI

from core.config import get_settings
from core.ai_usage import record_ai_usage
from admin.report.prompts.report_prompts import (
    REPORT_ANALYSIS_SYSTEM_PROMPT,
    build_report_analysis_user_prompt,
)
from admin.report.schema.request import ReportAnalysisRequest
from admin.report.schema.response import ReportAnalysisResponse

logger = logging.getLogger(__name__)

# 관리자 신고 AI 분석 사용량 적재 feature type.
_REPORT_FEATURE_TYPE = "ADMIN_REPORT"


@lru_cache
def _get_openai_client() -> AsyncOpenAI:
    return AsyncOpenAI(api_key=get_settings().openai_api_key)


async def analyze_report(request: ReportAnalysisRequest) -> ReportAnalysisResponse:
    logger.info(
        f"[Report AI] report-analysis — targetType={request.targetType} reason={request.reason}"
    )

    settings = get_settings()
    client = _get_openai_client()

    user_prompt = build_report_analysis_user_prompt(
        request.targetType,
        request.reason,
        request.contentTitle,
        request.contentBody,
    )

    completion = await client.chat.completions.create(
        model=settings.openai_model_deep,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": REPORT_ANALYSIS_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        timeout=settings.openai_llm_timeout_seconds,
    )

    usage = completion.usage
    if usage:
        logger.info(
            f"[Report AI] Token usage — "
            f"input={usage.prompt_tokens} output={usage.completion_tokens} total={usage.total_tokens}"
        )

    # 사용량 적재 — 백그라운드로 실행하여 응답 지연을 방지하며, 파싱 전에 디스패치해 토큰 소비분이 기록되도록 한다.
    asyncio.create_task(
        record_ai_usage(
            member_id=None,
            admin_id=request.adminId,
            model_name=settings.openai_model_deep,
            feature_type=_REPORT_FEATURE_TYPE,
            usage=usage,
        )
    )

    raw = completion.choices[0].message.content or "{}"
    try:
        result = json.loads(raw)
        return ReportAnalysisResponse(**result)
    except (json.JSONDecodeError, KeyError) as e:
        logger.error(f"[Report AI] LLM 응답 파싱 실패: {e}")
        raise
