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
    member_id: UUID | str | None
    admin_id: int | None
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
    admin_id: int | None = None,
    usage: Any | None = None,
    session_id: UUID | str | None = None,
    input_tokens: int | None = None,
    output_tokens: int | None = None,
) -> bool:
    """Record AI usage without affecting the caller's AI workflow.

    Explicit input_tokens/output_tokens take precedence over values extracted from usage.
    """
    payload = _build_payload(
        member_id=member_id,
        admin_id=admin_id,
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
    headers = {"X-Internal-Secret": settings.ai_metrics_internal_secret}

    try:
        async with httpx.AsyncClient(timeout=settings.ai_usage_log_timeout_seconds) as client:
            response = await client.post(
                url,
                headers=headers,
                json=_to_request_body(payload),
            )
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        error_code, validation_fields = _extract_error_context(exc.response)
        logger.warning(
            "[AI Usage] usage log record rejected: featureType=%s modelName=%s statusCode=%s errorCode=%s validationFields=%s",
            payload.feature_type,
            payload.model_name,
            exc.response.status_code,
            error_code,
            validation_fields,
        )
        return False
    except Exception as exc:
        logger.warning(
            "[AI Usage] usage log record failed: featureType=%s modelName=%s reason=%s",
            payload.feature_type,
            payload.model_name,
            exc,
        )
        return False

    return True


def _extract_error_context(response: httpx.Response) -> tuple[str | None, list[str]]:
    """Keep diagnostics useful without logging the request body or error values."""
    try:
        body = response.json()
    except ValueError:
        return None, []
    if not isinstance(body, dict):
        return None, []

    error_code = body.get("code") or body.get("errorCode")
    normalized_error_code = str(error_code) if error_code is not None else None
    detail = body.get("detail")
    validation_fields: list[str] = []
    if isinstance(detail, list):
        if normalized_error_code is None:
            normalized_error_code = "VALIDATION_ERROR"
        for item in detail:
            if not isinstance(item, dict):
                continue
            location = item.get("loc")
            if not isinstance(location, (list, tuple)):
                continue
            field = ".".join(str(part) for part in location if part != "body")
            if field and field not in validation_fields:
                validation_fields.append(field)
    elif isinstance(detail, dict):
        field = detail.get("field")
        if isinstance(field, str) and field:
            validation_fields.append(field)

    return normalized_error_code, validation_fields


def _build_payload(
    *,
    member_id: UUID | str | None,
    admin_id: int | None,
    model_name: str | None,
    feature_type: str,
    usage: Any | None,
    session_id: UUID | str | None,
    input_tokens: int | None,
    output_tokens: int | None,
) -> AiUsageLogPayload | None:
    normalized_model_name = model_name.strip() if model_name else ""
    normalized_member_id = _normalize_optional_identifier(member_id)
    normalized_session_id = _normalize_optional_identifier(session_id)
    has_member_id = normalized_member_id is not None
    has_admin_id = admin_id is not None
    if has_member_id == has_admin_id or not normalized_model_name:
        logger.warning(
            "[AI Usage] usage log skipped: actorId or modelName missing featureType=%s",
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
        member_id=normalized_member_id,
        admin_id=admin_id,
        session_id=normalized_session_id,
        model_name=normalized_model_name,
        feature_type=feature_type,
        input_tokens=resolved_input_tokens,
        output_tokens=resolved_output_tokens,
    )


def _normalize_optional_identifier(value: UUID | str | None) -> UUID | str | None:
    if isinstance(value, str):
        normalized = value.strip()
        return normalized or None
    return value


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
        "modelName": payload.model_name,
        "featureType": payload.feature_type,
        "inputTokens": payload.input_tokens,
        "outputTokens": payload.output_tokens,
        "cost": str(payload.cost),
    }
    if payload.member_id is not None:
        body["memberId"] = str(payload.member_id)
    if payload.admin_id is not None:
        body["adminId"] = payload.admin_id
    if payload.session_id is not None:
        body["sessionId"] = str(payload.session_id)
    return body
