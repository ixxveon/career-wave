from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import Mock

from admin.ai_metrics.repository.ai_ops_setting_repository import AiOpsSettingRecord
from admin.ai_metrics.service.budget_status_service import BudgetStatusService


def _setting() -> AiOpsSettingRecord:
    return AiOpsSettingRecord(
        ai_ops_setting_id=1,
        selected_model_id=1,
        monthly_budget=Decimal("100.00"),
        alert_enabled=True,
        alert_channel="DISCORD",
        alert_threshold=85,
        rate_limit_enabled=False,
        updated_at=datetime(2026, 7, 1, tzinfo=timezone.utc),
    )


def test_budget_status_uses_current_utc_month_cost_only():
    usage_log_repository = Mock()
    ops_setting_repository = Mock()
    ops_setting_repository.find_singleton.return_value = _setting()
    usage_log_repository.sum_cost.return_value = Decimal("42.50")
    service = BudgetStatusService(usage_log_repository, ops_setting_repository)

    response = service.get_current_month_status(datetime(2026, 7, 15, 9, 30, tzinfo=timezone.utc))

    assert response.model_dump(by_alias=True) == {
        "currentSpend": Decimal("42.50"),
        "thresholdAmount": Decimal("85.000000"),
        "usagePercent": Decimal("42.50"),
        "remainingBudget": Decimal("57.50"),
    }
    usage_log_repository.sum_cost.assert_called_once_with(
        datetime(2026, 7, 1, tzinfo=timezone.utc),
        datetime(2026, 8, 1, tzinfo=timezone.utc),
    )


def test_threshold_crossing_only_matches_the_first_usage_over_threshold():
    assert BudgetStatusService.is_threshold_crossed(
        previous_spend=Decimal("84.99"),
        current_spend=Decimal("85.00"),
        monthly_budget=Decimal("100.00"),
        alert_threshold=85,
    )
    assert not BudgetStatusService.is_threshold_crossed(
        previous_spend=Decimal("85.00"),
        current_spend=Decimal("90.00"),
        monthly_budget=Decimal("100.00"),
        alert_threshold=85,
    )
