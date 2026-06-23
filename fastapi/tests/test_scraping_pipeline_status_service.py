from datetime import datetime, timezone

import pytest

from admin.scraping.exception import ScrapingErrorCode, ScrapingException
from admin.scraping.repository import ScrapingPipelineRecord
from admin.scraping.service import PipelineStatusService


class _RecordingScrapingPipelineRepository:
    def __init__(
        self,
        *,
        running_result: ScrapingPipelineRecord | None = None,
        success_result: ScrapingPipelineRecord | None = None,
        failed_result: ScrapingPipelineRecord | None = None,
    ) -> None:
        self.running_result = running_result
        self.success_result = success_result
        self.failed_result = failed_result
        self.running_calls: list[dict] = []
        self.success_calls: list[dict] = []
        self.failed_calls: list[dict] = []

    def mark_running(self, source_name: str, started_at: datetime) -> ScrapingPipelineRecord | None:
        self.running_calls.append(
            {
                "source_name": source_name,
                "started_at": started_at,
            }
        )
        return self.running_result

    def mark_success(
        self,
        source_name: str,
        *,
        succeeded_at: datetime,
        total_count: int,
        duration_ms: int,
    ) -> ScrapingPipelineRecord | None:
        self.success_calls.append(
            {
                "source_name": source_name,
                "succeeded_at": succeeded_at,
                "total_count": total_count,
                "duration_ms": duration_ms,
            }
        )
        return self.success_result

    def mark_failed(
        self,
        source_name: str,
        *,
        failed_at: datetime,
        error_message: str | None,
    ) -> ScrapingPipelineRecord | None:
        self.failed_calls.append(
            {
                "source_name": source_name,
                "failed_at": failed_at,
                "error_message": error_message,
            }
        )
        return self.failed_result


def _pipeline_record(*, source_name: str, pipeline_status: str) -> ScrapingPipelineRecord:
    now = datetime(2026, 6, 22, 0, 0, tzinfo=timezone.utc)
    return ScrapingPipelineRecord(
        scraping_pipeline_id=1,
        source_name=source_name,
        display_name="Wanted",
        pipeline_status=pipeline_status,
        is_enabled=True,
        last_started_at=None,
        last_success_at=None,
        last_failed_at=None,
        last_duration_ms=None,
        last_total_count=None,
        last_error_message=None,
        created_at=now,
        updated_at=now,
    )


def test_pipeline_status_service_marks_running_transition():
    repository = _RecordingScrapingPipelineRepository(
        running_result=_pipeline_record(source_name="wanted", pipeline_status="RUNNING")
    )
    service = PipelineStatusService(repository)

    pipeline = service.mark_running("wanted")

    assert pipeline.pipeline_status == "RUNNING"
    assert repository.running_calls[0]["source_name"] == "wanted"
    assert repository.running_calls[0]["started_at"].tzinfo == timezone.utc


def test_pipeline_status_service_marks_success_transition():
    repository = _RecordingScrapingPipelineRepository(
        success_result=_pipeline_record(source_name="saramin", pipeline_status="SUCCESS")
    )
    service = PipelineStatusService(repository)

    pipeline = service.mark_success("saramin", total_count=7, duration_ms=3200)

    assert pipeline.pipeline_status == "SUCCESS"
    assert repository.success_calls[0]["source_name"] == "saramin"
    assert repository.success_calls[0]["total_count"] == 7
    assert repository.success_calls[0]["duration_ms"] == 3200
    assert repository.success_calls[0]["succeeded_at"].tzinfo == timezone.utc


def test_pipeline_status_service_marks_failed_transition():
    repository = _RecordingScrapingPipelineRepository(
        failed_result=_pipeline_record(source_name="wanted", pipeline_status="FAILED")
    )
    service = PipelineStatusService(repository)

    pipeline = service.mark_failed("wanted", error_message="network timeout")

    assert pipeline.pipeline_status == "FAILED"
    assert repository.failed_calls[0]["source_name"] == "wanted"
    assert repository.failed_calls[0]["error_message"] == "network timeout"
    assert repository.failed_calls[0]["failed_at"].tzinfo == timezone.utc


@pytest.mark.parametrize(
    ("method_name", "args"),
    [
        ("mark_running", ("wanted",)),
        ("mark_success", ("wanted", 3, 1500)),
        ("mark_failed", ("wanted", "error")),
    ],
)
def test_pipeline_status_service_raises_not_found_when_pipeline_is_missing(method_name: str, args: tuple):
    repository = _RecordingScrapingPipelineRepository()
    service = PipelineStatusService(repository)

    with pytest.raises(ScrapingException) as exc_info:
        getattr(service, method_name)(*args)

    assert exc_info.value.error_code == ScrapingErrorCode.SCRAPING_PIPELINE_NOT_FOUND
    assert exc_info.value.detail == {"sourceName": "wanted"}
