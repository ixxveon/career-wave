from typing import Literal

from pydantic import BaseModel, Field, model_validator


class CoverLetterContentItem(BaseModel):
    order: int = Field(..., ge=1, le=5)
    question: str
    answer: str = Field(..., max_length=1000)


class AnalyzeDocumentRequest(BaseModel):
    document_id: str = Field(..., alias="documentId")
    file_type: Literal["RESUME", "COVER_LETTER"] = Field(..., alias="fileType")

    # RESUME 전용
    file_url: str | None = Field(None, alias="fileUrl")
    original_name: str | None = Field(None, alias="originalName")

    # COVER_LETTER 전용
    company: str | None = None
    job: str | None = None
    content: list[CoverLetterContentItem] | None = None

    model_config = {"populate_by_name": True}

    @model_validator(mode="after")
    def validate_by_file_type(self) -> "AnalyzeDocumentRequest":
        if self.file_type == "RESUME" and not self.file_url:
            raise ValueError("fileUrl is required for RESUME type")
        if self.file_type == "COVER_LETTER":
            if not self.content:
                raise ValueError("content is required for COVER_LETTER type")
            if not (1 <= len(self.content) <= 5):
                raise ValueError("content must have 1 to 5 items")
        return self
