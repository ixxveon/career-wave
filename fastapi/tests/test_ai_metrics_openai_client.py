from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from admin.ai_metrics.client.openai_client import AiMetricsOpenAIClient
from admin.ai_metrics.config.settings import AiMetricsSettings
from admin.ai_metrics.repository.ai_model_repository import AiModelRecord


def _make_settings() -> AiMetricsSettings:
    return AiMetricsSettings(
        OPENAI_API_KEY="sk-test",
        OPENAI_EMBEDDING_MODEL="text-embedding-3-small",
    )


def _make_ai_model_record(provider: str = " OPENAI ") -> AiModelRecord:
    return AiModelRecord(
        ai_model_id=7,
        model_name="gpt-4.1-mini",
        display_type="GPT-4.1 Mini",
        provider=provider,
        input_token_price=Decimal("0.400000"),
        output_token_price=Decimal("1.600000"),
        is_enabled=True,
        created_at=datetime(2026, 6, 1, tzinfo=timezone.utc),
        updated_at=datetime(2026, 6, 1, tzinfo=timezone.utc),
    )


def test_openai_client_builds_execution_context_from_model():
    with patch("admin.ai_metrics.client.openai_client.AsyncOpenAI", return_value=MagicMock()):
        client = AiMetricsOpenAIClient(settings=_make_settings())

    context = client.build_execution_context(_make_ai_model_record())

    assert context.ai_model_id == 7
    assert context.provider == "openai"
    assert context.model_name == "gpt-4.1-mini"
    assert context.input_token_price == Decimal("0.400000")
    assert context.output_token_price == Decimal("1.600000")
    assert context.pricing_unit == "PER_MILLION_TOKENS"


@pytest.mark.asyncio
async def test_openai_client_delegates_json_chat_completion_request():
    openai_client_mock = MagicMock()
    openai_client_mock.chat.completions.create = AsyncMock(return_value={"id": "chatcmpl_test"})

    with patch(
        "admin.ai_metrics.client.openai_client.AsyncOpenAI",
        return_value=openai_client_mock,
    ):
        client = AiMetricsOpenAIClient(settings=_make_settings())

    context = client.build_execution_context(_make_ai_model_record(provider="OPENAI"))

    response = await client.create_json_chat_completion(
        context=context,
        system_prompt="system prompt",
        user_prompt="user prompt",
        timeout=45.0,
    )

    assert response == {"id": "chatcmpl_test"}
    openai_client_mock.chat.completions.create.assert_awaited_once_with(
        model="gpt-4.1-mini",
        messages=[
            {"role": "system", "content": "system prompt"},
            {"role": "user", "content": "user prompt"},
        ],
        response_format={"type": "json_object"},
        timeout=45.0,
    )
