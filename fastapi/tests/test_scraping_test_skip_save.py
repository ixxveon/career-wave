from datetime import datetime, timezone

import pytest

from admin.scraping.adapter import RawJobNotice, ScrapingDetailMetrics
from admin.scraping.exception import ScrapingErrorCode, ScrapingException
from admin.scraping.repository import ScrapingPipelineRecord
from admin.scraping.schema import ScrapingActionType
from admin.scraping.service import JobNoticeDedupService, JobNoticeNormalizer, ScrapingRunResult
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
    def __init__(self, dispatch_result: object | None = None) -> None:
        self.test_calls: list[str] = []
        self.dispatch_calls: list[tuple[ScrapingActionType, str]] = []
        self._dispatch_result = dispatch_result

    def test(self, source_name: str) -> bool:
        self.test_calls.append(source_name)
        return True

    def dispatch(self, *, action_type: ScrapingActionType, source_name: str):
        self.dispatch_calls.append((action_type, source_name))
        return self._dispatch_result if self._dispatch_result is not None else []


class _RecordingPipelineStatusService:
    def __init__(self) -> None:
        self.success_calls: list[tuple[str, int, int]] = []
        self.failure_calls: list[tuple[str, str | None]] = []

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

    def mark_failed(self, source_name: str, error_message: str | None) -> ScrapingPipelineRecord:
        self.failure_calls.append((source_name, error_message))
        now = datetime.now(timezone.utc)
        return ScrapingPipelineRecord(
            scraping_pipeline_id=1,
            source_name=source_name,
            display_name=source_name.title(),
            pipeline_status="FAILED",
            is_enabled=True,
            last_started_at=now,
            last_success_at=None,
            last_failed_at=now,
            last_duration_ms=None,
            last_total_count=None,
            last_error_message=error_message,
            created_at=now,
            updated_at=now,
        )


class _RecordingScrapingLogService:
    def __init__(self) -> None:
        self.test_logs: list[dict] = []
        self.success_logs: list[dict] = []
        self.failure_logs: list[dict] = []

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

    def log_failure(self, source_name: str, scraping_pipeline_id: int | None, error_message: str | None) -> None:
        self.failure_logs.append(
            {
                "source_name": source_name,
                "scraping_pipeline_id": scraping_pipeline_id,
                "error_message": error_message,
            }
        )


def test_job_notice_dedup_service_skip_for_test_does_not_save_any_notice():
    repository = _RecordingJobNoticeRepository()
    service = JobNoticeDedupService(repository)

    service.skip_for_test([])

    assert repository.saved_items == []


@pytest.mark.asyncio
async def test_scraping_task_test_action_uses_injected_services_without_dedup_service():
    runner_service = _RecordingPipelineRunnerService()
    status_service = _RecordingPipelineStatusService()
    log_service = _RecordingScrapingLogService()
    task = ScrapingTask(
        pipeline_runner_service=runner_service,
        pipeline_status_service=status_service,
        scraping_log_service=log_service,
        job_notice_normalizer=JobNoticeNormalizer(),
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
    assert len(log_service.test_logs) == 1
    assert log_service.success_logs == []


@pytest.mark.asyncio
async def test_scraping_task_run_action_fails_fast_when_dedup_service_is_missing():
    task = ScrapingTask(
        pipeline_runner_service=_RecordingPipelineRunnerService(),
        pipeline_status_service=_RecordingPipelineStatusService(),
        scraping_log_service=_RecordingScrapingLogService(),
        job_notice_normalizer=JobNoticeNormalizer(),
    )

    with pytest.raises(ValueError, match="job_notice_dedup_service"):
        await task.run(
            source_name="wanted",
            action_type=ScrapingActionType.RUN,
        )


@pytest.mark.asyncio
async def test_scraping_task_invalidates_job_notice_caches_after_successful_run(monkeypatch):
    cache_invalidation_calls: list[bool] = []

    async def invalidate_job_notice_caches() -> None:
        cache_invalidation_calls.append(True)

    monkeypatch.setattr(
        "admin.scraping.task.scraping_task.invalidate_job_notice_caches",
        invalidate_job_notice_caches,
    )
    task = ScrapingTask(
        pipeline_runner_service=_RecordingPipelineRunnerService(),
        pipeline_status_service=_RecordingPipelineStatusService(),
        scraping_log_service=_RecordingScrapingLogService(),
        job_notice_dedup_service=JobNoticeDedupService(_RecordingJobNoticeRepository()),
        job_notice_normalizer=JobNoticeNormalizer(),
    )

    result = await task.run(
        source_name="wanted",
        action_type=ScrapingActionType.RUN,
    )

    assert result.pipeline_status == "SUCCESS"
    assert cache_invalidation_calls == [True]


@pytest.mark.asyncio
async def test_scraping_task_marks_pipeline_failed_when_all_detail_requests_fail():
    dispatch_result = ScrapingRunResult(
        notices=[RawJobNotice(original_url="https://example.com/jobs/1", title="Backend Engineer")],
        detail_metrics=ScrapingDetailMetrics(
            attempted_count=1,
            failed_count=1,
            timeout_count=4,
            retry_count=2,
        ),
    )
    repository = _RecordingJobNoticeRepository()
    status_service = _RecordingPipelineStatusService()
    log_service = _RecordingScrapingLogService()
    task = ScrapingTask(
        pipeline_runner_service=_RecordingPipelineRunnerService(dispatch_result),
        pipeline_status_service=status_service,
        scraping_log_service=log_service,
        job_notice_dedup_service=JobNoticeDedupService(repository),
        job_notice_normalizer=JobNoticeNormalizer(),
    )

    with pytest.raises(ScrapingException) as exc_info:
        await task.run(source_name="wanted", action_type=ScrapingActionType.RUN)

    assert exc_info.value.error_code == ScrapingErrorCode.SCRAPING_DETAIL_COMPLETENESS_FAILED
    assert status_service.success_calls == []
    assert status_service.failure_calls == [("wanted", "All detail scraping requests failed.")]
    assert len(log_service.failure_logs) == 1
    assert repository.saved_items == []
