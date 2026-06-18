from dataclasses import dataclass
import re

from admin.ai_metrics.config.settings import AiMetricsSettings, get_ai_metrics_settings
from admin.ai_metrics.exception import AiMetricsErrorCode, AiMetricsException


@dataclass(frozen=True)
class RagTextChunk:
    index: int
    content: str


@dataclass(frozen=True)
class ChunkingResult:
    chunks: list[RagTextChunk]

    def __post_init__(self) -> None:
        for expected_index, chunk in enumerate(self.chunks):
            if chunk.index != expected_index:
                raise AiMetricsException(
                    error_code=AiMetricsErrorCode.RAG_DOCUMENT_INDEXING_FAILED,
                    detail={
                        "reason": "invalid_chunk_index",
                        "expectedIndex": expected_index,
                        "actualIndex": chunk.index,
                    },
                )

            if not chunk.content.strip():
                raise AiMetricsException(
                    error_code=AiMetricsErrorCode.RAG_DOCUMENT_INDEXING_FAILED,
                    detail={
                        "reason": "empty_chunk_content",
                        "chunkIndex": chunk.index,
                    },
                )

    @property
    def chunk_count(self) -> int:
        return len(self.chunks)


class ChunkingService:
    """Split parsed RAG document text into chunk units."""

    def __init__(self, settings: AiMetricsSettings | None = None) -> None:
        resolved_settings = settings or get_ai_metrics_settings()
        self._target_chars = resolved_settings.rag_chunk_target_chars
        self._max_chars = resolved_settings.rag_chunk_max_chars
        self._validate_chunk_settings()

    def chunk_text(self, text: str) -> ChunkingResult:
        normalized_text = self._normalize_text(text)
        if not normalized_text:
            return ChunkingResult(chunks=[])

        chunks: list[RagTextChunk] = []
        current_parts: list[str] = []
        current_length = 0

        for segment in self._iter_segments(normalized_text):
            segment = segment.strip()
            if not segment:
                continue

            segment_length = len(segment)
            projected_length = current_length + segment_length + (2 if current_parts else 0)

            if current_parts and projected_length > self._target_chars:
                chunks.append(
                    RagTextChunk(
                        index=len(chunks),
                        content="\n\n".join(current_parts).strip(),
                    )
                )
                current_parts = [segment]
                current_length = segment_length
                continue

            current_parts.append(segment)
            current_length = projected_length

        if current_parts:
            chunks.append(
                RagTextChunk(
                    index=len(chunks),
                    content="\n\n".join(current_parts).strip(),
                )
            )

        return ChunkingResult(chunks=chunks)

    def _normalize_text(self, text: str) -> str:
        normalized = text.replace("\r\n", "\n").replace("\r", "\n").strip()
        normalized = re.sub(r"\n{3,}", "\n\n", normalized)
        return normalized

    def _iter_segments(self, text: str) -> list[str]:
        segments: list[str] = []
        for paragraph in re.split(r"\n\s*\n", text):
            cleaned_paragraph = paragraph.strip()
            if not cleaned_paragraph:
                continue

            if len(cleaned_paragraph) <= self._max_chars:
                segments.append(cleaned_paragraph)
                continue

            segments.extend(self._split_long_paragraph(cleaned_paragraph))

        return segments

    def _split_long_paragraph(self, paragraph: str) -> list[str]:
        sentences = re.split(r"(?<=[.!?])\s+", paragraph)
        segments: list[str] = []
        current = ""

        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue

            candidate = sentence if not current else f"{current} {sentence}"
            if len(candidate) <= self._max_chars:
                current = candidate
                continue

            if current:
                segments.append(current)

            if len(sentence) <= self._max_chars:
                current = sentence
                continue

            segments.extend(self._split_oversized_sentence(sentence))
            current = ""

        if current:
            segments.append(current)

        return segments

    def _split_oversized_sentence(self, sentence: str) -> list[str]:
        words = sentence.split()
        if not words:
            return []

        segments: list[str] = []
        current = words[0]

        for word in words[1:]:
            candidate = f"{current} {word}"
            if len(candidate) <= self._max_chars:
                current = candidate
                continue

            segments.append(current)
            current = word

        if current:
            segments.append(current)

        return segments

    def _validate_chunk_settings(self) -> None:
        if self._target_chars <= 0:
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.RAG_DOCUMENT_INDEXING_FAILED,
                detail={
                    "reason": "invalid_chunk_target_chars",
                    "ragChunkTargetChars": self._target_chars,
                },
            )

        if self._max_chars <= 0:
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.RAG_DOCUMENT_INDEXING_FAILED,
                detail={
                    "reason": "invalid_chunk_max_chars",
                    "ragChunkMaxChars": self._max_chars,
                },
            )

        if self._target_chars > self._max_chars:
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.RAG_DOCUMENT_INDEXING_FAILED,
                detail={
                    "reason": "chunk_target_exceeds_max",
                    "ragChunkTargetChars": self._target_chars,
                    "ragChunkMaxChars": self._max_chars,
                },
            )
