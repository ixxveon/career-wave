from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import BigInteger, Column, DateTime, Integer, MetaData, Numeric, String, Table, case, func, insert, select, text
from sqlalchemy.dialects.postgresql import UUID as PostgreSqlUUID
from sqlalchemy.orm import Session

from admin.ai_metrics.schema import UsageLogCreateRequest


metadata = MetaData()

# An admin-facing feature may be backed by multiple raw usage-log types.
# Keep this mapping in the repository so every aggregate and filter uses
# the same feature-domain boundary.
FEATURE_TYPE_GROUPS: dict[str, tuple[str, ...]] = {
    "DOCUMENT": ("DOCUMENT",),
    "INTERVIEW": ("INTERVIEW", "INTERVIEW_STT", "INTERVIEW_TTS"),
    "ADMIN_CS": ("ADMIN_CS",),
    "ADMIN_REPORT": ("ADMIN_REPORT", "ADMIN_REPORT_MEMBER"),
}


def resolve_feature_types(feature_type: str) -> tuple[str, ...]:
    return FEATURE_TYPE_GROUPS.get(feature_type, (feature_type,))

ai_usage_logs_table = Table(
    "ai_usage_logs",
    metadata,
    Column("ai_usage_log_id", BigInteger, primary_key=True),
    Column("member_id", PostgreSqlUUID(as_uuid=True), nullable=True),
    Column("admin_id", BigInteger, nullable=True),
    Column("session_id", PostgreSqlUUID(as_uuid=True), nullable=True),
    Column("ai_model_id", BigInteger, nullable=False),
    Column("feature_type", String(20), nullable=False),
    Column("input_tokens", Integer, nullable=False),
    Column("output_tokens", Integer, nullable=False),
    Column("cost", Numeric(15, 6), nullable=False),
    Column("created_at", DateTime(timezone=True), nullable=False),
)


@dataclass(frozen=True)
class AiUsageLogRecord:
    ai_usage_log_id: int
    member_id: UUID | None
    admin_id: int | None
    session_id: UUID | None
    ai_model_id: int
    feature_type: str
    input_tokens: int
    output_tokens: int
    cost: Decimal
    created_at: datetime


@dataclass(frozen=True)
class UsageSummaryAggregateRecord:
    total_requests: int
    total_input_tokens: int
    total_output_tokens: int
    total_cost: Decimal
    document_requests: int
    interview_requests: int
    admin_cs_requests: int
    admin_report_requests: int


@dataclass(frozen=True)
class FeatureUsageAggregateRecord:
    request_count: int
    input_tokens: int
    output_tokens: int
    cost: Decimal


@dataclass(frozen=True)
class DomainUsageAggregateRecord:
    document: FeatureUsageAggregateRecord
    interview: FeatureUsageAggregateRecord
    admin_cs: FeatureUsageAggregateRecord
    admin_report: FeatureUsageAggregateRecord


@dataclass(frozen=True)
class TokenTrendPointAggregateRecord:
    bucket: datetime
    input_tokens: int
    output_tokens: int
    cost: Decimal


@dataclass(frozen=True)
class HeavyUserAggregateRecord:
    member_id: UUID
    request_count: int
    input_tokens: int
    output_tokens: int
    total_tokens: int
    cost: Decimal


@dataclass(frozen=True)
class UsageLogPageRecord:
    content: list[AiUsageLogRecord]
    page: int
    size: int
    total_elements: int
    total_pages: int


class AiUsageLogRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def save(self, request: UsageLogCreateRequest) -> AiUsageLogRecord:
        statement = (
            insert(ai_usage_logs_table)
            .values(
                member_id=request.member_id,
                admin_id=request.admin_id,
                session_id=request.session_id,
                ai_model_id=request.ai_model_id,
                feature_type=request.feature_type.value,
                input_tokens=request.input_tokens,
                output_tokens=request.output_tokens,
                cost=request.cost,
            )
            .returning(ai_usage_logs_table)
        )
        row = self._session.execute(statement).mappings().one()
        self._session.flush()
        return AiUsageLogRecord(
            ai_usage_log_id=row["ai_usage_log_id"],
            member_id=row["member_id"],
            admin_id=row["admin_id"],
            session_id=row["session_id"],
            ai_model_id=row["ai_model_id"],
            feature_type=row["feature_type"],
            input_tokens=row["input_tokens"],
            output_tokens=row["output_tokens"],
            cost=Decimal(row["cost"]),
            created_at=row["created_at"],
        )

    def acquire_monthly_budget_lock(self, period_key: str) -> None:
        self._session.execute(
            text("SELECT pg_advisory_xact_lock(hashtext(:period_key))"),
            {"period_key": f"ai-budget-alert:{period_key}"},
        )

    def sum_cost(self, created_from: datetime, created_to: datetime) -> Decimal:
        statement = select(
            func.coalesce(func.sum(ai_usage_logs_table.c.cost), 0).label("total_cost")
        ).where(
            ai_usage_logs_table.c.created_at >= created_from,
            ai_usage_logs_table.c.created_at < created_to,
        )
        return Decimal(self._session.execute(statement).scalar_one())

    def aggregate_summary(
        self,
        created_from: datetime | None,
        created_to: datetime | None,
        feature_type: str | None,
    ) -> UsageSummaryAggregateRecord:
        statement = select(
            func.count(ai_usage_logs_table.c.ai_usage_log_id).label("total_requests"),
            func.coalesce(func.sum(ai_usage_logs_table.c.input_tokens), 0).label("total_input_tokens"),
            func.coalesce(func.sum(ai_usage_logs_table.c.output_tokens), 0).label("total_output_tokens"),
            func.coalesce(func.sum(ai_usage_logs_table.c.cost), 0).label("total_cost"),
            func.coalesce(
                func.sum(case((ai_usage_logs_table.c.feature_type == "DOCUMENT", 1), else_=0)),
                0,
            ).label("document_requests"),
            func.coalesce(
                func.sum(case((ai_usage_logs_table.c.feature_type.in_(resolve_feature_types("INTERVIEW")), 1), else_=0)),
                0,
            ).label("interview_requests"),
            func.coalesce(
                func.sum(case((ai_usage_logs_table.c.feature_type == "ADMIN_CS", 1), else_=0)),
                0,
            ).label("admin_cs_requests"),
            func.coalesce(
                func.sum(case((ai_usage_logs_table.c.feature_type.in_(resolve_feature_types("ADMIN_REPORT")), 1), else_=0)),
                0,
            ).label("admin_report_requests"),
        )
        statement = self._apply_usage_filters(statement, created_from, created_to, feature_type)
        row = self._session.execute(statement).mappings().one()
        return UsageSummaryAggregateRecord(
            total_requests=row["total_requests"],
            total_input_tokens=row["total_input_tokens"],
            total_output_tokens=row["total_output_tokens"],
            total_cost=Decimal(row["total_cost"]),
            document_requests=row["document_requests"],
            interview_requests=row["interview_requests"],
            admin_cs_requests=row["admin_cs_requests"],
            admin_report_requests=row["admin_report_requests"],
        )

    def aggregate_domain_usage(
        self,
        created_from: datetime | None,
        created_to: datetime | None,
    ) -> DomainUsageAggregateRecord:
        statement = select(
            func.coalesce(
                func.sum(case((ai_usage_logs_table.c.feature_type == "DOCUMENT", 1), else_=0)),
                0,
            ).label("document_request_count"),
            func.coalesce(
                func.sum(case((ai_usage_logs_table.c.feature_type == "DOCUMENT", ai_usage_logs_table.c.input_tokens), else_=0)),
                0,
            ).label("document_input_tokens"),
            func.coalesce(
                func.sum(case((ai_usage_logs_table.c.feature_type == "DOCUMENT", ai_usage_logs_table.c.output_tokens), else_=0)),
                0,
            ).label("document_output_tokens"),
            func.coalesce(
                func.sum(case((ai_usage_logs_table.c.feature_type == "DOCUMENT", ai_usage_logs_table.c.cost), else_=0)),
                0,
            ).label("document_cost"),
            func.coalesce(
                func.sum(case((ai_usage_logs_table.c.feature_type.in_(resolve_feature_types("INTERVIEW")), 1), else_=0)),
                0,
            ).label("interview_request_count"),
            func.coalesce(
                func.sum(case((ai_usage_logs_table.c.feature_type.in_(resolve_feature_types("INTERVIEW")), ai_usage_logs_table.c.input_tokens), else_=0)),
                0,
            ).label("interview_input_tokens"),
            func.coalesce(
                func.sum(case((ai_usage_logs_table.c.feature_type.in_(resolve_feature_types("INTERVIEW")), ai_usage_logs_table.c.output_tokens), else_=0)),
                0,
            ).label("interview_output_tokens"),
            func.coalesce(
                func.sum(case((ai_usage_logs_table.c.feature_type.in_(resolve_feature_types("INTERVIEW")), ai_usage_logs_table.c.cost), else_=0)),
                0,
            ).label("interview_cost"),
            func.coalesce(
                func.sum(case((ai_usage_logs_table.c.feature_type == "ADMIN_CS", 1), else_=0)),
                0,
            ).label("admin_cs_request_count"),
            func.coalesce(
                func.sum(case((ai_usage_logs_table.c.feature_type == "ADMIN_CS", ai_usage_logs_table.c.input_tokens), else_=0)),
                0,
            ).label("admin_cs_input_tokens"),
            func.coalesce(
                func.sum(case((ai_usage_logs_table.c.feature_type == "ADMIN_CS", ai_usage_logs_table.c.output_tokens), else_=0)),
                0,
            ).label("admin_cs_output_tokens"),
            func.coalesce(
                func.sum(case((ai_usage_logs_table.c.feature_type == "ADMIN_CS", ai_usage_logs_table.c.cost), else_=0)),
                0,
            ).label("admin_cs_cost"),
            func.coalesce(
                func.sum(case((ai_usage_logs_table.c.feature_type.in_(resolve_feature_types("ADMIN_REPORT")), 1), else_=0)),
                0,
            ).label("admin_report_request_count"),
            func.coalesce(
                func.sum(case((ai_usage_logs_table.c.feature_type.in_(resolve_feature_types("ADMIN_REPORT")), ai_usage_logs_table.c.input_tokens), else_=0)),
                0,
            ).label("admin_report_input_tokens"),
            func.coalesce(
                func.sum(case((ai_usage_logs_table.c.feature_type.in_(resolve_feature_types("ADMIN_REPORT")), ai_usage_logs_table.c.output_tokens), else_=0)),
                0,
            ).label("admin_report_output_tokens"),
            func.coalesce(
                func.sum(case((ai_usage_logs_table.c.feature_type.in_(resolve_feature_types("ADMIN_REPORT")), ai_usage_logs_table.c.cost), else_=0)),
                0,
            ).label("admin_report_cost"),
        )
        statement = self._apply_usage_filters(statement, created_from, created_to, None)
        row = self._session.execute(statement).mappings().one()
        return DomainUsageAggregateRecord(
            document=FeatureUsageAggregateRecord(
                request_count=row["document_request_count"],
                input_tokens=row["document_input_tokens"],
                output_tokens=row["document_output_tokens"],
                cost=Decimal(row["document_cost"]),
            ),
            interview=FeatureUsageAggregateRecord(
                request_count=row["interview_request_count"],
                input_tokens=row["interview_input_tokens"],
                output_tokens=row["interview_output_tokens"],
                cost=Decimal(row["interview_cost"]),
            ),
            admin_cs=FeatureUsageAggregateRecord(
                request_count=row["admin_cs_request_count"],
                input_tokens=row["admin_cs_input_tokens"],
                output_tokens=row["admin_cs_output_tokens"],
                cost=Decimal(row["admin_cs_cost"]),
            ),
            admin_report=FeatureUsageAggregateRecord(
                request_count=row["admin_report_request_count"],
                input_tokens=row["admin_report_input_tokens"],
                output_tokens=row["admin_report_output_tokens"],
                cost=Decimal(row["admin_report_cost"]),
            ),
        )

    def aggregate_token_trend(
        self,
        created_from: datetime | None,
        created_to: datetime | None,
        feature_type: str | None,
        interval: str,
    ) -> list[TokenTrendPointAggregateRecord]:
        bucket_expression = func.date_trunc(
            self._to_date_trunc_unit(interval),
            ai_usage_logs_table.c.created_at,
        ).label("bucket")
        statement = (
            select(
                bucket_expression,
                func.coalesce(func.sum(ai_usage_logs_table.c.input_tokens), 0).label("input_tokens"),
                func.coalesce(func.sum(ai_usage_logs_table.c.output_tokens), 0).label("output_tokens"),
                func.coalesce(func.sum(ai_usage_logs_table.c.cost), 0).label("cost"),
            )
            .group_by(bucket_expression)
            .order_by(bucket_expression.asc())
        )
        statement = self._apply_usage_filters(statement, created_from, created_to, feature_type)
        rows = self._session.execute(statement).mappings().all()
        return [
            TokenTrendPointAggregateRecord(
                bucket=row["bucket"],
                input_tokens=row["input_tokens"],
                output_tokens=row["output_tokens"],
                cost=Decimal(row["cost"]),
            )
            for row in rows
        ]

    @staticmethod
    def _to_date_trunc_unit(interval: str) -> str:
        interval_units = {
            "HOURLY": "hour",
            "DAILY": "day",
        }
        return interval_units[interval]

    def aggregate_heavy_users(
        self,
        created_from: datetime | None,
        created_to: datetime | None,
        feature_type: str | None,
        limit: int | None,
    ) -> list[HeavyUserAggregateRecord]:
        cost_sum = func.coalesce(func.sum(ai_usage_logs_table.c.cost), 0).label("cost")
        request_count = func.count(ai_usage_logs_table.c.ai_usage_log_id).label("request_count")
        total_tokens = func.coalesce(
            func.sum(ai_usage_logs_table.c.input_tokens + ai_usage_logs_table.c.output_tokens),
            0,
        ).label("total_tokens")
        statement = (
            select(
                ai_usage_logs_table.c.member_id,
                request_count,
                func.coalesce(func.sum(ai_usage_logs_table.c.input_tokens), 0).label("input_tokens"),
                func.coalesce(func.sum(ai_usage_logs_table.c.output_tokens), 0).label("output_tokens"),
                total_tokens,
                cost_sum,
            )
            .where(ai_usage_logs_table.c.member_id.is_not(None))
            .group_by(ai_usage_logs_table.c.member_id)
            .order_by(
                total_tokens.desc(),
                request_count.desc(),
                ai_usage_logs_table.c.member_id.asc(),
            )
        )
        statement = self._apply_usage_filters(statement, created_from, created_to, feature_type)
        if limit is not None:
            statement = statement.limit(limit)
        rows = self._session.execute(statement).mappings().all()
        return [
            HeavyUserAggregateRecord(
                member_id=row["member_id"],
                request_count=row["request_count"],
                input_tokens=row["input_tokens"],
                output_tokens=row["output_tokens"],
                total_tokens=row["total_tokens"],
                cost=Decimal(row["cost"]),
            )
            for row in rows
        ]

    def find_usage_logs(
        self,
        feature_type: str | None,
        page: int,
        size: int,
    ) -> UsageLogPageRecord:
        total_statement = select(func.count(ai_usage_logs_table.c.ai_usage_log_id))
        total_statement = self._apply_usage_filters(total_statement, None, None, feature_type)
        total_elements = self._session.execute(total_statement).scalar_one()

        offset = (page - 1) * size
        content_statement = (
            select(ai_usage_logs_table)
            .order_by(ai_usage_logs_table.c.created_at.desc(), ai_usage_logs_table.c.ai_usage_log_id.desc())
            .offset(offset)
            .limit(size)
        )
        content_statement = self._apply_usage_filters(content_statement, None, None, feature_type)
        rows = self._session.execute(content_statement).mappings().all()
        return UsageLogPageRecord(
            content=[self._to_usage_log_record(row) for row in rows],
            page=page,
            size=size,
            total_elements=total_elements,
            total_pages=self._calculate_total_pages(total_elements, size),
        )

    @staticmethod
    def _apply_usage_filters(statement, created_from: datetime | None, created_to: datetime | None, feature_type: str | None):
        if created_from is not None:
            statement = statement.where(ai_usage_logs_table.c.created_at >= created_from)
        if created_to is not None:
            statement = statement.where(ai_usage_logs_table.c.created_at <= created_to)
        if feature_type is not None:
            statement = statement.where(ai_usage_logs_table.c.feature_type.in_(resolve_feature_types(feature_type)))
        return statement

    @staticmethod
    def _calculate_total_pages(total_elements: int, size: int) -> int:
        if total_elements == 0:
            return 0
        return (total_elements + size - 1) // size

    @staticmethod
    def _to_usage_log_record(row) -> AiUsageLogRecord:
        return AiUsageLogRecord(
            ai_usage_log_id=row["ai_usage_log_id"],
            member_id=row["member_id"],
            admin_id=row["admin_id"],
            session_id=row["session_id"],
            ai_model_id=row["ai_model_id"],
            feature_type=row["feature_type"],
            input_tokens=row["input_tokens"],
            output_tokens=row["output_tokens"],
            cost=Decimal(row["cost"]),
            created_at=row["created_at"],
        )
