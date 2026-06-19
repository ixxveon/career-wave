from admin.ai_metrics.exception import AiMetricsErrorCode, AiMetricsException
from admin.ai_metrics.repository import RagDocumentRepository
from admin.ai_metrics.schema import (
    RagDocumentStatusType,
    RagIndexStartRequest,
    RagIndexStartResponse,
)


class RagIndexService:
    def __init__(self, rag_document_repository: RagDocumentRepository) -> None:
        self._rag_document_repository = rag_document_repository

    def start_indexing(self, request: RagIndexStartRequest) -> RagIndexStartResponse:
        rag_document = self._rag_document_repository.find_by_id(request.rag_document_id)
        if rag_document is None:
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.RAG_DOCUMENT_NOT_FOUND,
                detail={"ragDocumentId": request.rag_document_id},
            )

        if rag_document.status == RagDocumentStatusType.INDEXING.value:
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.RAG_DOCUMENT_ALREADY_INDEXING,
                detail={"ragDocumentId": request.rag_document_id},
            )

        updated_document = self._accept_indexing(request.rag_document_id)
        return RagIndexStartResponse(
            accepted=True,
            ragDocumentId=updated_document.rag_document_id,
            status=RagDocumentStatusType.INDEXING,
        )

    def _accept_indexing(self, rag_document_id: int):
        updated_document = self._rag_document_repository.mark_indexing(rag_document_id)
        if updated_document is None:
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.RAG_DOCUMENT_INDEXING_FAILED,
                detail={"ragDocumentId": rag_document_id},
            )
        if updated_document.indexing_progress != 0:
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.RAG_DOCUMENT_INDEXING_FAILED,
                detail={
                    "ragDocumentId": rag_document_id,
                    "reason": "indexing_progress_not_initialized",
                    "indexingProgress": updated_document.indexing_progress,
                },
            )
        return updated_document
