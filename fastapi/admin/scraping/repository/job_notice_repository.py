from dataclasses import dataclass
from datetime import date, datetime

from sqlalchemy import ARRAY, BigInteger, Column, Date, DateTime, Integer, MetaData, String, Table, Text, UniqueConstraint, insert, select
from sqlalchemy.orm import Session


metadata = MetaData()

job_notices_table = Table(
    "job_notices",
    metadata,
    Column("job_notice_id", BigInteger, primary_key=True),
    Column("company_name", String(100), nullable=True),
    Column("title", String(200), nullable=False),
    Column("description", Text, nullable=True),
    Column("skill_tags", ARRAY(Text), nullable=True),
    Column("job_type", String(20), nullable=True),
    Column("company_size", String(20), nullable=True),
    Column("job_category", ARRAY(Text), nullable=True),
    Column("career_level", String(10), nullable=True),
    Column("location", String(100), nullable=True),
    Column("salary", String(50), nullable=True),
    Column("notice_status", String(10), nullable=False),
    Column("original_url", Text, nullable=False),
    Column("source", String(20), nullable=False),
    Column("view_count", Integer, nullable=False),
    Column("deadline", Date, nullable=True),
    Column("created_at", DateTime(timezone=True), nullable=False),
    Column("updated_at", DateTime(timezone=True), nullable=False),
    UniqueConstraint("source", "original_url", name="uq_job_notices_source_original_url"),
)


@dataclass(frozen=True)
class JobNoticeRecord:
    job_notice_id: int
    company_name: str | None
    title: str
    description: str | None
    skill_tags: list[str] | None
    job_type: str | None
    company_size: str | None
    job_category: list[str] | None
    career_level: str | None
    location: str | None
    salary: str | None
    notice_status: str
    original_url: str
    source: str
    view_count: int
    deadline: date | None
    created_at: datetime
    updated_at: datetime


class JobNoticeRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def save(
        self,
        company_name: str | None,
        title: str,
        description: str | None,
        skill_tags: list[str] | None,
        job_type: str | None,
        company_size: str | None,
        job_category: list[str] | None,
        career_level: str | None,
        location: str | None,
        salary: str | None,
        notice_status: str,
        original_url: str,
        source: str,
        view_count: int,
        deadline: date | None,
    ) -> JobNoticeRecord:
        statement = (
            insert(job_notices_table)
            .values(
                company_name=company_name,
                title=title,
                description=description,
                skill_tags=skill_tags,
                job_type=job_type,
                company_size=company_size,
                job_category=job_category,
                career_level=career_level,
                location=location,
                salary=salary,
                notice_status=notice_status,
                original_url=original_url,
                source=source,
                view_count=view_count,
                deadline=deadline,
            )
            .returning(job_notices_table)
        )
        row = self._session.execute(statement).mappings().one()
        self._session.flush()
        return self._to_record(row)

    def find_by_id(self, job_notice_id: int) -> JobNoticeRecord | None:
        statement = select(job_notices_table).where(job_notices_table.c.job_notice_id == job_notice_id)
        row = self._session.execute(statement).mappings().first()
        return self._to_record(row) if row else None

    def exists_by_source_and_original_url(self, source: str, original_url: str) -> bool:
        statement = (
            select(job_notices_table.c.job_notice_id)
            .where(job_notices_table.c.source == source)
            .where(job_notices_table.c.original_url == original_url)
        )
        return self._session.execute(statement).first() is not None

    @staticmethod
    def _to_record(row) -> JobNoticeRecord:
        return JobNoticeRecord(
            job_notice_id=row["job_notice_id"],
            company_name=row["company_name"],
            title=row["title"],
            description=row["description"],
            skill_tags=list(row["skill_tags"]) if row["skill_tags"] is not None else None,
            job_type=row["job_type"],
            company_size=row["company_size"],
            job_category=list(row["job_category"]) if row["job_category"] is not None else None,
            career_level=row["career_level"],
            location=row["location"],
            salary=row["salary"],
            notice_status=row["notice_status"],
            original_url=row["original_url"],
            source=row["source"],
            view_count=row["view_count"],
            deadline=row["deadline"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
