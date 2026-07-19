import asyncio
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from admin.ai_metrics.client.openai_client import get_ai_metrics_openai_client
from admin.ai_metrics.router import router as ai_metrics_router
from admin.scraping.scheduler import ScrapingAutoRunScheduler
from admin.scraping.task import get_pending_scraping_tasks, wait_for_pending_scraping_tasks
from core.config import get_settings
from core.middleware import InternalRouteGuardMiddleware
from core.redis import close_redis
from user.resume.service.webhook_outbox import init_outbox_db, run_outbox_worker

log = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()
scraping_auto_run_scheduler = ScrapingAutoRunScheduler()


def _outbox_worker_done_callback(task: asyncio.Task) -> None:
    if not task.cancelled() and task.exception() is not None:
        log.error("outbox worker crashed: %s", task.exception(), exc_info=task.exception())


def _validate_required_settings() -> None:
    """필수 환경 변수 누락 시 시작 단계에서 즉시 실패한다."""
    settings = get_settings()
    missing = [name for name, value in [
        ("WEBHOOK_SECRET", settings.webhook_secret),
        ("JWT_SECRET", settings.jwt_secret),
        ("OPENAI_API_KEY", settings.openai_api_key),
    ] if not value or not value.strip()]
    if missing:
        raise RuntimeError(f"필수 환경 변수가 설정되지 않았습니다: {', '.join(missing)}")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    _validate_required_settings()
    init_outbox_db()
    outbox_task = asyncio.create_task(run_outbox_worker())
    outbox_task.add_done_callback(_outbox_worker_done_callback)
    scheduler.add_job(
        scraping_auto_run_scheduler.run_due_pipelines,
        "interval",
        minutes=5,
        id="scraping-auto-run",
        replace_existing=True,
        coalesce=True,
        max_instances=1,
    )
    scheduler.start()
    yield
    scheduler.shutdown()
    await wait_for_pending_scraping_tasks()
    if get_ai_metrics_openai_client.cache_info().currsize > 0:
        await get_ai_metrics_openai_client().close()
        get_ai_metrics_openai_client.cache_clear()
    await close_redis()
    outbox_task.cancel()
    try:
        await outbox_task
    except asyncio.CancelledError:
        pass
    # Graceful shutdown: 진행 중인 AI 파이프라인 태스크 최대 15초 대기
    current = asyncio.current_task()
    scraping_tasks = set(get_pending_scraping_tasks())
    pending = [
        task
        for task in asyncio.all_tasks()
        if not task.done() and task is not current and task not in scraping_tasks
    ]
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
app.add_middleware(InternalRouteGuardMiddleware)


@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


# ── 사용자 도메인 라우터 ────────────────────────────────────────────────────

from user.resume.api import resume_router  # noqa: E402

app.include_router(resume_router.router, prefix="/internal/user", include_in_schema=False)

from user.interview.api import interview_router  # noqa: E402

app.include_router(interview_router.router, prefix="/internal/user", include_in_schema=False)

from user.interview.websocket import interview_ws_handler  # noqa: E402

app.include_router(interview_ws_handler.router)

# ── 어드민 도메인 라우터 ─────────────────────────────────────────────────────

from admin.api import cs_ai_router  # noqa: E402
from admin.api import report_ai_router  # noqa: E402
from admin.scraping.router import scraping_router  # noqa: E402

app.include_router(cs_ai_router.router, prefix="/api/v1/ai")
app.include_router(report_ai_router.router, prefix="/api/v1/ai")
app.include_router(scraping_router.router)

# from admin.api import scraper_router
# app.include_router(scraper_router.router, prefix="/internal/admin")
app.include_router(ai_metrics_router, prefix="/internal/admin", include_in_schema=False)
