from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal

from admin.ai_metrics.exception import AiMetricsErrorCode, AiMetricsException
from admin.ai_metrics.repository import (
    AiModelRepository,
    AiOpsSettingRepository,
)
from admin.ai_metrics.schema import OpsSettingSyncRequest, OpsSettingSyncResponse


@dataclass(frozen=True)
class AiOpsRuntimeContext:
    ai_ops_setting_id: int
    selected_model_id: int
    selected_model_name: str
    monthly_budget: Decimal
    alert_enabled: bool
    alert_channel: str
    alert_threshold: int
    rate_limit_enabled: bool
    synced_at: datetime


class OpsSettingsService:
    def __init__(
        self,
        ai_ops_setting_repository: AiOpsSettingRepository,
        ai_model_repository: AiModelRepository,
    ) -> None:
        self._ai_ops_setting_repository = ai_ops_setting_repository
        self._ai_model_repository = ai_model_repository
        self._runtime_context: AiOpsRuntimeContext | None = None

    def sync_settings(
        self,
        request: OpsSettingSyncRequest,
    ) -> OpsSettingSyncResponse:
        persisted_setting = self._ai_ops_setting_repository.find_by_id(request.ai_ops_setting_id)
        if persisted_setting is None:
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.AI_OPS_SETTING_NOT_FOUND,
                detail={"aiOpsSettingId": request.ai_ops_setting_id},
            )

        self._validate_selected_model_id(request.selected_model_id)
        self._validate_budget_threshold(
            monthly_budget=request.monthly_budget,
            alert_threshold=request.alert_threshold,
        )
        active_model = self._ai_model_repository.find_by_id(request.selected_model_id)
        if active_model is None:
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.AI_MODEL_NOT_FOUND,
                detail={"selectedModelId": request.selected_model_id},
            )

        synced_at = datetime.now(timezone.utc)
        self._runtime_context = AiOpsRuntimeContext(
            ai_ops_setting_id=request.ai_ops_setting_id,
            selected_model_id=request.selected_model_id,
            selected_model_name=active_model.model_name,
            monthly_budget=request.monthly_budget,
            alert_enabled=request.alert_enabled,
            alert_channel=request.alert_channel.value,
            alert_threshold=request.alert_threshold,
            rate_limit_enabled=request.rate_limit_enabled,
            synced_at=synced_at,
        )

        return OpsSettingSyncResponse(
            synced=True,
            syncedAt=synced_at,
        )

    def get_runtime_context(self) -> AiOpsRuntimeContext | None:
        return self._runtime_context

    def _validate_selected_model_id(self, selected_model_id: int) -> None:
        active_model = self._ai_model_repository.find_by_id(selected_model_id)
        if active_model is None:
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.AI_MODEL_NOT_FOUND,
                detail={"selectedModelId": selected_model_id},
            )

    def _validate_budget_threshold(
        self,
        *,
        monthly_budget,
        alert_threshold: int,
    ) -> None:
        if monthly_budget < 0:
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.INVALID_MONTHLY_BUDGET,
                detail={"monthlyBudget": str(monthly_budget)},
            )

        if alert_threshold < 0 or alert_threshold > 100:
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.INVALID_ALERT_THRESHOLD,
                detail={"alertThreshold": alert_threshold},
            )
