import asyncio
import logging

from admin.scraping.adapter import GroupByScraper, JumpitScraper, SaraminScraper, WantedScraper
from admin.scraping.schema import ScrapingActionType
from admin.scraping.service import JobNoticeNormalizer, PipelineRunnerService
from admin.scraping.task.scraping_task import ScrapingTask, ScrapingTaskResult


log = logging.getLogger(__name__)
_bg_tasks: set[asyncio.Task[ScrapingTaskResult]] = set()
DEFAULT_SHUTDOWN_TIMEOUT_SECONDS = 15


def _create_scraping_task() -> ScrapingTask:
    return ScrapingTask(
        pipeline_runner_service=PipelineRunnerService(
            [
                GroupByScraper(),
                JumpitScraper(),
                WantedScraper(),
                SaraminScraper(),
            ]
        ),
        job_notice_normalizer=JobNoticeNormalizer(),
    )


async def _run_scraping_task(source_name: str, action_type: ScrapingActionType) -> ScrapingTaskResult:
    return await _create_scraping_task().run(
        source_name=source_name,
        action_type=action_type,
    )


def _on_bg_task_done(task: asyncio.Task[ScrapingTaskResult]) -> None:
    _bg_tasks.discard(task)
    try:
        result = task.result()
        log.info(
            "scraping task completed: source=%s action=%s status=%s total_count=%s duration_ms=%s detail_metrics=%s",
            result.source_name,
            result.action_type.value,
            result.pipeline_status,
            result.total_count,
            result.duration_ms,
            result.detail_metrics,
        )
    except asyncio.CancelledError:
        log.info("scraping task cancelled")
    except Exception:
        log.exception("scraping task failed")


def get_pending_scraping_tasks() -> tuple[asyncio.Task[ScrapingTaskResult], ...]:
    """Return the tasks that are still owned by this worker process."""
    return tuple(task for task in _bg_tasks if not task.done())


async def wait_for_pending_scraping_tasks(
    *,
    timeout: float = DEFAULT_SHUTDOWN_TIMEOUT_SECONDS,
) -> tuple[asyncio.Task[ScrapingTaskResult], ...]:
    """Wait for active scraping tasks and return tasks that outlive the timeout."""
    tasks = get_pending_scraping_tasks()
    if not tasks:
        return ()

    log.info("waiting for %d scraping tasks to finish (timeout=%ss)", len(tasks), timeout)
    _, pending = await asyncio.wait(tasks, timeout=timeout)

    if pending:
        task_names = ", ".join(task.get_name() for task in pending)
        log.warning("scraping tasks still pending after graceful shutdown wait: %s", task_names)

    return tuple(pending)


async def cancel_pending_scraping_tasks() -> None:
    """Cancel tracked tasks for test cleanup only.

    Scraping execution uses ``asyncio.to_thread()``, so application shutdown must
    wait gracefully instead of treating cancellation as a safe process stop.
    """
    tasks = get_pending_scraping_tasks()
    for task in tasks:
        task.cancel()
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)


def schedule_scraping_task(source_name: str, action_type: ScrapingActionType) -> None:
    task = asyncio.create_task(
        _run_scraping_task(source_name, action_type),
        name=f"scraping:{action_type.value.lower()}:{source_name}",
    )
    _bg_tasks.add(task)
    task.add_done_callback(_on_bg_task_done)
