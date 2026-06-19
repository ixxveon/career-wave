from typing import Literal

from pydantic import BaseModel


class ReportAnalysisResponse(BaseModel):
    severity: Literal["높음", "중간", "낮음"]
    category: Literal["SPAM", "ABUSE", "AD", "INAPPROPRIATE", "OTHER"]
    suggestion: str
