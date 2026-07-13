import asyncio
import logging
from datetime import datetime, timezone
from collections.abc import Callable

from admin.ai_metrics.repository.database import get_session
from admin.scraping.exception import ScrapingErrorCode, ScrapingException
from admin.scraping.repository import ScrapingPipelineRepository
from admin.scraping.schema import ScrapingActionType
from admin.scraping.service import PipelineStatusService
from admin.scraping.task.dispatcher import schedule_scraping_task


log = logging.getLogger(__name__)


class ScrapingAutoRunScheduler:
    def __init__(
        self,
        claim_due_pipelines: Callable[[], list[str]] | None = None,
        schedule_task: Callable[[str, ScrapingActionType], None] | None = None,
    ) -> None:
        self._claim_due_pipelines_fn = claim_due_pipelines or self._claim_due_pipelines
        self._schedule_task = schedule_task or schedule_scraping_task

    async def run_due_pipelines(self) -> int:
        source_names = await asyncio.to_thread(self._claim_due_pipelines_fn)
        for source_name in source_names:
            self._schedule_task(source_name, ScrapingActionType.RUN)
        return len(source_names)

    @staticmethod
    def _claim_due_pipelines() -> list[str]:
        now = datetime.now(timezone.utc)
        with get_session() as session:
            repository = ScrapingPipelineRepository(session)
            status_service = PipelineStatusService(repository)
            source_names: list[str] = []

            for pipeline in repository.find_due_pipelines(now):
                try:
                    status_service.mark_running(pipeline.source_name)
                except ScrapingException as error:
                    if error.error_code == ScrapingErrorCode.SCRAPING_ALREADY_RUNNING:
                        continue
                    log.exception("automatic scraping claim failed: source=%s", pipeline.source_name)
                    continue
                source_names.append(pipeline.source_name)

            session.commit()
            return source_names
