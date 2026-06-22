from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, Column, DateTime, Integer, MetaData, String, Table, Text, select
from sqlalchemy.engine import RowMapping
from sqlalchemy.orm import Session


metadata = MetaData()

scraping_pipelines_table = Table(
    "scraping_pipelines",
    metadata,
    Column("scraping_pipeline_id", BigInteger, primary_key=True),
    Column("source_name", String(50), nullable=False, unique=True),
    Column("display_name", String(100), nullable=False),
    Column("pipeline_status", String(20), nullable=False),
    Column("is_enabled", Boolean, nullable=False),
    Column("last_started_at", DateTime(timezone=True), nullable=True),
    Column("last_success_at", DateTime(timezone=True), nullable=True),
    Column("last_failed_at", DateTime(timezone=True), nullable=True),
    Column("last_duration_ms", Integer, nullable=True),
    Column("last_total_count", Integer, nullable=True),
    Column("last_error_message", Text, nullable=True),
    Column("created_at", DateTime(timezone=True), nullable=False),
    Column("updated_at", DateTime(timezone=True), nullable=False),
)


@dataclass(frozen=True)
class ScrapingPipelineRecord:
    scraping_pipeline_id: int
    source_name: str
    display_name: str
    pipeline_status: str
    is_enabled: bool
    last_started_at: datetime | None
    last_success_at: datetime | None
    last_failed_at: datetime | None
    last_duration_ms: int | None
    last_total_count: int | None
    last_error_message: str | None
    created_at: datetime
    updated_at: datetime


class ScrapingPipelineRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def find_by_id(self, scraping_pipeline_id: int) -> ScrapingPipelineRecord | None:
        statement = select(scraping_pipelines_table).where(
            scraping_pipelines_table.c.scraping_pipeline_id == scraping_pipeline_id
        )
        row = self._session.execute(statement).mappings().first()
        return self._to_record(row) if row else None

    def find_by_source_name(self, source_name: str) -> ScrapingPipelineRecord | None:
        statement = select(scraping_pipelines_table).where(
            scraping_pipelines_table.c.source_name == source_name
        )
        row = self._session.execute(statement).mappings().one_or_none()
        return self._to_record(row) if row else None

    def find_status_by_source_name(self, source_name: str) -> str | None:
        statement = select(scraping_pipelines_table.c.pipeline_status).where(
            scraping_pipelines_table.c.source_name == source_name
        )
        return self._session.execute(statement).scalar_one_or_none()

    @staticmethod
    def _to_record(row: RowMapping) -> ScrapingPipelineRecord:
        return ScrapingPipelineRecord(
            scraping_pipeline_id=row["scraping_pipeline_id"],
            source_name=row["source_name"],
            display_name=row["display_name"],
            pipeline_status=row["pipeline_status"],
            is_enabled=row["is_enabled"],
            last_started_at=row["last_started_at"],
            last_success_at=row["last_success_at"],
            last_failed_at=row["last_failed_at"],
            last_duration_ms=row["last_duration_ms"],
            last_total_count=row["last_total_count"],
            last_error_message=row["last_error_message"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
