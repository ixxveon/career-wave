import asyncio
import logging
from typing import Any

import httpx

from core.config import get_settings

logger = logging.getLogger(__name__)

_TIMEOUT_SECONDS = 5.0
_MAX_RETRIES = 3
_BACKOFF_BASE = 1.0  # 1s → 2s → 4s


async def send_webhook(document_id: str, payload: dict[str, Any]) -> None:
    settings = get_settings()
    url = f"{settings.spring_base_url}/api/v1/user/resume/{document_id}/webhook"
    headers = {
        "Content-Type": "application/json",
        "X-Internal-Secret": settings.webhook_secret,
    }

    async with httpx.AsyncClient(timeout=_TIMEOUT_SECONDS) as client:
        for attempt in range(_MAX_RETRIES):
            try:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                logger.info(f"[{document_id}] Webhook sent successfully (status={response.status_code})")
                return
            except httpx.HTTPStatusError as e:
                logger.warning(
                    f"[{document_id}] Webhook attempt {attempt + 1} failed: HTTP {e.response.status_code}"
                )
            except httpx.RequestError as e:
                logger.warning(f"[{document_id}] Webhook attempt {attempt + 1} request error: {e}")

            if attempt < _MAX_RETRIES - 1:
                backoff = _BACKOFF_BASE * (2**attempt)
                await asyncio.sleep(backoff)

    logger.error(f"[{document_id}] Webhook delivery failed after {_MAX_RETRIES} attempts — dropping")
