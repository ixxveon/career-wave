from decimal import Decimal
from types import SimpleNamespace

import pytest

from admin.ai_metrics.client.openai_client import AiMetricsModelExecutionContext
from admin.ai_metrics.exception import AiMetricsErrorCode, AiMetricsException
from admin.ai_metrics.service.token_cost_calculator import TokenCostCalculator


def test_token_cost_calculator_resolves_usage_and_fallback_tokens():
    calculator = TokenCostCalculator()

    usage_source = SimpleNamespace(
        usage=SimpleNamespace(
            prompt_tokens=1280,
            completion_tokens=360,
        )
    )

    input_tokens = calculator.calculate_input_tokens(
        usage_source,
        fallback_input_tokens=900,
    )
    output_tokens = calculator.calculate_output_tokens(
        usage_source,
        fallback_output_tokens=200,
    )
    fallback_input_tokens = calculator.calculate_input_tokens(
        None,
        fallback_input_tokens=740,
    )
    fallback_output_tokens = calculator.calculate_output_tokens(
        None,
        fallback_output_tokens=180,
    )

    assert input_tokens == 1280
    assert output_tokens == 360
    assert fallback_input_tokens == 740
    assert fallback_output_tokens == 180


def test_token_cost_calculator_validates_token_cost_result():
    calculator = TokenCostCalculator()
    context = AiMetricsModelExecutionContext(
        ai_model_id=3,
        provider="openai",
        model_name="gpt-4.1-mini",
        input_token_price=Decimal("0.400000"),
        output_token_price=Decimal("1.600000"),
    )

    cost = calculator.calculate_cost(
        context,
        input_tokens=1200,
        output_tokens=450,
    )

    calculator.validate_token_cost_result(
        input_tokens=1200,
        output_tokens=450,
        cost=cost,
    )

    assert cost == Decimal("0.001200")


def test_token_cost_calculator_keeps_non_token_unit_prices_unscaled():
    calculator = TokenCostCalculator()
    context = AiMetricsModelExecutionContext(
        ai_model_id=4,
        provider="openai",
        model_name="whisper-1",
        input_token_price=Decimal("0.000100"),
        output_token_price=Decimal("0"),
        pricing_unit="PER_SECOND",
    )

    cost = calculator.calculate_cost(
        context,
        input_tokens=75,
        output_tokens=0,
    )

    assert cost == Decimal("0.007500")


def test_token_cost_calculator_rejects_unsupported_pricing_unit():
    calculator = TokenCostCalculator()
    context = AiMetricsModelExecutionContext(
        ai_model_id=5,
        provider="openai",
        model_name="unknown-model",
        input_token_price=Decimal("0.1"),
        output_token_price=Decimal("0.2"),
        pricing_unit="PER_REQUEST",
    )

    with pytest.raises(AiMetricsException) as exc_info:
        calculator.calculate_cost(
            context,
            input_tokens=1,
            output_tokens=1,
        )

    assert exc_info.value.error_code == AiMetricsErrorCode.TOKEN_CALCULATION_FAILED
    assert exc_info.value.detail == {"pricingUnit": "PER_REQUEST"}


def test_token_cost_calculator_raises_for_invalid_cost_inputs():
    calculator = TokenCostCalculator()
    context = AiMetricsModelExecutionContext(
        ai_model_id=3,
        provider="openai",
        model_name="gpt-4.1-mini",
        input_token_price=Decimal("0.400000"),
        output_token_price=Decimal("1.600000"),
    )

    with pytest.raises(AiMetricsException) as exc_info:
        calculator.calculate_cost(
            context,
            input_tokens=-1,
            output_tokens=450,
        )

    assert exc_info.value.error_code == AiMetricsErrorCode.TOKEN_CALCULATION_FAILED
    assert exc_info.value.detail == {
        "inputTokens": -1,
        "outputTokens": 450,
    }


def test_token_cost_calculator_rejects_bool_tokens():
    calculator = TokenCostCalculator()

    with pytest.raises(AiMetricsException):
        calculator.calculate_input_tokens(
            SimpleNamespace(prompt_tokens=True),
            fallback_input_tokens=False,
        )
