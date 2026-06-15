from fastapi import Header, HTTPException, status

from core.config import get_settings


async def verify_internal_secret(x_internal_secret: str = Header(...)) -> None:
    settings = get_settings()
    if not settings.webhook_secret or x_internal_secret != settings.webhook_secret:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid internal secret")
