from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import UUID
from unittest.mock import AsyncMock, Mock

import pytest

from admin.ai_metrics.client.vector_store_client import VectorStoreUpsertResult
from admin.ai_metrics.exception import AiMetricsErrorCode, AiMetricsException
from admin.ai_metrics.parser import ParsedRagDocument
from admin.ai_metrics.repository.rag_document_repository import RagDocumentRecord
from admin.ai_metrics.schema import RagIndexStartRequest
from admin.ai_metrics.service.rag_index_service import RagIndexService
from admin.ai_metrics.service import ChunkingResult, RagChunkEmbedding, RagEmbeddingVector, RagTextChunk
from admin.ai_metrics.task.rag_indexing_task import RagIndexingTask


class FakeRagDocumentRepository:
    def __init__(self, rag_document: RagDocumentRecord) -> None:
        self._rag_document = rag_document
        self.progress_updates: list[int] = []
        self.completed_chunk_count: int | None = None
        self.failed_ids: list[int] = []

    def find_by_id(self, rag_document_id: int) -> RagDocumentRecord | None:
        if rag_document_id != self._rag_document.rag_document_id:
            return None
        return self._rag_document

    def update_progress(self, rag_document_id: int, indexing_progress: int) -> RagDocumentRecord | None:
        self.progress_updates.append(indexing_progress)
        return self._rag_document

    def mark_completed(self, rag_document_id: int, chunk_count: int) -> RagDocumentRecord | None:
        self.completed_chunk_count = chunk_count
        return self._rag_document

    def mark_failed(self, rag_document_id: int) -> RagDocumentRecord | None:
        self.failed_ids.append(rag_document_id)
        return self._rag_document


class StatefulRagDocumentRepository(FakeRagDocumentRepository):
    def __init__(self, rag_document: RagDocumentRecord) -> None:
        super().__init__(rag_document)
        self.status_history: list[str] = [rag_document.status]

    def mark_indexing(self, rag_document_id: int) -> RagDocumentRecord | None:
        if self._rag_document.status == "INDEXING":
            return None

        self._rag_document = RagDocumentRecord(
            rag_document_id=self._rag_document.rag_document_id,
            uploaded_by=self._rag_document.uploaded_by,
            file_uuid=self._rag_document.file_uuid,
            original_file_name=self._rag_document.original_file_name,
            file_path=self._rag_document.file_path,
            mime_type=self._rag_document.mime_type,
            file_size=self._rag_document.file_size,
            chunk_count=self._rag_document.chunk_count,
            indexing_progress=0,
            status="INDEXING",
            created_at=self._rag_document.created_at,
            updated_at=self._rag_document.updated_at,
        )
        self.status_history.append(self._rag_document.status)
        return self._rag_document

    def update_progress(self, rag_document_id: int, indexing_progress: int) -> RagDocumentRecord | None:
        self.progress_updates.append(indexing_progress)
        self._rag_document = RagDocumentRecord(
            rag_document_id=self._rag_document.rag_document_id,
            uploaded_by=self._rag_document.uploaded_by,
            file_uuid=self._rag_document.file_uuid,
            original_file_name=self._rag_document.original_file_name,
            file_path=self._rag_document.file_path,
            mime_type=self._rag_document.mime_type,
            file_size=self._rag_document.file_size,
            chunk_count=self._rag_document.chunk_count,
            indexing_progress=indexing_progress,
            status=self._rag_document.status,
            created_at=self._rag_document.created_at,
            updated_at=self._rag_document.updated_at,
        )
        return self._rag_document

    def mark_completed(self, rag_document_id: int, chunk_count: int) -> RagDocumentRecord | None:
        self.completed_chunk_count = chunk_count
        self._rag_document = RagDocumentRecord(
            rag_document_id=self._rag_document.rag_document_id,
            uploaded_by=self._rag_document.uploaded_by,
            file_uuid=self._rag_document.file_uuid,
            original_file_name=self._rag_document.original_file_name,
            file_path=self._rag_document.file_path,
            mime_type=self._rag_document.mime_type,
            file_size=self._rag_document.file_size,
            chunk_count=chunk_count,
            indexing_progress=100,
            status="COMPLETED",
            created_at=self._rag_document.created_at,
            updated_at=self._rag_document.updated_at,
        )
        self.status_history.append(self._rag_document.status)
        return self._rag_document

    def mark_failed(self, rag_document_id: int) -> RagDocumentRecord | None:
        self.failed_ids.append(rag_document_id)
        self._rag_document = RagDocumentRecord(
            rag_document_id=self._rag_document.rag_document_id,
            uploaded_by=self._rag_document.uploaded_by,
            file_uuid=self._rag_document.file_uuid,
            original_file_name=self._rag_document.original_file_name,
            file_path=self._rag_document.file_path,
            mime_type=self._rag_document.mime_type,
            file_size=self._rag_document.file_size,
            chunk_count=self._rag_document.chunk_count,
            indexing_progress=self._rag_document.indexing_progress,
            status="FAILED",
            created_at=self._rag_document.created_at,
            updated_at=self._rag_document.updated_at,
        )
        self.status_history.append(self._rag_document.status)
        return self._rag_document


