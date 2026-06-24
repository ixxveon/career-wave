from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from admin.scraping.schema.request import ScrapingActionType


class ScrapingResponseBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


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
