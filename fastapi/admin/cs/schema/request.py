from pydantic import BaseModel, ConfigDict, Field


class NoticeDraftRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    category: str
    title: str
    admin_id: int = Field(alias="adminId")


class FaqDraftRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    question: str
    admin_id: int = Field(alias="adminId")


class InquiryDraftRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    category: str
    title: str
    content: str
    admin_id: int = Field(alias="adminId")
