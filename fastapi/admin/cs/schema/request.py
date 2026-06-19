from pydantic import BaseModel


class NoticeDraftRequest(BaseModel):
    category: str
    title: str


class FaqDraftRequest(BaseModel):
    question: str


class InquiryDraftRequest(BaseModel):
    category: str
    title: str
    content: str
