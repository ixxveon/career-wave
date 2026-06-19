from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest

from admin.ai_metrics.service.chunking_service import RagTextChunk
from admin.ai_metrics.service.embedding_service import EmbeddingService


@pytest.mark.asyncio
async def test_embedding_service_maps_openai_embeddings_to_chunk_vectors():
    openai_client = Mock()
    openai_client.create_embeddings = AsyncMock(
        return_value=SimpleNamespace(
            data=[
                SimpleNamespace(embedding=[0.1, 0.2, 0.3]),
                SimpleNamespace(embedding=[0.4, 0.5, 0.6]),
            ]
        )
    )

    service = EmbeddingService(openai_client=openai_client)
    chunks = [
        RagTextChunk(index=0, content="Career Wave overview"),
        RagTextChunk(index=1, content="AI Metrics details"),
    ]

    result = await service.create_embeddings(chunks)

    assert len(result.embeddings) == 2
    assert result.embeddings[0].chunk_index == 0
    assert result.embeddings[0].content == "Career Wave overview"
    assert result.embeddings[0].vector.values == [0.1, 0.2, 0.3]
    assert result.embeddings[1].chunk_index == 1
    assert result.embeddings[1].content == "AI Metrics details"
    assert result.embeddings[1].vector.values == [0.4, 0.5, 0.6]

    openai_client.create_embeddings.assert_awaited_once_with(
        inputs=["Career Wave overview", "AI Metrics details"]
    )
