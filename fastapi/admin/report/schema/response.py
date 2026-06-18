from pydantic import BaseModel


class ReportAnalysisResponse(BaseModel):
    severity: str
    category: str
    suggestion: str
