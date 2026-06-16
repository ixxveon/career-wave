from pydantic import BaseModel


class TriggerAcceptedResponse(BaseModel):
    accepted: bool = True
    documentId: str
