from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import BigInteger, Column, DateTime, Integer, MetaData, String, Table, Text, func, insert, select
from sqlalchemy.orm import Session

from admin.scraping.repository.scraping_pipeline_repository import scraping_pipelines_table


metadata = MetaData()

scraping_logs_table = Table(
    "scraping_logs",
    metadata,
    Column("scraping_log_id", BigInteger, primary_key=True),
    Column("scraping_pipeline_id", BigInteger, nullable=True),
    Column("target_site", String(50), nullable=False),
    Column("scraping_status", String(10), nullable=False),
    Column("total_count", Integer, nullable=True),
    Column("error_message", Text, nullable=True),
    Column("executed_at", DateTime(timezone=True), nullable=False),
)


@dataclass(frozen=True)
class ScrapingLogRecord:
    scraping_log_id: int
    scraping_pipeline_id: int | None
    source_name: str | None
    target_site: str
    scraping_status: str
    total_count: int | None
    error_message: str | None
    executed_at: datetime


@dataclass(frozen=True)
class ScrapingLogPageRecord:
    content: list[ScrapingLogRecord]
    page: int
    size: int
    total_elements: int
    total_pages: int


class ScrapingLogRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def save(
        self,
        scraping_pipeline_id: int | None,
        target_site: str,
        scraping_status: str,
        total_count: int | None,
        error_message: str | None,
        executed_at: datetime,
    ) -> ScrapingLogRecord:
        statement = (
            insert(scraping_logs_table)
            .values(
                scraping_pipeline_id=scraping_pipeline_id,
                target_site=target_site,
                scraping_status=scraping_status,
                total_count=total_count,
                error_message=error_message,
                executed_at=executed_at,
            )
            .returning(scraping_logs_table)
        )
        row = self._session.execute(statement).mappings().one()
        self._session.flush()
        return ScrapingLogRecord(
            scraping_log_id=row["scraping_log_id"],
            scraping_pipeline_id=row["scraping_pipeline_id"],
            source_name=None,
            target_site=row["target_site"],
            scraping_status=row["scraping_status"],
            total_count=row["total_count"],
            error_message=row["error_message"],
            executed_at=row["executed_at"],
        )

    def find_logs(
        self,
        source_name: str | None,
        scraping_status: str | None,
        page: int,
        size: int,
    ) -> ScrapingLogPageRecord:
        total_statement = self._build_base_query(source_name, scraping_status).with_only_columns(
            func.count(scraping_logs_table.c.scraping_log_id)
        )
        total_elements = self._session.execute(total_statement).scalar_one()

        offset = (page - 1) * size
        content_statement = (
            self._build_base_query(source_name, scraping_status)
            .order_by(scraping_logs_table.c.executed_at.desc(), scraping_logs_table.c.scraping_log_id.desc())
            .offset(offset)
            .limit(size)
        )
        rows = self._session.execute(content_statement).mappings().all()
        return ScrapingLogPageRecord(
            content=[self._to_record(row) for row in rows],
            page=page,
            size=size,
            total_elements=total_elements,
            total_pages=self._calculate_total_pages(total_elements, size),
        )

    def _build_base_query(self, source_name: str | None, scraping_status: str | None):
        statement = (
            select(
                scraping_logs_table.c.scraping_log_id,
                scraping_logs_table.c.scraping_pipeline_id,
                scraping_pipelines_table.c.source_name,
                scraping_logs_table.c.target_site,
                scraping_logs_table.c.scraping_status,
                scraping_logs_table.c.total_count,
                scraping_logs_table.c.error_message,
                scraping_logs_table.c.executed_at,
            )
            .select_from(
                scraping_logs_table.outerjoin(
                    scraping_pipelines_table,
                    scraping_logs_table.c.scraping_pipeline_id == scraping_pipelines_table.c.scraping_pipeline_id,
                )
            )
        )
        if source_name is not None:
            statement = statement.where(scraping_pipelines_table.c.source_name == source_name)
        if scraping_status is not None:
            statement = statement.where(scraping_logs_table.c.scraping_status == scraping_status)
        return statement

    @staticmethod
    def _calculate_total_pages(total_elements: int, size: int) -> int:
        if total_elements == 0:
            return 0
        return (total_elements + size - 1) // size

    @staticmethod
    def _to_record(row) -> ScrapingLogRecord:
        return ScrapingLogRecord(
            scraping_log_id=row["scraping_log_id"],
            scraping_pipeline_id=row["scraping_pipeline_id"],
            source_name=row["source_name"],
            target_site=row["target_site"],
            scraping_status=row["scraping_status"],
            total_count=row["total_count"],
            error_message=row["error_message"],
            executed_at=row["executed_at"],
        )