@pytest.mark.asyncio
async def test_rag_indexing_task_updates_progress_and_marks_completed():
    rag_document = RagDocumentRecord(
        rag_document_id=88,
        uploaded_by=1,
        file_uuid=UUID("88888888-8888-8888-8888-888888888888"),
        original_file_name="guide.txt",
        file_path="guide.txt",
        mime_type="text/plain",
        file_size=100,
        chunk_count=0,
        indexing_progress=0,
        status="INDEXING",
        created_at=datetime(2026, 6, 18, 0, 0, tzinfo=timezone.utc),
        updated_at=datetime(2026, 6, 18, 0, 0, tzinfo=timezone.utc),
    )
    repository = FakeRagDocumentRepository(rag_document)
    parser = Mock()
    parser.parse.return_value = ParsedRagDocument(
        rag_document_id=88,
        original_file_name="guide.txt",
        mime_type="text/plain",
        file_path="guide.txt",
        text="Career Wave\n\nAI Metrics",
    )
    chunking_service = Mock()
    chunking_service.chunk_text.return_value = ChunkingResult(
        chunks=[
            RagTextChunk(index=0, content="Career Wave"),
            RagTextChunk(index=1, content="AI Metrics"),
        ]
    )
    embedding_service = Mock()
    embedding_service.create_embeddings = AsyncMock(
        return_value=SimpleNamespace(
            embeddings=[
                RagChunkEmbedding(
                    chunk_index=0,
                    content="Career Wave",
                    vector=RagEmbeddingVector(values=[0.1, 0.2]),
                ),
                RagChunkEmbedding(
                    chunk_index=1,
                    content="AI Metrics",
                    vector=RagEmbeddingVector(values=[0.3, 0.4]),
                ),
            ]
        )
    )
    vector_store_client = Mock()
    vector_store_client.upsert_document = AsyncMock(
        return_value=VectorStoreUpsertResult(
            stored=True,
            rag_document_id=88,
            chunk_count=2,
        )
    )

    task = RagIndexingTask(
        rag_document_repository=repository,
        rag_document_parser=parser,
        chunking_service=chunking_service,
        embedding_service=embedding_service,
        vector_store_client=vector_store_client,
    )

    result = await task.run(88)

    assert result.rag_document_id == 88
    assert result.chunk_count == 2
    assert result.stored is True
    assert repository.progress_updates == [10, 30, 55, 80]
    assert repository.completed_chunk_count == 2
    assert repository.failed_ids == []


@pytest.mark.asyncio
async def test_rag_indexing_success_flow_moves_uploaded_to_completed():
    rag_document = RagDocumentRecord(
        rag_document_id=89,
        uploaded_by=1,
        file_uuid=UUID("99999999-9999-9999-9999-999999999999"),
        original_file_name="guide.txt",
        file_path="guide.txt",
        mime_type="text/plain",
        file_size=120,
        chunk_count=0,
        indexing_progress=0,
        status="UPLOADED",
        created_at=datetime(2026, 6, 18, 0, 0, tzinfo=timezone.utc),
        updated_at=datetime(2026, 6, 18, 0, 0, tzinfo=timezone.utc),
    )
    repository = StatefulRagDocumentRepository(rag_document)
    start_service = RagIndexService(repository)
    parser = Mock()
    parser.parse.return_value = ParsedRagDocument(
        rag_document_id=89,
        original_file_name="guide.txt",
        mime_type="text/plain",
        file_path="guide.txt",
        text="Career Wave\n\nAI Metrics",
    )
    chunking_service = Mock()
    chunking_service.chunk_text.return_value = ChunkingResult(
        chunks=[
            RagTextChunk(index=0, content="Career Wave"),
            RagTextChunk(index=1, content="AI Metrics"),
        ]
    )
    embedding_service = Mock()
    embedding_service.create_embeddings = AsyncMock(
        return_value=SimpleNamespace(
            embeddings=[
                RagChunkEmbedding(
                    chunk_index=0,
                    content="Career Wave",
                    vector=RagEmbeddingVector(values=[0.1, 0.2]),
                ),
                RagChunkEmbedding(
                    chunk_index=1,
                    content="AI Metrics",
                    vector=RagEmbeddingVector(values=[0.3, 0.4]),
                ),
            ]
        )
    )
    vector_store_client = Mock()
    vector_store_client.upsert_document = AsyncMock(
        return_value=VectorStoreUpsertResult(
            stored=True,
            rag_document_id=89,
            chunk_count=2,
        )
    )
    task = RagIndexingTask(
        rag_document_repository=repository,
        rag_document_parser=parser,
        chunking_service=chunking_service,
        embedding_service=embedding_service,
        vector_store_client=vector_store_client,
    )

    start_response = start_service.start_indexing(
        RagIndexStartRequest(
            ragDocumentId=89,
            fileUuid=UUID("99999999-9999-9999-9999-999999999999"),
            originalFileName="guide.txt",
            filePath="guide.txt",
            mimeType="text/plain",
            fileSize=120,
        )
    )
    result = await task.run(89)

    assert start_response.accepted is True
    assert start_response.rag_document_id == 89
    assert start_response.status.value == "INDEXING"
    assert result.rag_document_id == 89
    assert result.chunk_count == 2
    assert result.stored is True
    assert repository.status_history == ["UPLOADED", "INDEXING", "COMPLETED"]
    assert repository.progress_updates == [10, 30, 55, 80]
    assert repository.completed_chunk_count == 2
    assert repository.find_by_id(89).indexing_progress == 100


