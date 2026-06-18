from functools import lru_cache
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Sequence

from openai import APIError, APITimeoutError, AsyncOpenAI, RateLimitError

from admin.ai_metrics.config.settings import (
    AiMetricsSettings,
    get_ai_metrics_settings,
)
from admin.ai_metrics.exception import AiMetricsErrorCode, AiMetricsException
from admin.ai_metrics.repository.ai_model_repository import AiModelRecord


@dataclass(frozen=True)
class AiMetricsModelExecutionContext:
    ai_model_id: int
    provider: str
    model_name: str
    input_token_price: Decimal
    output_token_price: Decimal


class AiMetricsOpenAIClient:
    def __init__(self, settings: AiMetricsSettings) -> None:
        self._settings = settings
        self._client = AsyncOpenAI(api_key=settings.openai_api_key)

    @property
    def client(self) -> AsyncOpenAI:
        return self._client

    @property
    def settings(self) -> AiMetricsSettings:
        return self._settings

    def build_execution_context(
        self,
        ai_model: AiModelRecord,
    ) -> AiMetricsModelExecutionContext:
        provider = ai_model.provider.strip().lower()
        if provider != "openai":
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.AI_MODEL_PROVIDER_NOT_SUPPORTED,
                message="Unsupported AI provider for aiMetrics.",
                detail={"provider": ai_model.provider},
            )

        return AiMetricsModelExecutionContext(
            ai_model_id=ai_model.ai_model_id,
            provider=provider,
            model_name=ai_model.model_name,
            input_token_price=ai_model.input_token_price,
            output_token_price=ai_model.output_token_price,
        )

    async def create_chat_completion(
        self,
        context: AiMetricsModelExecutionContext,
        messages: Sequence[dict[str, Any]],
        *,
        response_format: dict[str, Any] | None = None,
        timeout: float = 120.0,
        temperature: float | None = None,
    ) -> Any:
        request_payload: dict[str, Any] = {
            "model": context.model_name,
            "messages": list(messages),
            "timeout": timeout,
        }

        if response_format is not None:
            request_payload["response_format"] = response_format

        if temperature is not None:
            request_payload["temperature"] = temperature

        try:
            return await self._client.chat.completions.create(**request_payload)
        except (APITimeoutError, RateLimitError, APIError) as error:
            raise self._build_openai_exception(error) from error

    async def create_json_chat_completion(
        self,
        context: AiMetricsModelExecutionContext,
        *,
        system_prompt: str,
        user_prompt: str,
        timeout: float = 120.0,
    ) -> Any:
        return await self.create_chat_completion(
            context=context,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            timeout=timeout,
        )

    async def create_embeddings(
        self,
        inputs: Sequence[str],
        *,
        timeout: float = 120.0,
    ) -> Any:
        try:
            return await self._client.embeddings.create(
                model=self._settings.openai_embedding_model,
                input=list(inputs),
                timeout=timeout,
            )
        except (APITimeoutError, RateLimitError, APIError) as error:
            raise self._build_openai_exception(error) from error

    @staticmethod
    def _build_openai_exception(error: Exception) -> AiMetricsException:
        return AiMetricsException(
            error_code=AiMetricsErrorCode.OPENAI_API_ERROR,
            detail={
                "reason": error.__class__.__name__,
                "message": str(error),
            },
        )

    async def close(self) -> None:
        await self._client.close()


def build_ai_metrics_openai_client(
    settings: AiMetricsSettings | None = None,
) -> AiMetricsOpenAIClient:
    resolved_settings = settings or get_ai_metrics_settings()
    return AiMetricsOpenAIClient(settings=resolved_settings)


@lru_cache
def get_ai_metrics_openai_client() -> AiMetricsOpenAIClient:
    return build_ai_metrics_openai_client()
