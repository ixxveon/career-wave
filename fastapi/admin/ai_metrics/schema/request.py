from enum import Enum
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AiFeatureType(str, Enum):
    DOCUMENT = "DOCUMENT"
    INTERVIEW = "INTERVIEW"


class TokenTrendInterval(str, Enum):
    HOURLY = "HOURLY"
    DAILY = "DAILY"


class AlertChannelType(str, Enum):
    DISCORD = "DISCORD"
    SLACK = "SLACK"
    EMAIL = "EMAIL"


class RagDocumentStatusType(str, Enum):
    UPLOADED = "UPLOADED"
    INDEXING = "INDEXING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class AiMetricsRequestBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class PeriodRequest(AiMetricsRequestBase):
    from_: str = Field(alias="from")
    to: str


class SummaryRequest(PeriodRequest):
    feature_type: AiFeatureType | None = Field(default=None, alias="featureType")


class DomainUsageRequest(PeriodRequest):
    pass


class TokenTrendRequest(PeriodRequest):
    feature_type: AiFeatureType | None = Field(default=None, alias="featureType")
    interval: TokenTrendInterval


class HeavyUsersRequest(PeriodRequest):
    feature_type: AiFeatureType | None = Field(default=None, alias="featureType")
    limit: int | None = Field(default=None, ge=1)


class UsageLogSearchRequest(AiMetricsRequestBase):
    feature_type: AiFeatureType | None = Field(default=None, alias="featureType")
    page: int = Field(ge=1)
    size: int = Field(ge=1)


class OpsSettingSyncRequest(AiMetricsRequestBase):
    ai_ops_setting_id: int = Field(alias="aiOpsSettingId")
    selected_model_id: int = Field(alias="selectedModelId")
    model_name: str | None = Field(default=None, alias="modelName")
    monthly_budget: Decimal = Field(alias="monthlyBudget")
    alert_enabled: bool = Field(alias="alertEnabled")
    alert_channel: AlertChannelType = Field(alias="alertChannel")
    alert_threshold: int = Field(alias="alertThreshold")
    rate_limit_enabled: bool = Field(alias="rateLimitEnabled")


class RagIndexStartRequest(AiMetricsRequestBase):
    rag_document_id: int = Field(alias="ragDocumentId")
    file_uuid: UUID = Field(alias="fileUuid")
    original_file_name: str = Field(alias="originalFileName")
    file_path: str = Field(alias="filePath")
    mime_type: str = Field(alias="mimeType")
    file_size: int = Field(alias="fileSize")


class UsageLogCreateRequest(AiMetricsRequestBase):
    member_id: UUID = Field(alias="memberId")
    session_id: UUID | None = Field(default=None, alias="sessionId")
    ai_model_id: int = Field(alias="aiModelId")
    feature_type: AiFeatureType = Field(alias="featureType")
    input_tokens: int = Field(alias="inputTokens", ge=0)
    output_tokens: int = Field(alias="outputTokens", ge=0)
    cost: Decimal = Field(ge=0)
