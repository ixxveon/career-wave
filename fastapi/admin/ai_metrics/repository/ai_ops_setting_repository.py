from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal

from sqlalchemy import BigInteger, Boolean, Column, DateTime, Integer, MetaData, Numeric, String, Table, select
from sqlalchemy.engine import RowMapping
from sqlalchemy.orm import Session


metadata = MetaData()

ai_ops_settings_table = Table(
    "ai_ops_settings",
    metadata,
    Column("ai_ops_setting_id", BigInteger, primary_key=True),
    Column("selected_model_id", BigInteger, nullable=False),
    Column("monthly_budget", Numeric(15, 2), nullable=False),
    Column("alert_enabled", Boolean, nullable=False),
    Column("alert_channel", String(20), nullable=False),
    Column("alert_threshold", Integer, nullable=False),
    Column("rate_limit_enabled", Boolean, nullable=False),
    Column("updated_at", DateTime(timezone=True), nullable=False),
)


@dataclass(frozen=True)
class AiOpsSettingRecord:
    ai_ops_setting_id: int
    selected_model_id: int
    monthly_budget: Decimal
    alert_enabled: bool
    alert_channel: str
    alert_threshold: int
    rate_limit_enabled: bool
    updated_at: datetime


class AiOpsSettingRepository:
    SINGLETON_ID = 1

    def __init__(self, session: Session) -> None:
        self._session = session

    def find_singleton(self) -> AiOpsSettingRecord | None:
        return self.find_by_id(self.SINGLETON_ID)

    def find_by_id(self, ai_ops_setting_id: int) -> AiOpsSettingRecord | None:
        statement = select(ai_ops_settings_table).where(
            ai_ops_settings_table.c.ai_ops_setting_id == ai_ops_setting_id
        )
        row = self._session.execute(statement).mappings().first()
        return self._to_record(row) if row else None

    def find_selected_model_id(self) -> int | None:
        statement = select(ai_ops_settings_table.c.selected_model_id).where(
            ai_ops_settings_table.c.ai_ops_setting_id == self.SINGLETON_ID
        )
        return self._session.execute(statement).scalar_one_or_none()

    @staticmethod
    def _to_record(row: RowMapping) -> AiOpsSettingRecord:
        return AiOpsSettingRecord(
            ai_ops_setting_id=row["ai_ops_setting_id"],
            selected_model_id=row["selected_model_id"],
            monthly_budget=Decimal(row["monthly_budget"]),
            alert_enabled=row["alert_enabled"],
            alert_channel=row["alert_channel"],
            alert_threshold=row["alert_threshold"],
            rate_limit_enabled=row["rate_limit_enabled"],
            updated_at=row["updated_at"],
        )
