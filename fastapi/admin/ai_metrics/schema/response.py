from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from admin.ai_metrics.schema.request import (
    AiFeatureType,
    RagDocumentStatusType,
    TokenTrendInterval,
)


class AiMetricsResponseBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class SummaryResponse(AiMetricsResponseBase):
    total_requests: int = Field(alias="totalRequests")
    total_input_tokens: int = Field(alias="totalInputTokens")
    total_output_tokens: int = Field(alias="totalOutputTokens")
    total_cost: Decimal = Field(alias="totalCost")
    document_requests: int = Field(alias="documentRequests")
    interview_requests: int = Field(alias="interviewRequests")
    active_model_id: int | None = Field(default=None, alias="activeModelId")
    active_model_name: str | None = Field(default=None, alias="activeModelName")


class FeatureUsageResponse(AiMetricsResponseBase):
    request_count: int = Field(alias="requestCount")
    input_tokens: int = Field(alias="inputTokens")
    output_tokens: int = Field(alias="outputTokens")
    cost: Decimal


class DomainUsageResponse(AiMetricsResponseBase):
    document: FeatureUsageResponse
    interview: FeatureUsageResponse


class TokenTrendPointResponse(AiMetricsResponseBase):
    bucket: str
    input_tokens: int = Field(alias="inputTokens")
    output_tokens: int = Field(alias="outputTokens")
    cost: Decimal


class TokenTrendResponse(AiMetricsResponseBase):
    interval: TokenTrendInterval
    points: list[TokenTrendPointResponse]


class HeavyUserResponse(AiMetricsResponseBase):
    member_id: UUID = Field(alias="memberId")
    request_count: int = Field(alias="requestCount")
    input_tokens: int = Field(alias="inputTokens")
    output_tokens: int = Field(alias="outputTokens")
    cost: Decimal


class HeavyUsersResponse(AiMetricsResponseBase):
    users: list[HeavyUserResponse]


class UsageLogItemResponse(AiMetricsResponseBase):
    ai_usage_log_id: int = Field(alias="aiUsageLogId")
    member_id: UUID = Field(alias="memberId")
    session_id: UUID | None = Field(default=None, alias="sessionId")
    ai_model_id: int = Field(alias="aiModelId")
    feature_type: AiFeatureType = Field(alias="featureType")
    input_tokens: int = Field(alias="inputTokens")
    output_tokens: int = Field(alias="outputTokens")
    cost: Decimal
    created_at: datetime = Field(alias="createdAt")


class UsageLogListResponse(AiMetricsResponseBase):
    content: list[UsageLogItemResponse]
    page: int
    size: int
    total_elements: int = Field(alias="totalElements")
    total_pages: int = Field(alias="totalPages")


class OpsSettingSyncResponse(AiMetricsResponseBase):
    synced: bool
    synced_at: datetime = Field(alias="syncedAt")


class RagIndexStartResponse(AiMetricsResponseBase):
    accepted: bool
    rag_document_id: int = Field(alias="ragDocumentId")
    status: RagDocumentStatusType


class RagIndexDeleteResponse(AiMetricsResponseBase):
    deleted: bool
    rag_document_id: int = Field(alias="ragDocumentId")


class UsageLogCreateResponse(AiMetricsResponseBase):
    ai_usage_log_id: int = Field(alias="aiUsageLogId")
    recorded: bool
    created_at: datetime = Field(alias="createdAt")
