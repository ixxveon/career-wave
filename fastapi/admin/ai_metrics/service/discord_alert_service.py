import logging

import httpx

from admin.ai_metrics.config import AiMetricsSettings, get_ai_metrics_settings
from admin.ai_metrics.service.budget_status_service import BudgetAlertCandidate

logger = logging.getLogger(__name__)


class DiscordBudgetAlertService:
    def __init__(self, settings: AiMetricsSettings | None = None) -> None:
        self._settings = settings or get_ai_metrics_settings()

    @property
    def is_configured(self) -> bool:
        return bool(self._settings.discord_webhook_url.strip())

    async def send_threshold_alert(self, candidate: BudgetAlertCandidate) -> None:
        if not self.is_configured:
            logger.warning("[AiBudgetAlert] Discord webhook is not configured; period=%s", candidate.period_key)
            return

        content = (
            "[AI 예산 임계치 초과]\n"
            f"기간: {candidate.period_key} (UTC)\n"
            f"월 예산: ${candidate.monthly_budget}\n"
            f"임계 금액: ${candidate.threshold_amount}\n"
            f"현재 사용: ${candidate.current_spend} ({candidate.usage_percent}%)"
        )
        try:
            async with httpx.AsyncClient(timeout=self._settings.discord_webhook_timeout_seconds) as client:
                response = await client.post(self._settings.discord_webhook_url, json={"content": content})
                response.raise_for_status()
        except httpx.HTTPError as error:
            logger.warning("[AiBudgetAlert] Discord delivery failed; period=%s reason=%s", candidate.period_key, error)