@pytest.mark.asyncio
async def test_rag_indexing_failure_flow_moves_indexing_to_failed():
    rag_document = RagDocumentRecord(
        rag_document_id=90,
        uploaded_by=1,
        file_uuid=UUID("aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb"),
        original_file_name="guide.txt",
        file_path="guide.txt",
        mime_type="text/plain",
        file_size=120,
        chunk_count=0,
        indexing_progress=0,
        status="INDEXING",
        created_at=datetime(2026, 6, 18, 0, 0, tzinfo=timezone.utc),
        updated_at=datetime(2026, 6, 18, 0, 0, tzinfo=timezone.utc),
    )
    repository = StatefulRagDocumentRepository(rag_document)
    parser = Mock()
    parser.parse.return_value = ParsedRagDocument(
        rag_document_id=90,
        original_file_name="guide.txt",
        mime_type="text/plain",
        file_path="guide.txt",
        text="Career Wave\n\nAI Metrics",
    )
    chunking_service = Mock()
    chunking_service.chunk_text.return_value = ChunkingResult(
        chunks=[
            RagTextChunk(index=0, content="Career Wave"),
            RagTextChunk(index=1, content="AI Metrics"),
        ]
    )
    embedding_service = Mock()
    embedding_service.create_embeddings = AsyncMock(
        side_effect=AiMetricsException(
            error_code=AiMetricsErrorCode.RAG_DOCUMENT_INDEXING_FAILED,
            detail={"reason": "embedding_generation_failed"},
        )
    )
    vector_store_client = Mock()
    vector_store_client.upsert_document = AsyncMock()

    task = RagIndexingTask(
        rag_document_repository=repository,
        rag_document_parser=parser,
        chunking_service=chunking_service,
        embedding_service=embedding_service,
        vector_store_client=vector_store_client,
    )

    with pytest.raises(AiMetricsException) as exc_info:
        await task.run(90)

    assert exc_info.value.error_code == AiMetricsErrorCode.RAG_DOCUMENT_INDEXING_FAILED
    assert repository.status_history == ["INDEXING", "FAILED"]
    assert repository.progress_updates == [10, 30, 55]
    assert repository.failed_ids == [90]
    vector_store_client.upsert_document.assert_not_called()


@pytest.mark.asyncio
async def test_rag_indexing_completed_state_sets_progress_to_one_hundred():
    rag_document = RagDocumentRecord(
        rag_document_id=91,
        uploaded_by=1,
        file_uuid=UUID("12121212-3434-5656-7878-909090909090"),
        original_file_name="guide.txt",
        file_path="guide.txt",
        mime_type="text/plain",
        file_size=120,
        chunk_count=0,
        indexing_progress=0,
        status="INDEXING",
        created_at=datetime(2026, 6, 18, 0, 0, tzinfo=timezone.utc),
        updated_at=datetime(2026, 6, 18, 0, 0, tzinfo=timezone.utc),
    )
    repository = StatefulRagDocumentRepository(rag_document)
    parser = Mock()
    parser.parse.return_value = ParsedRagDocument(
        rag_document_id=91,
        original_file_name="guide.txt",
        mime_type="text/plain",
        file_path="guide.txt",
        text="Career Wave\n\nAI Metrics",
    )
    chunking_service = Mock()
    chunking_service.chunk_text.return_value = ChunkingResult(
        chunks=[
            RagTextChunk(index=0, content="Career Wave"),
            RagTextChunk(index=1, content="AI Metrics"),
        ]
    )
    embedding_service = Mock()
    embedding_service.create_embeddings = AsyncMock(
        return_value=SimpleNamespace(
            embeddings=[
                RagChunkEmbedding(
                    chunk_index=0,
                    content="Career Wave",
                    vector=RagEmbeddingVector(values=[0.1, 0.2]),
                ),
                RagChunkEmbedding(
                    chunk_index=1,
                    content="AI Metrics",
                    vector=RagEmbeddingVector(values=[0.3, 0.4]),
                ),
            ]
        )
    )
    vector_store_client = Mock()
    vector_store_client.upsert_document = AsyncMock(
        return_value=VectorStoreUpsertResult(
            stored=True,
            rag_document_id=91,
            chunk_count=2,
        )
    )

    task = RagIndexingTask(
        rag_document_repository=repository,
        rag_document_parser=parser,
        chunking_service=chunking_service,
        embedding_service=embedding_service,
        vector_store_client=vector_store_client,
    )

    await task.run(91)

    completed_document = repository.find_by_id(91)
    assert completed_document.status == "COMPLETED"
    assert completed_document.indexing_progress == 100


