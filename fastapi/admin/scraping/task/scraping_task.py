import asyncio
from dataclasses import dataclass
from time import perf_counter
from typing import Protocol

from admin.ai_metrics.repository.database import get_session
from admin.scraping.exception import ScrapingErrorCode, ScrapingException
from admin.scraping.repository import (
    JobNoticeRepository,
    ScrapingLogRepository,
    ScrapingPipelineRecord,
    ScrapingPipelineRepository,
)
from admin.scraping.schema import ScrapingActionType
from admin.scraping.service.job_notice_cache_invalidator import invalidate_job_notice_caches
from admin.scraping.service import (
    JobNoticeDedupService,
    JobNoticeNormalizer,
    NormalizedJobNotice,
    PipelineRunnerService,
    PipelineStatusService,
    ScrapingLogService,
    ScrapingRunResult,
)
from admin.scraping.adapter import ScrapingDetailMetrics


class _PipelineStatusService(Protocol):
    def mark_success(self, source_name: str, total_count: int, duration_ms: int) -> ScrapingPipelineRecord:
        ...

    def mark_failed(self, source_name: str, error_message: str | None) -> ScrapingPipelineRecord:
        ...


class _ScrapingLogService(Protocol):
    def log_test(
        self,
        source_name: str,
        scraping_pipeline_id: int | None,
        scraping_status: str,
        total_count: int | None,
        error_message: str | None,
    ) -> None:
        ...

    def log_success(self, source_name: str, scraping_pipeline_id: int | None, total_count: int) -> None:
        ...

    def log_failure(self, source_name: str, scraping_pipeline_id: int | None, error_message: str | None) -> None:
        ...


class _JobNoticeDedupService(Protocol):
    def save_for_run(self, notices: list[NormalizedJobNotice]) -> None:
        ...

    def save_for_retry(self, notices: list[NormalizedJobNotice]) -> None:
        ...


@dataclass(frozen=True)
class ScrapingTaskResult:
    source_name: str
    action_type: ScrapingActionType
    pipeline_status: str
    total_count: int | None = None
    duration_ms: int | None = None
    detail_metrics: ScrapingDetailMetrics | None = None


