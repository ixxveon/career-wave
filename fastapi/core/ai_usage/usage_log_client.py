import logging
from dataclasses import dataclass
from decimal import Decimal
from typing import Any
from uuid import UUID

import httpx

from core.config import get_settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class AiUsageLogPayload:
    member_id: UUID | str
    model_name: str
    feature_type: str
    input_tokens: int
    output_tokens: int
    session_id: UUID | str | None = None
    cost: Decimal = Decimal("0")


async def record_ai_usage(
    *,
    member_id: UUID | str | None,
    model_name: str | None,
    feature_type: str,
    usage: Any | None = None,
    session_id: UUID | str | None = None,
    input_tokens: int | None = None,
    output_tokens: int | None = None,
) -> bool:
    """Record AI usage without affecting the caller's AI workflow."""
    payload = _build_payload(
        member_id=member_id,
        model_name=model_name,
        feature_type=feature_type,
        usage=usage,
        session_id=session_id,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
    )
    if payload is None:
        return False

    settings = get_settings()
    url = f"{settings.ai_metrics_internal_base_url.rstrip('/')}/usage/log"
    headers = {"X-Internal-Secret": settings.webhook_secret}

    try:
        async with httpx.AsyncClient(timeout=settings.ai_usage_log_timeout_seconds) as client:
            response = await client.post(
                url,
                headers=headers,
                json=_to_request_body(payload),
            )
            response.raise_for_status()
    except Exception as exc:
        logger.warning(
            "[AI Usage] usage log record failed: featureType=%s modelName=%s reason=%s",
            payload.feature_type,
            payload.model_name,
            exc,
        )
        return False

    return True


def _build_payload(
    *,
    member_id: UUID | str | None,
    model_name: str | None,
    feature_type: str,
    usage: Any | None,
    session_id: UUID | str | None,
    input_tokens: int | None,
    output_tokens: int | None,
) -> AiUsageLogPayload | None:
    normalized_model_name = model_name.strip() if model_name else ""
    if member_id is None or not normalized_model_name:
        logger.warning(
            "[AI Usage] usage log skipped: memberId or modelName missing featureType=%s",
            feature_type,
        )
        return None

    resolved_input_tokens = _resolve_input_tokens(usage, input_tokens)
    resolved_output_tokens = _resolve_output_tokens(usage, output_tokens)
    if resolved_input_tokens is None or resolved_output_tokens is None:
        logger.warning(
            "[AI Usage] usage log skipped: token usage missing featureType=%s modelName=%s",
            feature_type,
            normalized_model_name,
        )
        return None

    return AiUsageLogPayload(
        member_id=member_id,
        session_id=session_id,
        model_name=normalized_model_name,
        feature_type=feature_type,
        input_tokens=resolved_input_tokens,
        output_tokens=resolved_output_tokens,
    )


def _resolve_input_tokens(usage: Any | None, fallback: int | None) -> int | None:
    if fallback is not None:
        return fallback
    if usage is None:
        return None
    return _get_int_attr(usage, "prompt_tokens", "input_tokens")


def _resolve_output_tokens(usage: Any | None, fallback: int | None) -> int | None:
    if fallback is not None:
        return fallback
    if usage is None:
        return None
    return _get_int_attr(usage, "completion_tokens", "output_tokens")


def _get_int_attr(value: Any, *names: str) -> int | None:
    for name in names:
        candidate = getattr(value, name, None)
        if candidate is None and isinstance(value, dict):
            candidate = value.get(name)
        if candidate is None:
            continue
        try:
            return int(candidate)
        except (TypeError, ValueError):
            return None
    return None


def _to_request_body(payload: AiUsageLogPayload) -> dict[str, str | int]:
    body: dict[str, str | int] = {
        "memberId": str(payload.member_id),
        "modelName": payload.model_name,
        "featureType": payload.feature_type,
        "inputTokens": payload.input_tokens,
        "outputTokens": payload.output_tokens,
        "cost": str(payload.cost),
    }
    if payload.session_id is not None:
        body["sessionId"] = str(payload.session_id)
    return body
