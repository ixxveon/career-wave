from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class ScrapingErrorResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    success: Literal[False] = False
    error_code: str = Field(alias="errorCode")
    message: str
    detail: dict[str, Any] = Field(default_factory=dict)
