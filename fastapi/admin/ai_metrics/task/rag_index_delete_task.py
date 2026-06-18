from dataclasses import dataclass

from admin.ai_metrics.client import VectorStoreClient
from admin.ai_metrics.exception import AiMetricsErrorCode, AiMetricsException
from admin.ai_metrics.repository import RagDocumentRepository
from admin.ai_metrics.schema import RagIndexDeleteResponse


@dataclass(frozen=True)
class RagIndexDeleteTarget:
    rag_document_id: int


class RagIndexDeleteTask:
    """Task entry point for RAG index delete flow."""

    def __init__(
        self,
        rag_document_repository: RagDocumentRepository,
        vector_store_client: VectorStoreClient,
    ) -> None:
        self._rag_document_repository = rag_document_repository
        self._vector_store_client = vector_store_client

    def load_delete_target(self, rag_document_id: int) -> RagIndexDeleteTarget:
        rag_document = self._rag_document_repository.find_by_id(rag_document_id)
        if rag_document is None:
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.RAG_DOCUMENT_NOT_FOUND,
                detail={"ragDocumentId": rag_document_id},
            )

        return RagIndexDeleteTarget(
            rag_document_id=rag_document.rag_document_id,
        )

    async def run(self, rag_document_id: int) -> RagIndexDeleteResponse:
        try:
            delete_target = self.load_delete_target(rag_document_id)
            result = await self._vector_store_client.delete_document(delete_target.rag_document_id)
            await self._cleanup_resources(delete_target)
            return RagIndexDeleteResponse(
                deleted=result.deleted,
                ragDocumentId=result.rag_document_id,
            )
        except AiMetricsException as error:
            if error.error_code in {
                AiMetricsErrorCode.RAG_DOCUMENT_NOT_FOUND,
                AiMetricsErrorCode.RAG_DOCUMENT_DELETE_FAILED,
            }:
                raise
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.RAG_DOCUMENT_DELETE_FAILED,
                detail={
                    "ragDocumentId": rag_document_id,
                    "reason": "delete_task_failed",
                    "message": error.message,
                },
            ) from error
        except Exception as error:
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.RAG_DOCUMENT_DELETE_FAILED,
                detail={
                    "ragDocumentId": rag_document_id,
                    "reason": "delete_task_failed",
                    "message": str(error),
                },
            ) from error

    async def _cleanup_resources(self, delete_target: RagIndexDeleteTarget) -> None:
        """Hook point for follow-up cleanup after vector index deletion."""
        _ = delete_target
