from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, Column, DateTime, Integer, MetaData, String, Table, Text, func, or_, select, update
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
    Column("schedule_interval_minutes", Integer, nullable=False),
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
    schedule_interval_minutes: int = 360


@dataclass(frozen=True)
class ScrapingPipelinePageRecord:
    content: list[ScrapingPipelineRecord]
    page: int
    size: int
    total_elements: int
    total_pages: int


@dataclass(frozen=True)
class ScrapingPipelineSummaryRecord:
    total_count: int
    idle_count: int
    running_count: int
    success_count: int
    failed_count: int
    enabled_count: int
    disabled_count: int


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

    def mark_running(self, source_name: str, started_at: datetime) -> ScrapingPipelineRecord | None:
        statement = (
            update(scraping_pipelines_table)
            .where(scraping_pipelines_table.c.source_name == source_name)
            .where(scraping_pipelines_table.c.pipeline_status != "RUNNING")
            .values(
                pipeline_status="RUNNING",
                last_started_at=started_at,
                updated_at=started_at,
            )
            .returning(scraping_pipelines_table)
        )
        row = self._session.execute(statement).mappings().first()
        self._session.flush()
        return self._to_record(row) if row else None

    def find_due_pipelines(self, now: datetime) -> list[ScrapingPipelineRecord]:
        last_run_at = func.coalesce(
            scraping_pipelines_table.c.last_started_at,
            scraping_pipelines_table.c.created_at,
        )
        due_at = last_run_at + func.make_interval(
            0,
            0,
            0,
            0,
            0,
            scraping_pipelines_table.c.schedule_interval_minutes,
        )
        statement = (
            select(scraping_pipelines_table)
            .where(scraping_pipelines_table.c.is_enabled.is_(True))
            .where(scraping_pipelines_table.c.pipeline_status != "RUNNING")
            .where(due_at <= now)
            .order_by(scraping_pipelines_table.c.scraping_pipeline_id.asc())
        )
        rows = self._session.execute(statement).mappings().all()
        return [self._to_record(row) for row in rows]

    def mark_success(
        self,
        source_name: str,
        *,
        succeeded_at: datetime,
        total_count: int,
        duration_ms: int,
    ) -> ScrapingPipelineRecord | None:
        statement = (
            update(scraping_pipelines_table)
            .where(scraping_pipelines_table.c.source_name == source_name)
            .values(
                pipeline_status="SUCCESS",
                last_success_at=succeeded_at,
                last_duration_ms=duration_ms,
                last_total_count=total_count,
                last_error_message=None,
                updated_at=succeeded_at,
            )
            .returning(scraping_pipelines_table)
        )
        row = self._session.execute(statement).mappings().first()
        self._session.flush()
        return self._to_record(row) if row else None

    def mark_failed(
        self,
        source_name: str,
        *,
        failed_at: datetime,
        error_message: str | None,
    ) -> ScrapingPipelineRecord | None:
        statement = (
            update(scraping_pipelines_table)
            .where(scraping_pipelines_table.c.source_name == source_name)
            .values(
                pipeline_status="FAILED",
                last_failed_at=failed_at,
                last_error_message=error_message,
                updated_at=failed_at,
            )
            .returning(scraping_pipelines_table)
        )
        row = self._session.execute(statement).mappings().first()
        self._session.flush()
        return self._to_record(row) if row else None

    def find_pipelines(
        self,
        keyword: str | None,
        status: str | None,
        page: int,
        size: int,
    ) -> ScrapingPipelinePageRecord:
        total_statement = self._apply_filters(
            select(func.count(scraping_pipelines_table.c.scraping_pipeline_id)),
            keyword=keyword,
            status=status,
        )
        total_elements = self._session.execute(total_statement).scalar_one()

        offset = (page - 1) * size
        content_statement = (
            self._apply_filters(
                select(scraping_pipelines_table),
                keyword=keyword,
                status=status,
            )
            .order_by(
                scraping_pipelines_table.c.updated_at.desc(),
                scraping_pipelines_table.c.scraping_pipeline_id.desc(),
            )
            .offset(offset)
            .limit(size)
        )
        rows = self._session.execute(content_statement).mappings().all()
        return ScrapingPipelinePageRecord(
            content=[self._to_record(row) for row in rows],
            page=page,
            size=size,
            total_elements=total_elements,
            total_pages=self._calculate_total_pages(total_elements, size),
        )

    def aggregate_summary(self) -> ScrapingPipelineSummaryRecord:
        statement = select(
            func.count(scraping_pipelines_table.c.scraping_pipeline_id).label("total_count"),
            func.coalesce(
                func.sum(
                    func.cast(scraping_pipelines_table.c.pipeline_status == "IDLE", Integer)
                ),
                0,
            ).label("idle_count"),
            func.coalesce(
                func.sum(
                    func.cast(scraping_pipelines_table.c.pipeline_status == "RUNNING", Integer)
                ),
                0,
            ).label("running_count"),
            func.coalesce(
                func.sum(
                    func.cast(scraping_pipelines_table.c.pipeline_status == "SUCCESS", Integer)
                ),
                0,
            ).label("success_count"),
            func.coalesce(
                func.sum(
                    func.cast(scraping_pipelines_table.c.pipeline_status == "FAILED", Integer)
                ),
                0,
            ).label("failed_count"),
            func.coalesce(
                func.sum(func.cast(scraping_pipelines_table.c.is_enabled.is_(True), Integer)),
                0,
            ).label("enabled_count"),
            func.coalesce(
                func.sum(func.cast(scraping_pipelines_table.c.is_enabled.is_(False), Integer)),
                0,
            ).label("disabled_count"),
        )
        row = self._session.execute(statement).mappings().one()
        return ScrapingPipelineSummaryRecord(
            total_count=row["total_count"],
            idle_count=row["idle_count"],
            running_count=row["running_count"],
            success_count=row["success_count"],
            failed_count=row["failed_count"],
            enabled_count=row["enabled_count"],
            disabled_count=row["disabled_count"],
        )

    @staticmethod
    def _apply_filters(statement, *, keyword: str | None, status: str | None):
        if keyword:
            normalized_keyword = f"%{keyword.strip()}%"
            statement = statement.where(
                or_(
                    scraping_pipelines_table.c.source_name.ilike(normalized_keyword),
                    scraping_pipelines_table.c.display_name.ilike(normalized_keyword),
                    scraping_pipelines_table.c.last_error_message.ilike(normalized_keyword),
                )
            )
        if status is not None:
            statement = statement.where(scraping_pipelines_table.c.pipeline_status == status)
        return statement

    @staticmethod
    def _calculate_total_pages(total_elements: int, size: int) -> int:
        if total_elements == 0:
            return 0
        return (total_elements + size - 1) // size

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
            schedule_interval_minutes=row["schedule_interval_minutes"],
        )
