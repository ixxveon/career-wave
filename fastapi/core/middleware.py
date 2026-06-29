from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from core.config import get_settings


class InternalRouteGuardMiddleware(BaseHTTPMiddleware):
    """/internal/ 경로를 라우터 레벨 도달 전에 미들웨어에서 조기 차단한다.

    라우터에 이미 verify_internal_secret dependency가 있지만,
    미들웨어 단계에서 한 번 더 차단해 내부 API가 외부에 노출되는 경로를 최소화한다.
    """

    async def dispatch(self, request: Request, call_next):
        if request.url.path.startswith("/internal/") and request.method != "OPTIONS":
            secret = request.headers.get("x-internal-secret")
            settings = get_settings()
            if not secret or secret != settings.webhook_secret:
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Forbidden"},
                )
        return await call_next(request)
