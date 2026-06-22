from datetime import datetime, timezone

from admin.scraping.service import ScrapingLogService


class _RecordingScrapingLogRepository:
    def __init__(self) -> None:
        self.save_calls: list[dict] = []

    def save(
        self,
        scraping_pipeline_id: int | None,
        target_site: str,
        scraping_status: str,
        total_count: int | None,
        error_message: str | None,
        executed_at: datetime,
    ) -> None:
        self.save_calls.append(
            {
                "scraping_pipeline_id": scraping_pipeline_id,
                "target_site": target_site,
                "scraping_status": scraping_status,
                "total_count": total_count,
                "error_message": error_message,
                "executed_at": executed_at,
            }
        )


def test_scraping_log_service_records_success_log():
    repository = _RecordingScrapingLogRepository()
    service = ScrapingLogService(repository)

    service.log_success("wanted", scraping_pipeline_id=10, total_count=24)

    saved = repository.save_calls[0]
    assert saved["scraping_pipeline_id"] == 10
    assert saved["target_site"] == "wanted"
    assert saved["scraping_status"] == "SUCCESS"
    assert saved["total_count"] == 24
    assert saved["error_message"] is None
    assert saved["executed_at"].tzinfo == timezone.utc


def test_scraping_log_service_records_failure_log_with_normalized_error_message():
    repository = _RecordingScrapingLogRepository()
    service = ScrapingLogService(repository)

    service.log_failure("saramin", scraping_pipeline_id=5, error_message="  network timeout  ")

    saved = repository.save_calls[0]
    assert saved["scraping_pipeline_id"] == 5
    assert saved["target_site"] == "saramin"
    assert saved["scraping_status"] == "FAILED"
    assert saved["total_count"] is None
    assert saved["error_message"] == "network timeout"
    assert saved["executed_at"].tzinfo == timezone.utc


def test_scraping_log_service_records_test_log():
    repository = _RecordingScrapingLogRepository()
    service = ScrapingLogService(repository)

    service.log_test(
        "wanted",
        scraping_pipeline_id=3,
        scraping_status="SUCCESS",
        total_count=0,
        error_message=None,
    )

    saved = repository.save_calls[0]
    assert saved["scraping_pipeline_id"] == 3
    assert saved["target_site"] == "wanted"
    assert saved["scraping_status"] == "SUCCESS"
    assert saved["total_count"] == 0
    assert saved["error_message"] is None
    assert saved["executed_at"].tzinfo == timezone.utc


def test_scraping_log_service_normalizes_blank_error_message_to_none():
    repository = _RecordingScrapingLogRepository()
    service = ScrapingLogService(repository)

    service.log_test(
        "saramin",
        scraping_pipeline_id=None,
        scraping_status="FAILED",
        total_count=None,
        error_message="   ",
    )

    saved = repository.save_calls[0]
    assert saved["scraping_pipeline_id"] is None
    assert saved["target_site"] == "saramin"
    assert saved["scraping_status"] == "FAILED"
    assert saved["total_count"] is None
    assert saved["error_message"] is None
    assert saved["executed_at"].tzinfo == timezone.utc
