"""
최종 Webhook (COMPLETED / FAILED) 유실 방지 Outbox.

- SQLite 파일에 payload를 PENDING_DELIVERY 상태로 저장 후 전송 시도
- 전송 성공 시 DELIVERED 로 전이
- 실패 시 retry_count 증가, _MAX_RETRIES 초과 시 DEAD_LETTER 전이
- 백그라운드 worker 가 PENDING_DELIVERY 항목을 주기적으로 재시도
- 중간 상태(PENDING / ANALYZING) webhook 은 outbox 를 거치지 않음
"""

import asyncio
import json
import logging
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx

from core.config import get_settings

logger = logging.getLogger(__name__)

_DB_PATH = Path("/tmp/career-wave-webhook-outbox.db")
_MAX_RETRIES = 10
_RETRY_INTERVAL_SECONDS = 30
_TIMEOUT_SECONDS = 10.0
_BACKOFF_BASE = 2.0

# ── DB 초기화 ──────────────────────────────────────────────────────────────────

def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(_DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_outbox_db() -> None:
    with _get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS webhook_outbox (
                id            INTEGER  PRIMARY KEY AUTOINCREMENT,
                document_id   TEXT     NOT NULL,
                status        TEXT     NOT NULL,
                payload       TEXT     NOT NULL,
                delivery_status TEXT   NOT NULL DEFAULT 'PENDING_DELIVERY',
                retry_count   INTEGER  NOT NULL DEFAULT 0,
                last_error    TEXT,
                created_at    TEXT     NOT NULL,
                updated_at    TEXT     NOT NULL
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_outbox_delivery_status
            ON webhook_outbox (delivery_status)
        """)


# ── Outbox 저장 & 전송 ─────────────────────────────────────────────────────────

async def send_final_webhook(document_id: str, payload: dict[str, Any]) -> None:
    """최종 상태 webhook — outbox 에 저장 후 즉시 전송 시도."""
    outbox_id = _save_pending(document_id, payload)
    success = await _deliver(outbox_id, document_id, payload)
    if not success:
        logger.warning(
            f"[{document_id}] 최종 webhook 즉시 전송 실패 — outbox id={outbox_id}, 백그라운드 재시도 예정"
        )


def _save_pending(document_id: str, payload: dict[str, Any]) -> int:
    now = _now_iso()
    with _get_conn() as conn:
        cur = conn.execute(
            """
            INSERT INTO webhook_outbox
                (document_id, status, payload, delivery_status, retry_count, created_at, updated_at)
            VALUES (?, ?, ?, 'PENDING_DELIVERY', 0, ?, ?)
            """,
            (document_id, payload.get("status", ""), json.dumps(payload, ensure_ascii=False), now, now),
        )
        return cur.lastrowid


async def _deliver(outbox_id: int, document_id: str, payload: dict[str, Any]) -> bool:
    settings = get_settings()
    url = f"{settings.spring_base_url}/api/v1/user/resume/{document_id}/webhook"
    headers = {
        "Content-Type": "application/json",
        "X-Internal-Secret": settings.webhook_secret,
    }

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT_SECONDS) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
        _mark_delivered(outbox_id)
        logger.info(f"[{document_id}] 최종 webhook 전송 성공 (outbox id={outbox_id})")
        return True
    except Exception as e:
        _increment_retry(outbox_id, str(e))
        return False


def _mark_delivered(outbox_id: int) -> None:
    with _get_conn() as conn:
        conn.execute(
            "UPDATE webhook_outbox SET delivery_status='DELIVERED', updated_at=? WHERE id=?",
            (_now_iso(), outbox_id),
        )


def _increment_retry(outbox_id: int, error: str) -> None:
    with _get_conn() as conn:
        row = conn.execute(
            "SELECT retry_count FROM webhook_outbox WHERE id=?", (outbox_id,)
        ).fetchone()
        if row is None:
            return
        new_count = row["retry_count"] + 1
        new_status = "DEAD_LETTER" if new_count >= _MAX_RETRIES else "PENDING_DELIVERY"
        conn.execute(
            """
            UPDATE webhook_outbox
            SET retry_count=?, delivery_status=?, last_error=?, updated_at=?
            WHERE id=?
            """,
            (new_count, new_status, error[:500], _now_iso(), outbox_id),
        )
        if new_status == "DEAD_LETTER":
            logger.error(
                f"[outbox id={outbox_id}] 최종 webhook DEAD_LETTER 전이 — {_MAX_RETRIES}회 전송 실패"
            )


# ── 백그라운드 재시도 Worker ──────────────────────────────────────────────────

async def run_outbox_worker() -> None:
    logger.info("[outbox worker] 시작")
    while True:
        await asyncio.sleep(_RETRY_INTERVAL_SECONDS)
        await _retry_pending()


async def _retry_pending() -> None:
    with _get_conn() as conn:
        rows = conn.execute(
            "SELECT id, document_id, payload FROM webhook_outbox WHERE delivery_status='PENDING_DELIVERY' LIMIT 50"
        ).fetchall()

    for row in rows:
        outbox_id = row["id"]
        document_id = row["document_id"]
        try:
            payload = json.loads(row["payload"])
        except json.JSONDecodeError:
            _increment_retry(outbox_id, "payload JSON 파싱 실패")
            continue

        retry_count = _get_retry_count(outbox_id)
        if retry_count > 0:
            backoff = min(_BACKOFF_BASE ** retry_count, 300)
            await asyncio.sleep(backoff)

        await _deliver(outbox_id, document_id, payload)


def _get_retry_count(outbox_id: int) -> int:
    with _get_conn() as conn:
        row = conn.execute(
            "SELECT retry_count FROM webhook_outbox WHERE id=?", (outbox_id,)
        ).fetchone()
        return row["retry_count"] if row else 0


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
