from admin.ai_metrics.client import VectorStoreClient
from admin.ai_metrics.exception import AiMetricsErrorCode, AiMetricsException
from admin.ai_metrics.repository import RagDocumentRepository
from admin.ai_metrics.schema import RagIndexDeleteResponse


class RagIndexDeleteService:
    def __init__(
        self,
        rag_document_repository: RagDocumentRepository,
        vector_store_client: VectorStoreClient,
    ) -> None:
        self._rag_document_repository = rag_document_repository
        self._vector_store_client = vector_store_client

    async def delete_index(self, rag_document_id: int) -> RagIndexDeleteResponse:
        rag_document = self._rag_document_repository.find_by_id(rag_document_id)
        if rag_document is None:
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.RAG_DOCUMENT_NOT_FOUND,
                detail={"ragDocumentId": rag_document_id},
            )

        result = await self._vector_store_client.delete_document(rag_document_id)
        return RagIndexDeleteResponse(
            deleted=result.deleted,
            ragDocumentId=result.rag_document_id,
        )
