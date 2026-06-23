from datetime import datetime, timezone

import pytest

from admin.scraping.repository import ScrapingPipelineRecord
from admin.scraping.schema import ScrapingActionType
from admin.scraping.service import JobNoticeDedupService, JobNoticeNormalizer
from admin.scraping.task import ScrapingTask


class _RecordingJobNoticeRepository:
    def __init__(self) -> None:
        self.saved_items: list[dict] = []

    def exists_by_source_and_original_url(self, source: str, original_url: str) -> bool:
        _ = (source, original_url)
        return False

    def save(self, **kwargs) -> None:
        self.saved_items.append(kwargs)


class _RecordingPipelineRunnerService:
    def __init__(self) -> None:
        self.test_calls: list[str] = []
        self.dispatch_calls: list[tuple[ScrapingActionType, str]] = []

    def test(self, source_name: str) -> bool:
        self.test_calls.append(source_name)
        return True

    def dispatch(self, *, action_type: ScrapingActionType, source_name: str):
        self.dispatch_calls.append((action_type, source_name))
        return []


class _RecordingPipelineStatusService:
    def __init__(self) -> None:
        self.success_calls: list[tuple[str, int, int]] = []

    def mark_success(self, source_name: str, total_count: int, duration_ms: int) -> ScrapingPipelineRecord:
        self.success_calls.append((source_name, total_count, duration_ms))
        now = datetime.now(timezone.utc)
        return ScrapingPipelineRecord(
            scraping_pipeline_id=1,
            source_name=source_name,
            display_name=source_name.title(),
            pipeline_status="SUCCESS",
            is_enabled=True,
            last_started_at=now,
            last_success_at=now,
            last_failed_at=None,
            last_duration_ms=duration_ms,
            last_total_count=total_count,
            last_error_message=None,
            created_at=now,
            updated_at=now,
        )


class _RecordingScrapingLogService:
    def __init__(self) -> None:
        self.test_logs: list[dict] = []
        self.success_logs: list[dict] = []

    def log_test(
        self,
        source_name: str,
        scraping_pipeline_id: int | None,
        scraping_status: str,
        total_count: int | None,
        error_message: str | None,
    ) -> None:
        self.test_logs.append(
            {
                "source_name": source_name,
                "scraping_pipeline_id": scraping_pipeline_id,
                "scraping_status": scraping_status,
                "total_count": total_count,
                "error_message": error_message,
            }
        )

    def log_success(self, source_name: str, scraping_pipeline_id: int | None, total_count: int) -> None:
        self.success_logs.append(
            {
                "source_name": source_name,
                "scraping_pipeline_id": scraping_pipeline_id,
                "total_count": total_count,
            }
        )


def test_job_notice_dedup_service_skip_for_test_does_not_save_any_notice():
    repository = _RecordingJobNoticeRepository()
    service = JobNoticeDedupService(repository)

    service.skip_for_test([])

    assert repository.saved_items == []


@pytest.mark.asyncio
async def test_scraping_task_test_action_does_not_save_job_notices():
    repository = _RecordingJobNoticeRepository()
    dedup_service = JobNoticeDedupService(repository)
    runner_service = _RecordingPipelineRunnerService()
    status_service = _RecordingPipelineStatusService()
    log_service = _RecordingScrapingLogService()
    task = ScrapingTask(
        pipeline_runner_service=runner_service,
        pipeline_status_service=status_service,
        scraping_log_service=log_service,
        job_notice_normalizer=JobNoticeNormalizer(),
        job_notice_dedup_service=dedup_service,
    )

    result = await task.run(
        source_name="wanted",
        action_type=ScrapingActionType.TEST,
    )

    assert result.action_type == ScrapingActionType.TEST
    assert result.pipeline_status == "SUCCESS"
    assert result.total_count == 0
    assert runner_service.test_calls == ["wanted"]
    assert runner_service.dispatch_calls == []
    assert repository.saved_items == []
    assert len(log_service.test_logs) == 1
    assert log_service.success_logs == []
