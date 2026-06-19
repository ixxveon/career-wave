import asyncio
from abc import ABC, abstractmethod
from dataclasses import dataclass
import json
from pathlib import Path

from admin.ai_metrics.config.settings import AiMetricsSettings, get_ai_metrics_settings
from admin.ai_metrics.exception import AiMetricsErrorCode, AiMetricsException
from admin.ai_metrics.schema import RagChunkEmbedding


@dataclass(frozen=True)
class VectorStoreDocument:
    rag_document_id: int
    chunk_embeddings: list[RagChunkEmbedding]


@dataclass(frozen=True)
class VectorStoreUpsertResult:
    stored: bool
    rag_document_id: int
    chunk_count: int


@dataclass(frozen=True)
class VectorStoreDeleteResult:
    deleted: bool
    rag_document_id: int


class VectorStoreClient(ABC):
    """Vector store client entry point for RAG index persistence."""

    @abstractmethod
    async def upsert_document(
        self,
        document: VectorStoreDocument,
    ) -> VectorStoreUpsertResult:
        """Store chunk embeddings for a single RAG document."""

    @abstractmethod
    async def delete_document(
        self,
        rag_document_id: int,
    ) -> VectorStoreDeleteResult:
        """Delete stored vectors for a single RAG document."""


class MockVectorStoreClient(VectorStoreClient):
    def __init__(self, settings: AiMetricsSettings | None = None) -> None:
        resolved_settings = settings or get_ai_metrics_settings()
        self._base_path = Path(resolved_settings.vector_store_base_path).resolve()
        self._collection = resolved_settings.vector_store_collection

    async def upsert_document(
        self,
        document: VectorStoreDocument,
    ) -> VectorStoreUpsertResult:
        try:
            collection_path = self._base_path / self._collection
            await asyncio.to_thread(
                collection_path.mkdir,
                parents=True,
                exist_ok=True,
            )

            payload = {
                "ragDocumentId": document.rag_document_id,
                "chunkCount": len(document.chunk_embeddings),
                "chunks": [
                    {
                        "chunkIndex": chunk.chunk_index,
                        "content": chunk.content,
                        "vector": chunk.vector.values,
                    }
                    for chunk in document.chunk_embeddings
                ],
            }

            target_path = collection_path / f"{document.rag_document_id}.json"
            serialized_payload = json.dumps(payload, ensure_ascii=False, indent=2)
            await asyncio.to_thread(
                target_path.write_text,
                serialized_payload,
                encoding="utf-8",
            )

            return VectorStoreUpsertResult(
                stored=True,
                rag_document_id=document.rag_document_id,
                chunk_count=len(document.chunk_embeddings),
            )
        except OSError as error:
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.RAG_DOCUMENT_INDEXING_FAILED,
                detail={
                    "reason": "vector_store_upsert_failed",
                    "ragDocumentId": document.rag_document_id,
                    "message": str(error),
                },
            ) from error

    async def delete_document(
        self,
        rag_document_id: int,
    ) -> VectorStoreDeleteResult:
        try:
            collection_path = self._base_path / self._collection
            target_path = collection_path / f"{rag_document_id}.json"

            deleted = False
            if await asyncio.to_thread(target_path.exists):
                await asyncio.to_thread(target_path.unlink)
                deleted = True

            return VectorStoreDeleteResult(
                deleted=deleted,
                rag_document_id=rag_document_id,
            )
        except OSError as error:
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.RAG_DOCUMENT_DELETE_FAILED,
                detail={
                    "reason": "vector_store_delete_failed",
                    "ragDocumentId": rag_document_id,
                    "message": str(error),
                },
            ) from error
