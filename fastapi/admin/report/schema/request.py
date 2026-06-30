from pydantic import BaseModel, Field


class ReportAnalysisRequest(BaseModel):
    targetType: str
    reason: str
    contentTitle: str | None = None
    contentBody: str | None = None
    admin_id: int = Field(alias="adminId")


class MemberAnalysisRequest(BaseModel):
    warning_count: int = Field(alias="warningCount")
    report_count: int = Field(alias="reportCount")
    member_status: str = Field(alias="memberStatus")
    reason: str
    admin_id: int = Field(alias="adminId")
