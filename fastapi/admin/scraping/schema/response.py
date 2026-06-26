from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from admin.scraping.repository import (
    ScrapingLogPageRecord,
    ScrapingLogRecord,
    ScrapingPipelinePageRecord,
    ScrapingPipelineRecord,
    ScrapingPipelineSummaryRecord,
)
from admin.scraping.schema.request import ScrapingActionType, ScrapingPipelineStatusType, ScrapingStatusType


class ScrapingResponseBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class PipelineItemResponse(ScrapingResponseBase):
    scraping_pipeline_id: int = Field(alias="scrapingPipelineId")
    source_name: str = Field(alias="sourceName")
    display_name: str = Field(alias="displayName")
    pipeline_status: ScrapingPipelineStatusType = Field(alias="pipelineStatus")
    is_enabled: bool = Field(alias="isEnabled")
    last_started_at: datetime | None = Field(alias="lastStartedAt")
    last_success_at: datetime | None = Field(alias="lastSuccessAt")
    last_failed_at: datetime | None = Field(alias="lastFailedAt")
    last_duration_ms: int | None = Field(alias="lastDurationMs")
    last_total_count: int | None = Field(alias="lastTotalCount")
    last_error_message: str | None = Field(alias="lastErrorMessage")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    @classmethod
    def from_record(cls, record: ScrapingPipelineRecord) -> "PipelineItemResponse":
        return cls(
            scrapingPipelineId=record.scraping_pipeline_id,
            sourceName=record.source_name,
            displayName=record.display_name,
            pipelineStatus=record.pipeline_status,
            isEnabled=record.is_enabled,
            lastStartedAt=record.last_started_at,
            lastSuccessAt=record.last_success_at,
            lastFailedAt=record.last_failed_at,
            lastDurationMs=record.last_duration_ms,
            lastTotalCount=record.last_total_count,
            lastErrorMessage=record.last_error_message,
            createdAt=record.created_at,
            updatedAt=record.updated_at,
        )


class PipelinePageResponse(ScrapingResponseBase):
    content: list[PipelineItemResponse]
    page: int
    size: int
    total_elements: int = Field(alias="totalElements")
    total_pages: int = Field(alias="totalPages")

    @classmethod
    def from_record(cls, record: ScrapingPipelinePageRecord) -> "PipelinePageResponse":
        return cls(
            content=[PipelineItemResponse.from_record(item) for item in record.content],
            page=record.page,
            size=record.size,
            totalElements=record.total_elements,
            totalPages=record.total_pages,
        )


class PipelineSummaryResponse(ScrapingResponseBase):
    total_count: int = Field(alias="totalCount")
    idle_count: int = Field(alias="idleCount")
    running_count: int = Field(alias="runningCount")
    success_count: int = Field(alias="successCount")
    failed_count: int = Field(alias="failedCount")
    enabled_count: int = Field(alias="enabledCount")
    disabled_count: int = Field(alias="disabledCount")

    @classmethod
    def from_record(cls, record: ScrapingPipelineSummaryRecord) -> "PipelineSummaryResponse":
        return cls(
            totalCount=record.total_count,
            idleCount=record.idle_count,
            runningCount=record.running_count,
            successCount=record.success_count,
            failedCount=record.failed_count,
            enabledCount=record.enabled_count,
            disabledCount=record.disabled_count,
        )


class PipelineDetailResponse(PipelineItemResponse):
    @classmethod
    def from_record(cls, record: ScrapingPipelineRecord) -> "PipelineDetailResponse":
        return cls.model_validate(PipelineItemResponse.from_record(record).model_dump())


class PipelineLogItemResponse(ScrapingResponseBase):
    log_id: int = Field(alias="logId")
    occurred_at: datetime = Field(alias="occurredAt")
    source_name: str = Field(alias="sourceName")
    status: ScrapingStatusType
    message: str
    detail: str | None
    run_id: str | None = Field(alias="runId")

    @classmethod
    def from_record(cls, record: ScrapingLogRecord) -> "PipelineLogItemResponse":
        status = ScrapingStatusType(record.scraping_status)
        return cls(
            logId=record.scraping_log_id,
            occurredAt=record.executed_at,
            sourceName=record.source_name or record.target_site,
            status=status,
            message="completed" if status == ScrapingStatusType.SUCCESS else "failed",
            detail=_build_log_detail(record),
            # TODO: ScrapingLogRecord에 실행 단위 run_id가 저장되면 실제 값으로 매핑한다.
            runId=None,
        )


class PipelineLogPageResponse(ScrapingResponseBase):
    content: list[PipelineLogItemResponse]
    page: int
    size: int
    total_elements: int = Field(alias="totalElements")
    total_pages: int = Field(alias="totalPages")

    @classmethod
    def from_record(cls, record: ScrapingLogPageRecord) -> "PipelineLogPageResponse":
        return cls(
            content=[PipelineLogItemResponse.from_record(item) for item in record.content],
            page=record.page,
            size=record.size,
            totalElements=record.total_elements,
            totalPages=record.total_pages,
        )


class PipelineActionResponse(ScrapingResponseBase):
    source_name: str = Field(alias="sourceName")
    accepted: bool
    run_id: str = Field(alias="runId")
    requested_at: datetime = Field(alias="requestedAt")


class PipelineBatchActionItemResponse(ScrapingResponseBase):
    source_name: str = Field(alias="sourceName")
    accepted: bool
    message: str


class PipelineBatchActionResponse(ScrapingResponseBase):
    action_type: ScrapingActionType = Field(alias="actionType")
    requested_count: int = Field(alias="requestedCount", ge=0)
    accepted_count: int = Field(alias="acceptedCount", ge=0)
    results: list[PipelineBatchActionItemResponse]
    requested_at: datetime = Field(alias="requestedAt")


def _build_log_detail(record: ScrapingLogRecord) -> str | None:
    if record.error_message:
        return record.error_message
    if record.total_count is not None:
        return f"totalCount={record.total_count}"
    return None