class ScrapingTask:
    """Background task entry point for scraping pipeline execution."""

    def __init__(
        self,
        pipeline_runner_service: PipelineRunnerService,
        job_notice_normalizer: JobNoticeNormalizer,
        pipeline_status_service: _PipelineStatusService | None = None,
        scraping_log_service: _ScrapingLogService | None = None,
        job_notice_dedup_service: _JobNoticeDedupService | None = None,
    ) -> None:
        self._pipeline_runner_service = pipeline_runner_service
        self._job_notice_normalizer = job_notice_normalizer
        self._pipeline_status_service = pipeline_status_service
        self._scraping_log_service = scraping_log_service
        self._job_notice_dedup_service = job_notice_dedup_service

    async def run(
        self,
        *,
        source_name: str,
        action_type: ScrapingActionType,
    ) -> ScrapingTaskResult:
        result = await asyncio.to_thread(
            self._run_sync,
            source_name=source_name,
            action_type=action_type,
        )
        if action_type != ScrapingActionType.TEST and result.pipeline_status == "SUCCESS":
            await invalidate_job_notice_caches()
        return result

    def _run_sync(
        self,
        *,
        source_name: str,
        action_type: ScrapingActionType,
    ) -> ScrapingTaskResult:
        started_at = perf_counter()
        if self._has_any_injected_service():
            self._ensure_required_injected_services(action_type)
            assert self._pipeline_status_service is not None
            assert self._scraping_log_service is not None
            return self._execute_with_services(
                source_name=source_name,
                action_type=action_type,
                started_at=started_at,
                pipeline_status_service=self._pipeline_status_service,
                scraping_log_service=self._scraping_log_service,
                job_notice_dedup_service=self._job_notice_dedup_service,
            )

        with get_session() as session:
            pipeline_status_service = PipelineStatusService(ScrapingPipelineRepository(session))
            scraping_log_service = ScrapingLogService(ScrapingLogRepository(session))
            job_notice_dedup_service = JobNoticeDedupService(JobNoticeRepository(session))

            try:
                result = self._execute_with_services(
                    source_name=source_name,
                    action_type=action_type,
                    started_at=started_at,
                    pipeline_status_service=pipeline_status_service,
                    scraping_log_service=scraping_log_service,
                    job_notice_dedup_service=job_notice_dedup_service,
                )
                session.commit()
                return result
            except Exception:
                session.commit()
                raise

    def _has_any_injected_service(self) -> bool:
        return (
            self._pipeline_status_service is not None
            or self._scraping_log_service is not None
            or self._job_notice_dedup_service is not None
        )

    def _ensure_required_injected_services(self, action_type: ScrapingActionType) -> None:
        missing_services: list[str] = []
        if self._pipeline_status_service is None:
            missing_services.append("pipeline_status_service")
        if self._scraping_log_service is None:
            missing_services.append("scraping_log_service")
        if action_type != ScrapingActionType.TEST and self._job_notice_dedup_service is None:
            missing_services.append("job_notice_dedup_service")

        if missing_services:
            raise ValueError(f"Missing injected scraping services: {', '.join(missing_services)}")

    def _execute_with_services(
        self,
        *,
        source_name: str,
        action_type: ScrapingActionType,
        started_at: float,
        pipeline_status_service: _PipelineStatusService,
        scraping_log_service: _ScrapingLogService,
        job_notice_dedup_service: _JobNoticeDedupService | None,
    ) -> ScrapingTaskResult:
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
                return result

            dispatch_result = self._pipeline_runner_service.dispatch(
                action_type=action_type,
                source_name=source_name,
            )
            if isinstance(dispatch_result, ScrapingRunResult):
                raw_notices = dispatch_result.notices
                detail_metrics = dispatch_result.detail_metrics
            else:
                raw_notices = dispatch_result
                detail_metrics = ScrapingDetailMetrics()

            self._ensure_detail_completeness(source_name=source_name, metrics=detail_metrics)
            normalized_notices = [
                self._job_notice_normalizer.normalize(
                    source_name=source_name,
                    raw_notice=raw_notice,
                )
                for raw_notice in raw_notices
            ]

            if job_notice_dedup_service is None:
                raise RuntimeError("job_notice_dedup_service is required for scraping execution.")

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
                detail_metrics=detail_metrics,
            )
            self._handle_success(
                result,
                pipeline_status_service=pipeline_status_service,
                scraping_log_service=scraping_log_service,
            )
            return result
        except ScrapingException as error:
            self._handle_failure(
                source_name=source_name,
                action_type=action_type,
                error=error,
                pipeline_status_service=pipeline_status_service,
                scraping_log_service=scraping_log_service,
            )
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
            raise wrapped_error from error

    @staticmethod
    def _calculate_duration_ms(started_at: float) -> int:
        return int((perf_counter() - started_at) * 1000)

    @staticmethod
    def _ensure_detail_completeness(*, source_name: str, metrics: ScrapingDetailMetrics) -> None:
        if metrics.attempted_count > 0 and metrics.succeeded_count == 0:
            raise ScrapingException(
                error_code=ScrapingErrorCode.SCRAPING_DETAIL_COMPLETENESS_FAILED,
                detail={
                    "sourceName": source_name,
                    "detailAttemptedCount": metrics.attempted_count,
                    "detailFailedCount": metrics.failed_count,
                    "detailTimeoutCount": metrics.timeout_count,
                    "detailRetryCount": metrics.retry_count,
                },
            )

    def _handle_success(
        self,
        result: ScrapingTaskResult,
        *,
        pipeline_status_service: _PipelineStatusService,
        scraping_log_service: _ScrapingLogService,
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
        pipeline_status_service: _PipelineStatusService,
        scraping_log_service: _ScrapingLogService,
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
