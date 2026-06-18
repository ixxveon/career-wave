from dataclasses import dataclass

from admin.ai_metrics.client import AiMetricsOpenAIClient, get_ai_metrics_openai_client
from admin.ai_metrics.exception import AiMetricsErrorCode, AiMetricsException
from admin.ai_metrics.service.chunking_service import RagTextChunk


@dataclass(frozen=True)
class RagEmbeddingVector:
    values: list[float]


@dataclass(frozen=True)
class RagChunkEmbedding:
    chunk_index: int
    content: str
    vector: RagEmbeddingVector


@dataclass(frozen=True)
class EmbeddingResult:
    embeddings: list[RagChunkEmbedding]


class EmbeddingService:
    """Create embeddings for RAG text chunks."""

    def __init__(
        self,
        openai_client: AiMetricsOpenAIClient | None = None,
    ) -> None:
        self._openai_client = openai_client or get_ai_metrics_openai_client()

    async def create_embeddings(
        self,
        chunks: list[RagTextChunk],
    ) -> EmbeddingResult:
        if not chunks:
            return EmbeddingResult(embeddings=[])

        inputs = [chunk.content.strip() for chunk in chunks]
        if any(not content for content in inputs):
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.RAG_DOCUMENT_INDEXING_FAILED,
                detail={"reason": "empty_chunk_for_embedding"},
            )

        try:
            response = await self._openai_client.create_embeddings(inputs=inputs)

            embeddings = [
                RagChunkEmbedding(
                    chunk_index=chunk.index,
                    content=chunk.content,
                    vector=self._to_vector(item.embedding),
                )
                for chunk, item in zip(chunks, response.data, strict=True)
            ]
            return EmbeddingResult(embeddings=embeddings)
        except AiMetricsException as error:
            if error.error_code == AiMetricsErrorCode.OPENAI_API_ERROR:
                raise
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.RAG_DOCUMENT_INDEXING_FAILED,
                detail={
                    "reason": "embedding_mapping_failed",
                    "message": error.detail or str(error),
                },
            ) from error
        except Exception as error:
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.RAG_DOCUMENT_INDEXING_FAILED,
                detail={
                    "reason": "embedding_generation_failed",
                    "message": str(error),
                },
            ) from error

    def _to_vector(self, values: list[float]) -> RagEmbeddingVector:
        if not values:
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.RAG_DOCUMENT_INDEXING_FAILED,
                detail={"reason": "empty_embedding_vector"},
            )
        return RagEmbeddingVector(values=list(values))
