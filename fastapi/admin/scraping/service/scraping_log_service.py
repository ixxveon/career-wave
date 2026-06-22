from datetime import datetime, timezone

from admin.scraping.repository import ScrapingLogRepository


class ScrapingLogService:
    def __init__(self, scraping_log_repository: ScrapingLogRepository) -> None:
        self._scraping_log_repository = scraping_log_repository

    def log_success(self, source_name: str, scraping_pipeline_id: int | None, total_count: int) -> None:
        self._scraping_log_repository.save(
            scraping_pipeline_id=scraping_pipeline_id,
            target_site=source_name,
            scraping_status="SUCCESS",
            total_count=total_count,
            error_message=None,
            executed_at=datetime.now(timezone.utc),
        )

    def log_failure(
        self,
        source_name: str,
        scraping_pipeline_id: int | None,
        error_message: str | None,
    ) -> None:
        self._scraping_log_repository.save(
            scraping_pipeline_id=scraping_pipeline_id,
            target_site=source_name,
            scraping_status="FAILED",
            total_count=None,
            error_message=self._normalize_error_message(error_message),
            executed_at=datetime.now(timezone.utc),
        )

    def log_test(
        self,
        source_name: str,
        scraping_pipeline_id: int | None,
        scraping_status: str,
        total_count: int | None,
        error_message: str | None,
    ) -> None:
        self._scraping_log_repository.save(
            scraping_pipeline_id=scraping_pipeline_id,
            target_site=source_name,
            scraping_status=scraping_status,
            total_count=total_count,
            error_message=self._normalize_error_message(error_message),
            executed_at=datetime.now(timezone.utc),
        )

    @staticmethod
    def _normalize_error_message(error_message: str | None) -> str | None:
        if error_message is None:
            return None
        normalized = error_message.strip()
        return normalized or None
