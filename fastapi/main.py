import asyncio
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

log = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    scheduler.start()
    yield
    scheduler.shutdown()
    # Graceful shutdown: 진행 중인 AI 파이프라인 태스크 최대 15초 대기
    pending = [t for t in asyncio.all_tasks() if not t.done()]
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

from user.api import interview_router  # noqa: E402

app.include_router(interview_router.router, prefix="/internal/user")

from user.websocket import interview_ws_handler  # noqa: E402

app.include_router(interview_ws_handler.router)

# ── 어드민 도메인 라우터 (예정) ─────────────────────────────────────────────
# from admin.api import scraper_router
# app.include_router(scraper_router.router, prefix="/internal/admin")
