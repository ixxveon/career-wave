from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import BigInteger, Column, DateTime, Integer, MetaData, String, Table, Text, select, update
from sqlalchemy.dialects.postgresql import UUID as PostgreSqlUUID
from sqlalchemy.orm import Session


metadata = MetaData()

rag_documents_table = Table(
    "rag_documents",
    metadata,
    Column("rag_document_id", BigInteger, primary_key=True),
    Column("uploaded_by", BigInteger, nullable=False),
    Column("file_uuid", PostgreSqlUUID(as_uuid=True), nullable=False),
    Column("original_file_name", String(255), nullable=False),
    Column("file_path", Text, nullable=False),
    Column("mime_type", String(100), nullable=True),
    Column("file_size", BigInteger, nullable=True),
    Column("chunk_count", Integer, nullable=False),
    Column("indexing_progress", Integer, nullable=False),
    Column("status", String(20), nullable=False),
    Column("created_at", DateTime(timezone=True), nullable=False),
    Column("updated_at", DateTime(timezone=True), nullable=False),
)


@dataclass(frozen=True)
class RagDocumentRecord:
    rag_document_id: int
    uploaded_by: int
    file_uuid: UUID
    original_file_name: str
    file_path: str
    mime_type: str | None
    file_size: int | None
    chunk_count: int
    indexing_progress: int
    status: str
    created_at: datetime
    updated_at: datetime


class RagDocumentRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def find_by_id(self, rag_document_id: int) -> RagDocumentRecord | None:
        statement = select(rag_documents_table).where(
            rag_documents_table.c.rag_document_id == rag_document_id
        )
        row = self._session.execute(statement).mappings().first()
        return self._to_record(row) if row else None

    def find_status_by_id(self, rag_document_id: int) -> str | None:
        statement = select(rag_documents_table.c.status).where(
            rag_documents_table.c.rag_document_id == rag_document_id
        )
        return self._session.execute(statement).scalar_one_or_none()

    def exists_by_status(self, status: str) -> bool:
        statement = select(rag_documents_table.c.rag_document_id).where(
            rag_documents_table.c.status == status
        )
        return self._session.execute(statement).first() is not None

    def mark_indexing(self, rag_document_id: int) -> RagDocumentRecord | None:
        return self.update_indexing_state(
            rag_document_id=rag_document_id,
            status="INDEXING",
            indexing_progress=0,
            chunk_count=None,
        )

    def mark_completed(self, rag_document_id: int, chunk_count: int) -> RagDocumentRecord | None:
        return self.update_indexing_state(
            rag_document_id=rag_document_id,
            status="COMPLETED",
            indexing_progress=100,
            chunk_count=chunk_count,
        )

    def mark_failed(self, rag_document_id: int) -> RagDocumentRecord | None:
        return self.update_indexing_state(
            rag_document_id=rag_document_id,
            status="FAILED",
            indexing_progress=None,
            chunk_count=None,
        )

    def update_progress(self, rag_document_id: int, indexing_progress: int) -> RagDocumentRecord | None:
        return self.update_indexing_state(
            rag_document_id=rag_document_id,
            status=None,
            indexing_progress=indexing_progress,
            chunk_count=None,
        )

    def update_indexing_state(
        self,
        rag_document_id: int,
        status: str | None,
        indexing_progress: int | None,
        chunk_count: int | None,
    ) -> RagDocumentRecord | None:
        values = {"updated_at": datetime.now(UTC)}
        if status is not None:
            values["status"] = status
        if indexing_progress is not None:
            values["indexing_progress"] = self._validate_indexing_progress(indexing_progress)
        if chunk_count is not None:
            values["chunk_count"] = self._validate_chunk_count(chunk_count)

        statement = (
            update(rag_documents_table)
            .where(rag_documents_table.c.rag_document_id == rag_document_id)
            .values(**values)
            .returning(rag_documents_table)
        )
        row = self._session.execute(statement).mappings().first()
        self._session.flush()
        return self._to_record(row) if row else None

    @staticmethod
    def _validate_indexing_progress(indexing_progress: int) -> int:
        if indexing_progress < 0 or indexing_progress > 100:
            raise ValueError("indexing_progress must be between 0 and 100.")
        return indexing_progress

    @staticmethod
    def _validate_chunk_count(chunk_count: int) -> int:
        if chunk_count < 0:
            raise ValueError("chunk_count must be greater than or equal to 0.")
        return chunk_count

    @staticmethod
    def _to_record(row) -> RagDocumentRecord:
        return RagDocumentRecord(
            rag_document_id=row["rag_document_id"],
            uploaded_by=row["uploaded_by"],
            file_uuid=row["file_uuid"],
            original_file_name=row["original_file_name"],
            file_path=row["file_path"],
            mime_type=row["mime_type"],
            file_size=row["file_size"],
            chunk_count=row["chunk_count"],
            indexing_progress=row["indexing_progress"],
            status=row["status"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
