from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class CoverLetterContentItem(BaseModel):
    order: int = Field(..., ge=1, le=5)
    question: str
    answer: str = Field(..., max_length=1000)

    model_config = {
        "json_schema_extra": {
            "examples": [{"order": 1, "question": "지원 동기를 작성하세요.", "answer": "저는 ..."}]
        }
    }


class AnalyzeDocumentRequest(BaseModel):
    document_id: UUID = Field(..., alias="documentId")
    file_type: Literal["RESUME", "COVER_LETTER"] = Field(..., alias="fileType")

    # RESUME 전용
    file_url: str | None = Field(None, alias="fileUrl")
    original_name: str | None = Field(None, alias="originalName")

    # COVER_LETTER 전용
    company: str | None = None
    job: str | None = None
    content: list[CoverLetterContentItem] | None = None

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {
            "examples": [
                {
                    "summary": "이력서 분석 요청",
                    "value": {
                        "documentId": "550e8400-e29b-41d4-a716-446655440000",
                        "fileType": "RESUME",
                        "fileUrl": "https://s3.bucket/resumes/2026-06-15/uuid.pdf",
                        "originalName": "이력서_홍길동.pdf",
                    },
                },
                {
                    "summary": "자기소개서 분석 요청",
                    "value": {
                        "documentId": "660f9511-f30c-52e5-b827-557766551111",
                        "fileType": "COVER_LETTER",
                        "company": "카카오",
                        "job": "백엔드 개발자",
                        "content": [
                            {"order": 1, "question": "지원 동기를 작성하세요.", "answer": "저는 ..."},
                            {"order": 2, "question": "성장 과정을 작성하세요.", "answer": "..."},
                        ],
                    },
                },
            ]
        },
    }

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
