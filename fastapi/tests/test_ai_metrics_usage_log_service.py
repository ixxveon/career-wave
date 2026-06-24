from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import Mock
from uuid import UUID

import pytest
from pydantic import ValidationError

from admin.ai_metrics.exception import AiMetricsErrorCode, AiMetricsException
from admin.ai_metrics.repository.ai_model_repository import AiModelRecord
from admin.ai_metrics.repository.ai_usage_log_repository import AiUsageLogRecord
from admin.ai_metrics.schema import UsageLogCreateRequest
from admin.ai_metrics.service.usage_log_service import UsageLogService


def _ai_model_record(ai_model_id: int = 5, model_name: str = "gpt-4.1-mini") -> AiModelRecord:
    return AiModelRecord(
        ai_model_id=ai_model_id,
        model_name=model_name,
        display_type="GPT-4.1 Mini",
        provider="OPENAI",
        input_token_price=Decimal("0.400000"),
        output_token_price=Decimal("1.600000"),
        is_enabled=True,
        created_at=datetime(2026, 6, 1, tzinfo=timezone.utc),
        updated_at=datetime(2026, 6, 1, tzinfo=timezone.utc),
    )


def test_usage_log_service_persists_calculated_usage_log():
    usage_log_repository = Mock()
    ai_model_repository = Mock()
    token_cost_calculator = Mock()

    ai_model_repository.find_by_id.return_value = _ai_model_record()
    token_cost_calculator.calculate_input_tokens.return_value = 1300
    token_cost_calculator.calculate_output_tokens.return_value = 420
    token_cost_calculator.calculate_cost.return_value = Decimal("1192.000000")
    usage_log_repository.save.return_value = AiUsageLogRecord(
        ai_usage_log_id=101,
        member_id=UUID("55555555-5555-5555-5555-555555555555"),
        session_id=UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
        ai_model_id=5,
        feature_type="DOCUMENT",
        input_tokens=1300,
        output_tokens=420,
        cost=Decimal("1192.000000"),
        created_at=datetime(2026, 6, 18, 12, 0, tzinfo=timezone.utc),
    )

    service = UsageLogService(
        usage_log_repository=usage_log_repository,
        ai_model_repository=ai_model_repository,
        token_cost_calculator=token_cost_calculator,
    )

    request = UsageLogCreateRequest(
        memberId=UUID("55555555-5555-5555-5555-555555555555"),
        sessionId=UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
        aiModelId=5,
        featureType="DOCUMENT",
        inputTokens=1000,
        outputTokens=300,
        cost=Decimal("0"),
    )

    saved_record = service.create_usage_log(request)

    assert saved_record.ai_usage_log_id == 101
    assert saved_record.input_tokens == 1300
    assert saved_record.output_tokens == 420
    assert saved_record.cost == Decimal("1192.000000")

    ai_model_repository.find_by_id.assert_called_once_with(5)
    token_cost_calculator.calculate_input_tokens.assert_called_once_with(
        fallback_input_tokens=1000,
    )
    token_cost_calculator.calculate_output_tokens.assert_called_once_with(
        fallback_output_tokens=300,
    )
    token_cost_calculator.validate_token_cost_result.assert_called_once_with(
        input_tokens=1300,
        output_tokens=420,
        cost=Decimal("1192.000000"),
    )

    persisted_request = usage_log_repository.save.call_args.args[0]
    assert persisted_request.member_id == UUID("55555555-5555-5555-5555-555555555555")
    assert persisted_request.session_id == UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
    assert persisted_request.ai_model_id == 5
    assert persisted_request.feature_type.value == "DOCUMENT"
    assert persisted_request.input_tokens == 1300
    assert persisted_request.output_tokens == 420
    assert persisted_request.cost == Decimal("1192.000000")


