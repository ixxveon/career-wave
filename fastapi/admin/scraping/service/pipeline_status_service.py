from datetime import datetime, timezone

from admin.scraping.exception import ScrapingErrorCode, ScrapingException
from admin.scraping.repository import ScrapingPipelineRecord, ScrapingPipelineRepository


class PipelineStatusService:
    def __init__(self, scraping_pipeline_repository: ScrapingPipelineRepository) -> None:
        self._scraping_pipeline_repository = scraping_pipeline_repository

    def mark_running(self, source_name: str) -> ScrapingPipelineRecord:
        pipeline = self._scraping_pipeline_repository.mark_running(
            source_name,
            started_at=datetime.now(timezone.utc),
        )
        if pipeline is None:
            current_status = self._scraping_pipeline_repository.find_status_by_source_name(source_name)
            if current_status is None:
                raise ScrapingException(
                    error_code=ScrapingErrorCode.SCRAPING_PIPELINE_NOT_FOUND,
                    detail={"sourceName": source_name},
                )
            if current_status == "RUNNING":
                raise ScrapingException(
                    error_code=ScrapingErrorCode.SCRAPING_ALREADY_RUNNING,
                    detail={"sourceName": source_name},
                )
            raise ScrapingException(
                error_code=ScrapingErrorCode.FASTAPI_INTERNAL_ERROR,
                detail={"sourceName": source_name},
            )
        return pipeline

    def mark_success(self, source_name: str, total_count: int, duration_ms: int) -> ScrapingPipelineRecord:
        pipeline = self._scraping_pipeline_repository.mark_success(
            source_name,
            succeeded_at=datetime.now(timezone.utc),
            total_count=total_count,
            duration_ms=duration_ms,
        )
        if pipeline is None:
            raise ScrapingException(
                error_code=ScrapingErrorCode.SCRAPING_PIPELINE_NOT_FOUND,
                detail={"sourceName": source_name},
            )
        return pipeline

    def mark_failed(self, source_name: str, error_message: str | None) -> ScrapingPipelineRecord:
        pipeline = self._scraping_pipeline_repository.mark_failed(
            source_name,
            failed_at=datetime.now(timezone.utc),
            error_message=error_message,
        )
        if pipeline is None:
            raise ScrapingException(
                error_code=ScrapingErrorCode.SCRAPING_PIPELINE_NOT_FOUND,
                detail={"sourceName": source_name},
            )
        return pipeline
