import asyncio
from dataclasses import dataclass
from time import perf_counter

from admin.ai_metrics.repository.database import get_session
from admin.scraping.exception import ScrapingErrorCode, ScrapingException
from admin.scraping.repository import JobNoticeRepository, ScrapingLogRepository, ScrapingPipelineRepository
from admin.scraping.schema import ScrapingActionType
from admin.scraping.service import (
    JobNoticeDedupService,
    JobNoticeNormalizer,
    PipelineRunnerService,
    PipelineStatusService,
    ScrapingLogService,
)


@dataclass(frozen=True)
class ScrapingTaskResult:
    source_name: str
    action_type: ScrapingActionType
    pipeline_status: str
    total_count: int | None = None
    duration_ms: int | None = None


class ScrapingTask:
    """Background task entry point for scraping pipeline execution."""

    def __init__(
        self,
        pipeline_runner_service: PipelineRunnerService,
        job_notice_normalizer: JobNoticeNormalizer,
    ) -> None:
        self._pipeline_runner_service = pipeline_runner_service
        self._job_notice_normalizer = job_notice_normalizer

    async def run(
        self,
        *,
        source_name: str,
        action_type: ScrapingActionType,
    ) -> ScrapingTaskResult:
        return await asyncio.to_thread(
            self._run_sync,
            source_name=source_name,
            action_type=action_type,
        )

    def _run_sync(
        self,
        *,
        source_name: str,
        action_type: ScrapingActionType,
    ) -> ScrapingTaskResult:
        started_at = perf_counter()
        with get_session() as session:
            pipeline_status_service = PipelineStatusService(ScrapingPipelineRepository(session))
            scraping_log_service = ScrapingLogService(ScrapingLogRepository(session))
            job_notice_dedup_service = JobNoticeDedupService(JobNoticeRepository(session))

            try:
                if action_type == ScrapingActionType.TEST:
                    test_passed = self._pipeline_runner_service.test(source_name)
                    if not test_passed:
                        raise ScrapingException(
                            error_code=ScrapingErrorCode.SCRAPING_TEST_FAILED,
                            detail={"sourceName": source_name},
                        )
                    result = ScrapingTaskResult(
                        source_name=source_name,
                        action_type=action_type,
                        pipeline_status="SUCCESS",
                        total_count=0,
                        duration_ms=self._calculate_duration_ms(started_at),
                    )
                    self._handle_success(
                        result,
                        pipeline_status_service=pipeline_status_service,
                        scraping_log_service=scraping_log_service,
                    )
                    session.commit()
                    return result

                raw_notices = self._pipeline_runner_service.dispatch(
                    action_type=action_type,
                    source_name=source_name,
                )
                normalized_notices = [
                    self._job_notice_normalizer.normalize(
                        source_name=source_name,
                        raw_notice=raw_notice,
                    )
                    for raw_notice in raw_notices
                ]

                if action_type == ScrapingActionType.RUN:
                    job_notice_dedup_service.save_for_run(normalized_notices)
                elif action_type == ScrapingActionType.RETRY:
                    job_notice_dedup_service.save_for_retry(normalized_notices)
                else:
                    raise NotImplementedError("Unsupported scraping action type.")

                result = ScrapingTaskResult(
                    source_name=source_name,
                    action_type=action_type,
                    pipeline_status="SUCCESS",
                    total_count=len(normalized_notices),
                    duration_ms=self._calculate_duration_ms(started_at),
                )
                self._handle_success(
                    result,
                    pipeline_status_service=pipeline_status_service,
                    scraping_log_service=scraping_log_service,
                )
                session.commit()
                return result
            except ScrapingException as error:
                self._handle_failure(
                    source_name=source_name,
                    action_type=action_type,
                    error=error,
                    pipeline_status_service=pipeline_status_service,
                    scraping_log_service=scraping_log_service,
                )
                session.commit()
                raise
            except Exception as error:
                wrapped_error = self._wrap_unexpected_error(
                    source_name=source_name,
                    action_type=action_type,
                    error=error,
                )
                self._handle_failure(
                    source_name=source_name,
                    action_type=action_type,
                    error=wrapped_error,
                    pipeline_status_service=pipeline_status_service,
                    scraping_log_service=scraping_log_service,
                )
                session.commit()
                raise wrapped_error from error

    @staticmethod
    def _calculate_duration_ms(started_at: float) -> int:
        return int((perf_counter() - started_at) * 1000)

    def _handle_success(
        self,
        result: ScrapingTaskResult,
        *,
        pipeline_status_service: PipelineStatusService,
        scraping_log_service: ScrapingLogService,
    ) -> None:
        updated_pipeline = pipeline_status_service.mark_success(
            result.source_name,
            total_count=result.total_count or 0,
            duration_ms=result.duration_ms or 0,
        )

        if result.action_type == ScrapingActionType.TEST:
            scraping_log_service.log_test(
                source_name=result.source_name,
                scraping_pipeline_id=updated_pipeline.scraping_pipeline_id,
                scraping_status="SUCCESS",
                total_count=result.total_count,
                error_message=None,
            )
            return

        scraping_log_service.log_success(
            source_name=result.source_name,
            scraping_pipeline_id=updated_pipeline.scraping_pipeline_id,
            total_count=result.total_count or 0,
        )

    def _handle_failure(
        self,
        *,
        source_name: str,
        action_type: ScrapingActionType,
        error: ScrapingException,
        pipeline_status_service: PipelineStatusService,
        scraping_log_service: ScrapingLogService,
    ) -> None:
        updated_pipeline = pipeline_status_service.mark_failed(
            source_name,
            error_message=error.message,
        )

        if action_type == ScrapingActionType.TEST:
            scraping_log_service.log_test(
                source_name=source_name,
                scraping_pipeline_id=updated_pipeline.scraping_pipeline_id,
                scraping_status="FAILED",
                total_count=None,
                error_message=error.message,
            )
            return

        scraping_log_service.log_failure(
            source_name=source_name,
            scraping_pipeline_id=updated_pipeline.scraping_pipeline_id,
            error_message=error.message,
        )

    @staticmethod
    def _wrap_unexpected_error(
        *,
        source_name: str,
        action_type: ScrapingActionType,
        error: Exception,
    ) -> ScrapingException:
        if action_type == ScrapingActionType.TEST:
            return ScrapingException(
                error_code=ScrapingErrorCode.SCRAPING_TEST_FAILED,
                detail={
                    "sourceName": source_name,
                    "message": str(error),
                },
            )

        return ScrapingException(
            error_code=ScrapingErrorCode.SCRAPING_EXECUTION_FAILED,
            detail={
                "sourceName": source_name,
                "message": str(error),
            },
        )
