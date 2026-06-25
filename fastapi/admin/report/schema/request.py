from pydantic import BaseModel


class ReportAnalysisRequest(BaseModel):
    targetType: str
    reason: str
    contentTitle: str | None = None
    contentBody: str | None = None
    adminId: int
