from datetime import datetime, timezone

from admin.scraping.integration import SpringContractValidator
from admin.scraping.repository import (
    ScrapingLogPageRecord,
    ScrapingLogRecord,
    ScrapingPipelinePageRecord,
    ScrapingPipelineRecord,
    ScrapingPipelineSummaryRecord,
)
from admin.scraping.schema import (
    PipelineDetailResponse,
    PipelineLogPageResponse,
    PipelinePageResponse,
    PipelineSummaryResponse,
)


def test_pipeline_page_response_serializes_to_spring_contract():
    record = ScrapingPipelinePageRecord(
        content=[
            ScrapingPipelineRecord(
                scraping_pipeline_id=1,
                source_name="wanted",
                display_name="Wanted",
                pipeline_status="SUCCESS",
                is_enabled=True,
                last_started_at=None,
                last_success_at=datetime(2026, 6, 26, tzinfo=timezone.utc),
                last_failed_at=None,
                last_duration_ms=1200,
                last_total_count=32,
                last_error_message=None,
                created_at=datetime(2026, 6, 1, tzinfo=timezone.utc),
                updated_at=datetime(2026, 6, 26, tzinfo=timezone.utc),
            )
        ],
        page=1,
        size=20,
        total_elements=1,
        total_pages=1,
    )

    payload = PipelinePageResponse.from_record(record).model_dump(by_alias=True)

    SpringContractValidator().validate_pipeline_list_response(payload)


def test_pipeline_summary_response_serializes_to_spring_contract():
    record = ScrapingPipelineSummaryRecord(
        total_count=2,
        idle_count=1,
        running_count=0,
        success_count=1,
        failed_count=0,
        enabled_count=2,
        disabled_count=0,
    )

    payload = PipelineSummaryResponse.from_record(record).model_dump(by_alias=True)

    SpringContractValidator().validate_pipeline_summary_response(payload)


def test_pipeline_detail_response_serializes_to_spring_contract():
    record = ScrapingPipelineRecord(
        scraping_pipeline_id=2,
        source_name="saramin",
        display_name="Saramin",
        pipeline_status="FAILED",
        is_enabled=False,
        last_started_at=None,
        last_success_at=None,
        last_failed_at=datetime(2026, 6, 26, tzinfo=timezone.utc),
        last_duration_ms=None,
        last_total_count=None,
        last_error_message="timeout",
        created_at=datetime(2026, 6, 1, tzinfo=timezone.utc),
        updated_at=datetime(2026, 6, 26, tzinfo=timezone.utc),
    )

    payload = PipelineDetailResponse.from_record(record).model_dump(by_alias=True)

    SpringContractValidator().validate_pipeline_detail_response(payload)


def test_pipeline_log_page_response_serializes_to_spring_contract():
    record = ScrapingLogPageRecord(
        content=[
            ScrapingLogRecord(
                scraping_log_id=10,
                scraping_pipeline_id=1,
                source_name="wanted",
                target_site="wanted",
                scraping_status="SUCCESS",
                total_count=15,
                error_message=None,
                executed_at=datetime(2026, 6, 26, tzinfo=timezone.utc),
            )
        ],
        page=1,
        size=10,
        total_elements=1,
        total_pages=1,
    )

    payload = PipelineLogPageResponse.from_record(record).model_dump(by_alias=True)

    SpringContractValidator().validate_pipeline_logs_response(payload)
    assert payload["content"][0]["message"] == "completed"
    assert payload["content"][0]["detail"] == "totalCount=15"
