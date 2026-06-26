from pydantic import BaseModel, Field


class ReportAnalysisRequest(BaseModel):
    targetType: str
    reason: str
    contentTitle: str | None = None
    contentBody: str | None = None
    admin_id: int = Field(alias="adminId")
