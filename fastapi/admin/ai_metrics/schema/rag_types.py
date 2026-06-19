from dataclasses import dataclass


@dataclass(frozen=True)
class RagEmbeddingVector:
    values: list[float]


@dataclass(frozen=True)
class RagChunkEmbedding:
    chunk_index: int
    content: str
    vector: RagEmbeddingVector
