from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import Mock
from uuid import UUID

from admin.ai_metrics.repository.ai_model_repository import AiModelRecord
from admin.ai_metrics.repository.ai_usage_log_repository import AiUsageLogRecord
from admin.ai_metrics.schema import UsageLogCreateRequest
from admin.ai_metrics.service.usage_log_service import UsageLogService


def test_usage_log_service_persists_calculated_usage_log():
    usage_log_repository = Mock()
    ai_model_repository = Mock()
    token_cost_calculator = Mock()

    ai_model_repository.find_by_id.return_value = AiModelRecord(
        ai_model_id=5,
        model_name="gpt-4.1-mini",
        display_type="GPT-4.1 Mini",
        provider="OPENAI",
        input_token_price=Decimal("0.400000"),
        output_token_price=Decimal("1.600000"),
        is_enabled=True,
        created_at=datetime(2026, 6, 1, tzinfo=timezone.utc),
        updated_at=datetime(2026, 6, 1, tzinfo=timezone.utc),
    )
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
