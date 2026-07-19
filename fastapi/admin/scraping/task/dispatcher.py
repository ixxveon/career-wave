import asyncio
import logging

from admin.scraping.adapter import GroupByScraper, JumpitScraper, SaraminScraper, WantedScraper
from admin.scraping.schema import ScrapingActionType
from admin.scraping.service import JobNoticeNormalizer, PipelineRunnerService
from admin.scraping.task.scraping_task import ScrapingTask, ScrapingTaskResult


log = logging.getLogger(__name__)
_bg_tasks: set[asyncio.Task[ScrapingTaskResult]] = set()


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


def schedule_scraping_task(source_name: str, action_type: ScrapingActionType) -> None:
    task = asyncio.create_task(_run_scraping_task(source_name, action_type))
    _bg_tasks.add(task)
    task.add_done_callback(_on_bg_task_done)
