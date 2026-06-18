from dataclasses import dataclass

from admin.ai_metrics.client import VectorStoreClient, VectorStoreDocument
from admin.ai_metrics.exception import AiMetricsErrorCode, AiMetricsException
from admin.ai_metrics.parser import RagDocumentParser
from admin.ai_metrics.repository import RagDocumentRepository
from admin.ai_metrics.schema import RagDocumentStatusType
from admin.ai_metrics.service import ChunkingService, EmbeddingService


@dataclass(frozen=True)
class RagIndexingPipelineResult:
    rag_document_id: int
    chunk_count: int
    stored: bool


class RagIndexingTask:
    """Background task entry point for RAG document indexing."""

    def __init__(
        self,
        rag_document_repository: RagDocumentRepository,
        rag_document_parser: RagDocumentParser,
        chunking_service: ChunkingService,
        embedding_service: EmbeddingService,
        vector_store_client: VectorStoreClient,
    ) -> None:
        self._rag_document_repository = rag_document_repository
        self._rag_document_parser = rag_document_parser
        self._chunking_service = chunking_service
        self._embedding_service = embedding_service
        self._vector_store_client = vector_store_client

    async def run(self, rag_document_id: int) -> RagIndexingPipelineResult:
        try:
            rag_document = self._load_indexing_document(rag_document_id)
            self._update_progress(rag_document_id, 10)

            parsed_document = self._rag_document_parser.parse(rag_document)
            self._update_progress(rag_document_id, 30)

            chunking_result = self._chunking_service.chunk_text(parsed_document.text)
            self._update_progress(rag_document_id, 55)

            embedding_result = await self._embedding_service.create_embeddings(chunking_result.chunks)
            self._update_progress(rag_document_id, 80)

            upsert_result = await self._vector_store_client.upsert_document(
                VectorStoreDocument(
                    rag_document_id=parsed_document.rag_document_id,
                    chunk_embeddings=embedding_result.embeddings,
                )
            )
            self._mark_completed(
                rag_document_id=rag_document_id,
                chunk_count=upsert_result.chunk_count,
            )
            return RagIndexingPipelineResult(
                rag_document_id=upsert_result.rag_document_id,
                chunk_count=upsert_result.chunk_count,
                stored=upsert_result.stored,
            )
        except AiMetricsException as error:
            if error.error_code in {
                AiMetricsErrorCode.RAG_DOCUMENT_ALREADY_INDEXING,
                AiMetricsErrorCode.RAG_DOCUMENT_NOT_FOUND,
            }:
                raise
            try:
                self._mark_failed(rag_document_id)
            except AiMetricsException:
                raise error
            raise
        except Exception:
            self._mark_failed(rag_document_id)
            raise

    def _load_indexing_document(self, rag_document_id: int):
        rag_document = self._rag_document_repository.find_by_id(rag_document_id)
        if rag_document is None:
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.RAG_DOCUMENT_NOT_FOUND,
                detail={"ragDocumentId": rag_document_id},
            )

        if (
            rag_document.status == RagDocumentStatusType.INDEXING.value
            and rag_document.indexing_progress > 0
        ):
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.RAG_DOCUMENT_ALREADY_INDEXING,
                detail={
                    "ragDocumentId": rag_document_id,
                    "indexingProgress": rag_document.indexing_progress,
                },
            )

        if rag_document.status != RagDocumentStatusType.INDEXING.value:
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.RAG_DOCUMENT_INDEXING_FAILED,
                detail={
                    "ragDocumentId": rag_document_id,
                    "reason": "invalid_worker_state",
                    "status": rag_document.status,
                },
            )

        return rag_document

    def _update_progress(self, rag_document_id: int, indexing_progress: int) -> None:
        updated_document = self._rag_document_repository.update_progress(
            rag_document_id=rag_document_id,
            indexing_progress=indexing_progress,
        )
        if updated_document is None:
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.RAG_DOCUMENT_INDEXING_FAILED,
                detail={
                    "ragDocumentId": rag_document_id,
                    "reason": "progress_update_failed",
                    "indexingProgress": indexing_progress,
                },
            )

    def _mark_completed(self, rag_document_id: int, chunk_count: int) -> None:
        updated_document = self._rag_document_repository.mark_completed(
            rag_document_id=rag_document_id,
            chunk_count=chunk_count,
        )
        if updated_document is None:
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.RAG_DOCUMENT_INDEXING_FAILED,
                detail={
                    "ragDocumentId": rag_document_id,
                    "reason": "complete_state_update_failed",
                    "chunkCount": chunk_count,
                },
            )

    def _mark_failed(self, rag_document_id: int) -> None:
        updated_document = self._rag_document_repository.mark_failed(rag_document_id)
        if updated_document is None:
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.RAG_DOCUMENT_INDEXING_FAILED,
                detail={
                    "ragDocumentId": rag_document_id,
                    "reason": "failed_state_update_failed",
                },
            )
