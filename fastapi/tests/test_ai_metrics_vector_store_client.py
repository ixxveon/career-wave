import json
from types import SimpleNamespace

import pytest

from admin.ai_metrics.client.vector_store_client import MockVectorStoreClient, VectorStoreDocument
from admin.ai_metrics.service.embedding_service import RagChunkEmbedding, RagEmbeddingVector


@pytest.mark.asyncio
async def test_mock_vector_store_client_upserts_and_deletes_document(tmp_path):
    settings = SimpleNamespace(
        vector_store_base_path=str(tmp_path),
        vector_store_collection="ai-metrics-test",
    )
    client = MockVectorStoreClient(settings=settings)
    document = VectorStoreDocument(
        rag_document_id=55,
        chunk_embeddings=[
            RagChunkEmbedding(
                chunk_index=0,
                content="Career Wave overview",
                vector=RagEmbeddingVector(values=[0.1, 0.2, 0.3]),
            ),
            RagChunkEmbedding(
                chunk_index=1,
                content="AI Metrics details",
                vector=RagEmbeddingVector(values=[0.4, 0.5, 0.6]),
            ),
        ],
    )

    upsert_result = await client.upsert_document(document)

    assert upsert_result.stored is True
    assert upsert_result.rag_document_id == 55
    assert upsert_result.chunk_count == 2

    stored_file = tmp_path / "ai-metrics-test" / "55.json"
    assert stored_file.is_file()
    assert json.loads(stored_file.read_text(encoding="utf-8")) == {
        "ragDocumentId": 55,
        "chunkCount": 2,
        "chunks": [
            {
                "chunkIndex": 0,
                "content": "Career Wave overview",
                "vector": [0.1, 0.2, 0.3],
            },
            {
                "chunkIndex": 1,
                "content": "AI Metrics details",
                "vector": [0.4, 0.5, 0.6],
            },
        ],
    }

    delete_result = await client.delete_document(55)

    assert delete_result.deleted is True
    assert delete_result.rag_document_id == 55
    assert stored_file.exists() is False