@pytest.mark.asyncio
async def test_rag_indexing_prevents_duplicate_execution_when_already_in_progress():
    rag_document = RagDocumentRecord(
        rag_document_id=92,
        uploaded_by=1,
        file_uuid=UUID("23232323-4545-6767-8989-101010101010"),
        original_file_name="guide.txt",
        file_path="guide.txt",
        mime_type="text/plain",
        file_size=120,
        chunk_count=0,
        indexing_progress=30,
        status="INDEXING",
        created_at=datetime(2026, 6, 18, 0, 0, tzinfo=timezone.utc),
        updated_at=datetime(2026, 6, 18, 0, 0, tzinfo=timezone.utc),
    )
    repository = StatefulRagDocumentRepository(rag_document)
    parser = Mock()
    chunking_service = Mock()
    embedding_service = Mock()
    vector_store_client = Mock()

    task = RagIndexingTask(
        rag_document_repository=repository,
        rag_document_parser=parser,
        chunking_service=chunking_service,
        embedding_service=embedding_service,
        vector_store_client=vector_store_client,
    )

    with pytest.raises(AiMetricsException) as exc_info:
        await task.run(92)

    assert exc_info.value.error_code == AiMetricsErrorCode.RAG_DOCUMENT_ALREADY_INDEXING
    assert exc_info.value.detail == {
        "ragDocumentId": 92,
        "indexingProgress": 30,
    }
    assert repository.progress_updates == []
    assert repository.failed_ids == []
    parser.parse.assert_not_called()


@pytest.mark.asyncio
async def test_rag_indexing_handles_external_system_error_and_marks_failed():
    rag_document = RagDocumentRecord(
        rag_document_id=93,
        uploaded_by=1,
        file_uuid=UUID("34343434-5656-7878-9090-111111111111"),
        original_file_name="guide.txt",
        file_path="guide.txt",
        mime_type="text/plain",
        file_size=120,
        chunk_count=0,
        indexing_progress=0,
        status="INDEXING",
        created_at=datetime(2026, 6, 18, 0, 0, tzinfo=timezone.utc),
        updated_at=datetime(2026, 6, 18, 0, 0, tzinfo=timezone.utc),
    )
    repository = StatefulRagDocumentRepository(rag_document)
    parser = Mock()
    parser.parse.return_value = ParsedRagDocument(
        rag_document_id=93,
        original_file_name="guide.txt",
        mime_type="text/plain",
        file_path="guide.txt",
        text="Career Wave\n\nAI Metrics",
    )
    chunking_service = Mock()
    chunking_service.chunk_text.return_value = ChunkingResult(
        chunks=[
            RagTextChunk(index=0, content="Career Wave"),
            RagTextChunk(index=1, content="AI Metrics"),
        ]
    )
    embedding_service = Mock()
    embedding_service.create_embeddings = AsyncMock(
        side_effect=AiMetricsException(
            error_code=AiMetricsErrorCode.OPENAI_API_ERROR,
            detail={"reason": "RateLimitError"},
        )
    )
    vector_store_client = Mock()
    vector_store_client.upsert_document = AsyncMock()

    task = RagIndexingTask(
        rag_document_repository=repository,
        rag_document_parser=parser,
        chunking_service=chunking_service,
        embedding_service=embedding_service,
        vector_store_client=vector_store_client,
    )

    with pytest.raises(AiMetricsException) as exc_info:
        await task.run(93)

    assert exc_info.value.error_code == AiMetricsErrorCode.OPENAI_API_ERROR
    assert repository.status_history == ["INDEXING", "FAILED"]
    assert repository.progress_updates == [10, 30, 55]
    assert repository.failed_ids == [93]
    vector_store_client.upsert_document.assert_not_called()