def test_usage_log_service_resolves_model_by_model_name():
    usage_log_repository = Mock()
    ai_model_repository = Mock()
    token_cost_calculator = Mock()

    ai_model_repository.find_by_model_name.return_value = _ai_model_record(
        ai_model_id=7,
        model_name="gpt-4.1",
    )
    token_cost_calculator.calculate_input_tokens.return_value = 800
    token_cost_calculator.calculate_output_tokens.return_value = 200
    token_cost_calculator.calculate_cost.return_value = Decimal("640.000000")
    usage_log_repository.save.return_value = AiUsageLogRecord(
        ai_usage_log_id=102,
        member_id=UUID("55555555-5555-5555-5555-555555555555"),
        session_id=None,
        ai_model_id=7,
        feature_type="INTERVIEW",
        input_tokens=800,
        output_tokens=200,
        cost=Decimal("640.000000"),
        created_at=datetime(2026, 6, 18, 12, 0, tzinfo=timezone.utc),
    )

    service = UsageLogService(
        usage_log_repository=usage_log_repository,
        ai_model_repository=ai_model_repository,
        token_cost_calculator=token_cost_calculator,
    )

    request = UsageLogCreateRequest(
        memberId=UUID("55555555-5555-5555-5555-555555555555"),
        modelName="gpt-4.1",
        featureType="INTERVIEW",
        inputTokens=800,
        outputTokens=200,
        cost=Decimal("0"),
    )

    saved_record = service.create_usage_log(request)

    assert saved_record.ai_usage_log_id == 102
    ai_model_repository.find_by_id.assert_not_called()
    ai_model_repository.find_by_model_name.assert_called_once_with("gpt-4.1")

    persisted_request = usage_log_repository.save.call_args.args[0]
    assert persisted_request.ai_model_id == 7
    assert persisted_request.model_name == "gpt-4.1"
    assert persisted_request.feature_type.value == "INTERVIEW"
    assert persisted_request.cost == Decimal("640.000000")


def test_usage_log_service_prefers_ai_model_id_when_both_identifiers_are_present():
    usage_log_repository = Mock()
    ai_model_repository = Mock()
    token_cost_calculator = Mock()

    ai_model_repository.find_by_id.return_value = _ai_model_record(ai_model_id=5)
    token_cost_calculator.calculate_input_tokens.return_value = 100
    token_cost_calculator.calculate_output_tokens.return_value = 50
    token_cost_calculator.calculate_cost.return_value = Decimal("120.000000")
    usage_log_repository.save.return_value = AiUsageLogRecord(
        ai_usage_log_id=103,
        member_id=UUID("55555555-5555-5555-5555-555555555555"),
        session_id=None,
        ai_model_id=5,
        feature_type="DOCUMENT",
        input_tokens=100,
        output_tokens=50,
        cost=Decimal("120.000000"),
        created_at=datetime(2026, 6, 18, 12, 0, tzinfo=timezone.utc),
    )

    service = UsageLogService(
        usage_log_repository=usage_log_repository,
        ai_model_repository=ai_model_repository,
        token_cost_calculator=token_cost_calculator,
    )

    request = UsageLogCreateRequest(
        memberId=UUID("55555555-5555-5555-5555-555555555555"),
        aiModelId=5,
        modelName="gpt-4.1",
        featureType="DOCUMENT",
        inputTokens=100,
        outputTokens=50,
        cost=Decimal("0"),
    )

    service.create_usage_log(request)

    ai_model_repository.find_by_id.assert_called_once_with(5)
    ai_model_repository.find_by_model_name.assert_not_called()


def test_usage_log_create_request_requires_model_identifier():
    with pytest.raises(ValidationError) as error:
        UsageLogCreateRequest(
            memberId=UUID("55555555-5555-5555-5555-555555555555"),
            featureType="DOCUMENT",
            inputTokens=100,
            outputTokens=50,
            cost=Decimal("0"),
        )

    assert "Either aiModelId or modelName is required." in str(error.value)


def test_usage_log_service_raises_when_model_name_does_not_match():
    usage_log_repository = Mock()
    ai_model_repository = Mock()
    ai_model_repository.find_by_model_name.return_value = None

    service = UsageLogService(
        usage_log_repository=usage_log_repository,
        ai_model_repository=ai_model_repository,
    )

    request = UsageLogCreateRequest(
        memberId=UUID("55555555-5555-5555-5555-555555555555"),
        modelName="unknown-model",
        featureType="DOCUMENT",
        inputTokens=100,
        outputTokens=50,
        cost=Decimal("0"),
    )

    with pytest.raises(AiMetricsException) as error:
        service.create_usage_log(request)

    assert error.value.error_code == AiMetricsErrorCode.AI_MODEL_NOT_FOUND
    assert error.value.detail == {"modelName": "unknown-model"}
    usage_log_repository.save.assert_not_called()
