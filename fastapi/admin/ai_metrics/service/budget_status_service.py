from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP

from admin.ai_metrics.exception import AiMetricsErrorCode, AiMetricsException
from admin.ai_metrics.repository import AiOpsSettingRepository, AiUsageLogRepository
from admin.ai_metrics.schema import BudgetStatusResponse


@dataclass(frozen=True)
class BudgetAlertCandidate:
    period_key: str
    monthly_budget: Decimal
    threshold_amount: Decimal
    current_spend: Decimal
    usage_percent: Decimal


class BudgetStatusService:
    def __init__(
        self,
        ai_usage_log_repository: AiUsageLogRepository,
        ai_ops_setting_repository: AiOpsSettingRepository,
    ) -> None:
        self._ai_usage_log_repository = ai_usage_log_repository
        self._ai_ops_setting_repository = ai_ops_setting_repository

    def get_current_month_status(self, now: datetime | None = None) -> BudgetStatusResponse:
        setting = self.get_setting()
        period_start, next_period_start = self.month_bounds(now)
        current_spend = self._ai_usage_log_repository.sum_cost(period_start, next_period_start)
        return self.to_response(setting.monthly_budget, setting.alert_threshold, current_spend)

    def get_setting(self):
        setting = self._ai_ops_setting_repository.find_singleton()
        if setting is None:
            raise AiMetricsException(error_code=AiMetricsErrorCode.AI_OPS_SETTING_NOT_FOUND)
        return setting

    @staticmethod
    def month_bounds(now: datetime | None = None) -> tuple[datetime, datetime]:
        current = now or datetime.now(timezone.utc)
        if current.tzinfo is None:
            current = current.replace(tzinfo=timezone.utc)
        current = current.astimezone(timezone.utc)
        period_start = current.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if period_start.month == 12:
            next_period_start = period_start.replace(year=period_start.year + 1, month=1)
        else:
            next_period_start = period_start.replace(month=period_start.month + 1)
        return period_start, next_period_start

    @staticmethod
    def period_key(now: datetime | None = None) -> str:
        period_start, _ = BudgetStatusService.month_bounds(now)
        return period_start.strftime("%Y-%m")

    @staticmethod
    def is_threshold_crossed(
        previous_spend: Decimal,
        current_spend: Decimal,
        monthly_budget: Decimal,
        alert_threshold: int,
    ) -> bool:
        threshold_amount = monthly_budget * Decimal(alert_threshold) / Decimal("100")
        return previous_spend < threshold_amount <= current_spend

    @staticmethod
    def to_alert_candidate(
        monthly_budget: Decimal,
        alert_threshold: int,
        current_spend: Decimal,
        now: datetime | None = None,
    ) -> BudgetAlertCandidate:
        response = BudgetStatusService.to_response(monthly_budget, alert_threshold, current_spend)
        return BudgetAlertCandidate(
            period_key=BudgetStatusService.period_key(now),
            monthly_budget=monthly_budget,
            threshold_amount=response.threshold_amount,
            current_spend=current_spend,
            usage_percent=response.usage_percent,
        )

    @staticmethod
    def to_response(
        monthly_budget: Decimal,
        alert_threshold: int,
        current_spend: Decimal,
    ) -> BudgetStatusResponse:
        threshold_amount = (monthly_budget * Decimal(alert_threshold) / Decimal("100")).quantize(
            Decimal("0.000001"),
            rounding=ROUND_HALF_UP,
        )
        usage_percent = Decimal("0") if monthly_budget == 0 else (
            current_spend * Decimal("100") / monthly_budget
        ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        return BudgetStatusResponse(
            currentSpend=current_spend,
            thresholdAmount=threshold_amount,
            usagePercent=usage_percent,
            remainingBudget=max(Decimal("0"), monthly_budget - current_spend),
        )
