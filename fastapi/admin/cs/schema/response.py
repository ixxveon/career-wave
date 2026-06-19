from pydantic import BaseModel


class CsAiDraftResponse(BaseModel):
    draft: str
