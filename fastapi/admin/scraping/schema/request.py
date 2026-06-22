from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class ScrapingPipelineStatusType(str, Enum):
    IDLE = "IDLE"
    RUNNING = "RUNNING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"


class ScrapingStatusType(str, Enum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"


class ScrapingActionType(str, Enum):
    RUN = "RUN"
    RETRY = "RETRY"
    TEST = "TEST"


class ScrapingRequestBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class PipelineListQueryRequest(ScrapingRequestBase):
    keyword: str | None = None
    status: ScrapingPipelineStatusType | None = None
    page: int = Field(default=1, ge=1)
    size: int = Field(default=20, ge=1)


class PipelineSummaryQueryRequest(ScrapingRequestBase):
    pass


class PipelineLogQueryRequest(ScrapingRequestBase):
    source_name: str | None = Field(default=None, alias="sourceName")
    status: ScrapingStatusType | None = None
    page: int = Field(default=1, ge=1)
    size: int = Field(default=20, ge=1)


class PipelineActionRequest(ScrapingRequestBase):
    requested_by: str = Field(alias="requestedBy", min_length=1)


class PipelineBatchActionRequest(ScrapingRequestBase):
    action_type: ScrapingActionType = Field(alias="actionType")
    source_names: list[str] = Field(alias="sourceNames", min_length=1)
    requested_by: str = Field(alias="requestedBy", min_length=1)
