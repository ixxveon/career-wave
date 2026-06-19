from admin.ai_metrics.client import VectorStoreClient
from admin.ai_metrics.repository import RagDocumentRepository
from admin.ai_metrics.schema import RagIndexDeleteResponse
from admin.ai_metrics.task import RagIndexDeleteTask


class RagIndexDeleteService:
    def __init__(
        self,
        rag_document_repository: RagDocumentRepository,
        vector_store_client: VectorStoreClient,
    ) -> None:
        self._rag_index_delete_task = RagIndexDeleteTask(
            rag_document_repository=rag_document_repository,
            vector_store_client=vector_store_client,
        )

    async def delete_index(self, rag_document_id: int) -> RagIndexDeleteResponse:
        return await self._rag_index_delete_task.run(rag_document_id)
