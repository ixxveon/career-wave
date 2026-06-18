from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal

from sqlalchemy import BigInteger, Boolean, Column, DateTime, MetaData, Numeric, String, Table, select
from sqlalchemy.engine import RowMapping
from sqlalchemy.orm import Session


metadata = MetaData()

ai_models_table = Table(
    "ai_models",
    metadata,
    Column("ai_model_id", BigInteger, primary_key=True),
    Column("model_name", String(100), nullable=False),
    Column("display_type", String(100), nullable=False),
    Column("provider", String(50), nullable=False),
    Column("input_token_price", Numeric(12, 6), nullable=False),
    Column("output_token_price", Numeric(12, 6), nullable=False),
    Column("is_enabled", Boolean, nullable=False),
    Column("created_at", DateTime(timezone=True), nullable=False),
    Column("updated_at", DateTime(timezone=True), nullable=False),
)


@dataclass(frozen=True)
class AiModelRecord:
    ai_model_id: int
    model_name: str
    display_type: str
    provider: str
    input_token_price: Decimal
    output_token_price: Decimal
    is_enabled: bool
    created_at: datetime
    updated_at: datetime


class AiModelRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def find_by_id(self, ai_model_id: int) -> AiModelRecord | None:
        statement = select(ai_models_table).where(ai_models_table.c.ai_model_id == ai_model_id)
        row = self._session.execute(statement).mappings().first()
        return self._to_record(row) if row else None

    def find_enabled_by_id(self, ai_model_id: int) -> AiModelRecord | None:
        statement = select(ai_models_table).where(
            ai_models_table.c.ai_model_id == ai_model_id,
            ai_models_table.c.is_enabled.is_(True),
        )
        row = self._session.execute(statement).mappings().first()
        return self._to_record(row) if row else None

    def find_enabled_models(self) -> list[AiModelRecord]:
        statement = (
            select(ai_models_table)
            .where(ai_models_table.c.is_enabled.is_(True))
            .order_by(ai_models_table.c.ai_model_id.asc())
        )
        rows = self._session.execute(statement).mappings().all()
        return [self._to_record(row) for row in rows]

    def exists_by_id(self, ai_model_id: int) -> bool:
        statement = select(ai_models_table.c.ai_model_id).where(ai_models_table.c.ai_model_id == ai_model_id)
        return self._session.execute(statement).first() is not None

    @staticmethod
    def _to_record(row: RowMapping) -> AiModelRecord:
        return AiModelRecord(
            ai_model_id=row["ai_model_id"],
            model_name=row["model_name"],
            display_type=row["display_type"],
            provider=row["provider"],
            input_token_price=Decimal(row["input_token_price"]),
            output_token_price=Decimal(row["output_token_price"]),
            is_enabled=row["is_enabled"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
