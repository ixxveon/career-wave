from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import UUID

from admin.ai_metrics.parser.rag_document_parser import RagDocumentParser
from admin.ai_metrics.repository.rag_document_repository import RagDocumentRecord


def test_rag_document_parser_parses_plain_text_document(tmp_path):
    storage_dir = tmp_path / "rag-storage"
    storage_dir.mkdir()
    document_path = storage_dir / "guide.txt"
    document_path.write_text("Career Wave\nAI Metrics RAG", encoding="utf-8")

    parser = RagDocumentParser()
    rag_document = RagDocumentRecord(
        rag_document_id=10,
        uploaded_by=1,
        file_uuid=UUID("66666666-6666-6666-6666-666666666666"),
        original_file_name="guide.txt",
        file_path="guide.txt",
        mime_type="text/plain",
        file_size=document_path.stat().st_size,
        chunk_count=0,
        indexing_progress=0,
        status="UPLOADED",
        created_at=datetime(2026, 6, 18, 0, 0, tzinfo=timezone.utc),
        updated_at=datetime(2026, 6, 18, 0, 0, tzinfo=timezone.utc),
    )
    settings = SimpleNamespace(
        file_storage_provider="local",
        file_storage_base_path=str(storage_dir),
    )

    from unittest.mock import patch

    with patch(
        "admin.ai_metrics.parser.rag_document_parser.get_ai_metrics_settings",
        return_value=settings,
    ):
        parsed = parser.parse(rag_document)

    assert parsed.rag_document_id == 10
    assert parsed.original_file_name == "guide.txt"
    assert parsed.mime_type == "text/plain"
    assert parsed.file_path == "guide.txt"
    assert parsed.text == "Career Wave\nAI Metrics RAG"
