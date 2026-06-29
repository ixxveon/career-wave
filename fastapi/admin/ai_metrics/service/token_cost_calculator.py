from decimal import Decimal
from typing import Any

from admin.ai_metrics.client import AiMetricsModelExecutionContext

from admin.ai_metrics.exception import AiMetricsErrorCode, AiMetricsException


class TokenCostCalculator:
    @staticmethod
    def _is_non_negative_int(value: Any) -> bool:
        return isinstance(value, int) and not isinstance(value, bool) and value >= 0

    def calculate_input_tokens(
        self,
        usage_source: Any | None = None,
        *,
        fallback_input_tokens: int | None = None,
    ) -> int:
        usage = getattr(usage_source, "usage", usage_source)
        prompt_tokens = getattr(usage, "prompt_tokens", None)

        if self._is_non_negative_int(prompt_tokens):
            return prompt_tokens

        if self._is_non_negative_int(fallback_input_tokens):
            return fallback_input_tokens

        raise AiMetricsException(
            error_code=AiMetricsErrorCode.TOKEN_CALCULATION_FAILED,
            message="Input token calculation failed.",
            detail={"field": "inputTokens"},
        )

    def calculate_output_tokens(
        self,
        usage_source: Any | None = None,
        *,
        fallback_output_tokens: int | None = None,
    ) -> int:
        usage = getattr(usage_source, "usage", usage_source)
        completion_tokens = getattr(usage, "completion_tokens", None)

        if self._is_non_negative_int(completion_tokens):
            return completion_tokens

        if self._is_non_negative_int(fallback_output_tokens):
            return fallback_output_tokens

        raise AiMetricsException(
            error_code=AiMetricsErrorCode.TOKEN_CALCULATION_FAILED,
            message="Output token calculation failed.",
            detail={"field": "outputTokens"},
        )

    def calculate_cost(
        self,
        context: AiMetricsModelExecutionContext,
        *,
        input_tokens: int,
        output_tokens: int,
    ) -> Decimal:
        if not self._is_non_negative_int(input_tokens) or not self._is_non_negative_int(output_tokens):
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.TOKEN_CALCULATION_FAILED,
                message="Cost calculation failed.",
                detail={
                    "inputTokens": input_tokens,
                    "outputTokens": output_tokens,
                },
            )

        input_cost = context.input_token_price * Decimal(input_tokens)
        output_cost = context.output_token_price * Decimal(output_tokens)
        return input_cost + output_cost

    def validate_token_cost_result(
        self,
        *,
        input_tokens: int,
        output_tokens: int,
        cost: Decimal,
    ) -> None:
        if not self._is_non_negative_int(input_tokens):
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.TOKEN_CALCULATION_FAILED,
                message="Input token validation failed.",
                detail={"field": "inputTokens", "value": input_tokens},
            )

        if not self._is_non_negative_int(output_tokens):
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.TOKEN_CALCULATION_FAILED,
                message="Output token validation failed.",
                detail={"field": "outputTokens", "value": output_tokens},
            )

        if not isinstance(cost, Decimal) or cost < Decimal("0"):
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.TOKEN_CALCULATION_FAILED,
                message="Cost validation failed.",
                detail={"field": "cost", "value": str(cost)},
            )
