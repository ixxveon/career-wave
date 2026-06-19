from datetime import datetime, timezone
from uuid import UUID

import pytest

from admin.ai_metrics.client.vector_store_client import (
    VectorStoreClient,
    VectorStoreDeleteResult,
    VectorStoreDocument,
    VectorStoreUpsertResult,
)
from admin.ai_metrics.repository.rag_document_repository import RagDocumentRecord
from admin.ai_metrics.service.rag_index_delete_service import RagIndexDeleteService


class CustomVectorStoreAdapter(VectorStoreClient):
    def __init__(self) -> None:
        self.deleted_document_ids: list[int] = []

    async def upsert_document(
        self,
        document: VectorStoreDocument,
    ) -> VectorStoreUpsertResult:
        return VectorStoreUpsertResult(
            stored=True,
            rag_document_id=document.rag_document_id,
            chunk_count=len(document.chunk_embeddings),
        )

    async def delete_document(
        self,
        rag_document_id: int,
    ) -> VectorStoreDeleteResult:
        self.deleted_document_ids.append(rag_document_id)
        return VectorStoreDeleteResult(
            deleted=True,
            rag_document_id=rag_document_id,
        )


@pytest.mark.asyncio
async def test_rag_index_delete_service_accepts_custom_vector_store_adapter():
    class FakeRagDocumentRepository:
        def find_by_id(self, rag_document_id: int) -> RagDocumentRecord | None:
            return RagDocumentRecord(
                rag_document_id=rag_document_id,
                uploaded_by=1,
                file_uuid=UUID("77777777-7777-7777-7777-777777777777"),
                original_file_name="guide.txt",
                file_path="guide.txt",
                mime_type="text/plain",
                file_size=10,
                chunk_count=1,
                indexing_progress=100,
                status="COMPLETED",
                created_at=datetime(2026, 6, 18, 0, 0, tzinfo=timezone.utc),
                updated_at=datetime(2026, 6, 18, 0, 0, tzinfo=timezone.utc),
            )

    adapter = CustomVectorStoreAdapter()
    service = RagIndexDeleteService(
        rag_document_repository=FakeRagDocumentRepository(),
        vector_store_client=adapter,
    )

    response = await service.delete_index(42)

    assert response.deleted is True
    assert response.rag_document_id == 42
    assert adapter.deleted_document_ids == [42]
