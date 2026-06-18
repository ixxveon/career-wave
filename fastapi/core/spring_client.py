import asyncio
import logging
from typing import Any

import httpx
from pydantic import BaseModel

from core.config import get_settings

log = logging.getLogger(__name__)

_CALLBACK_TIMEOUT = 10.0
# 지수 백오프: 1차 즉시, 2차 1초 후, 3차 3초 후 (fastapi-schema.md §3.1 재시도 정책)
_BACKOFF_DELAYS = (0, 1, 3)


class QuestionPayload(BaseModel):
    sessionId: str
    questionOrder: int
    questionText: str
    questionType: str  # FOLLOW_UP | PRESSURE | NEXT


class FeedbackPayload(BaseModel):
    questionOrder: int
    questionText: str
    answerText: str
    relevanceScore: int | None = None
    depthScore: int | None = None
    deliveryScore: int | None = None
    fluencyScore: int | None = None
    voiceQualityRatio: float | None = None
    aiFeedback: str | None = None


class ReportCallbackPayload(BaseModel):
    sessionId: str
    totalScore: int | None = None
    feedbacks: list[FeedbackPayload]


async def send_question_to_spring(session_id: str, payload: QuestionPayload) -> None:
    """LLM이 생성한 질문을 Spring에 전달한다. Spring이 STOMP로 클라이언트에 릴레이한다."""
    settings = get_settings()
    url = f"{settings.spring_base_url}/internal/api/v1/interview/callback/{session_id}/question"
    headers = {
        "Content-Type": "application/json",
        "X-Internal-Secret": settings.webhook_secret,
    }
    body = payload.model_dump_json()

    for attempt, delay in enumerate(_BACKOFF_DELAYS):
        if delay:
            await asyncio.sleep(delay)
        try:
            async with httpx.AsyncClient(timeout=_CALLBACK_TIMEOUT) as client:
                resp = await client.post(url, content=body, headers=headers)
                resp.raise_for_status()
                log.info("question sent to spring: sessionId=%s, order=%d, attempt=%d",
                         session_id, payload.questionOrder, attempt + 1)
                return
        except httpx.HTTPStatusError as e:
            log.warning(
                "question callback HTTP error: sessionId=%s, attempt=%d, status=%d",
                session_id, attempt + 1, e.response.status_code,
            )
        except httpx.RequestError as e:
            log.warning(
                "question callback request error: sessionId=%s, attempt=%d, error=%s",
                session_id, attempt + 1, e,
            )

    log.error("question callback failed after all retries: sessionId=%s", session_id)


async def send_report_callback(session_id: str, payload: ReportCallbackPayload) -> None:
    settings = get_settings()
    url = f"{settings.spring_base_url}/internal/api/v1/interview/callback/{session_id}/report"
    headers = {
        "Content-Type": "application/json",
        "X-Internal-Secret": settings.webhook_secret,
    }
    body = payload.model_dump_json()

    for attempt, delay in enumerate(_BACKOFF_DELAYS):
        if delay:
            await asyncio.sleep(delay)
        try:
            async with httpx.AsyncClient(timeout=_CALLBACK_TIMEOUT) as client:
                resp = await client.post(url, content=body, headers=headers)
                resp.raise_for_status()
                data: dict[str, Any] = resp.json()
                if data.get("duplicated"):
                    log.info("report callback duplicated (idempotent skip): sessionId=%s", session_id)
                else:
                    log.info("report callback sent: sessionId=%s, attempt=%d", session_id, attempt + 1)
                return
        except httpx.HTTPStatusError as e:
            log.warning(
                "report callback HTTP error: sessionId=%s, attempt=%d, status=%d",
                session_id, attempt + 1, e.response.status_code,
            )
        except httpx.RequestError as e:
            log.warning(
                "report callback request error: sessionId=%s, attempt=%d, error=%s",
                session_id, attempt + 1, e,
            )

    log.error("report callback failed after all retries: sessionId=%s", session_id)
