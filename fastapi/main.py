import asyncio
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from admin.ai_metrics.client.openai_client import get_ai_metrics_openai_client
from admin.ai_metrics.router import router as ai_metrics_router

log = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    scheduler.start()
    yield
    if get_ai_metrics_openai_client.cache_info().currsize > 0:
        await get_ai_metrics_openai_client().close()
        get_ai_metrics_openai_client.cache_clear()
    scheduler.shutdown()
    # Graceful shutdown: 진행 중인 AI 파이프라인 태스크 최대 15초 대기
    current = asyncio.current_task()
    pending = [t for t in asyncio.all_tasks() if not t.done() and t is not current]
    if pending:
        log.info("graceful shutdown: waiting for %d pending tasks (timeout=15s)", len(pending))
        await asyncio.wait(pending, timeout=15)


logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="Career Wave AI & Scraping Engine",
    description="실시간 면접 분석 AI 엔진 및 외부 채용 공고 수집 파이프라인 통합 API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


# ── 사용자 도메인 라우터 ────────────────────────────────────────────────────

from user.resume.api import resume_router  # noqa: E402

app.include_router(resume_router.router, prefix="/internal/user")

from user.interview.api import interview_router  # noqa: E402

app.include_router(interview_router.router, prefix="/internal/user")

from user.interview.websocket import interview_ws_handler  # noqa: E402

app.include_router(interview_ws_handler.router)

# ── 어드민 도메인 라우터 ─────────────────────────────────────────────────────

from admin.api import cs_ai_router  # noqa: E402
from admin.api import report_ai_router  # noqa: E402

app.include_router(cs_ai_router.router, prefix="/api/v1/ai")
app.include_router(report_ai_router.router, prefix="/api/v1/ai")

# from admin.api import scraper_router
# app.include_router(scraper_router.router, prefix="/internal/admin")
app.include_router(ai_metrics_router, prefix="/internal/admin")
