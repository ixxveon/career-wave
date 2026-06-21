from admin.scraping.exception import ScrapingErrorCode, ScrapingException
from admin.scraping.repository import (
    ScrapingLogPageRecord,
    ScrapingLogRepository,
    ScrapingPipelinePageRecord,
    ScrapingPipelineRecord,
    ScrapingPipelineRepository,
    ScrapingPipelineSummaryRecord,
)
from admin.scraping.schema import PipelineListQueryRequest


class PipelineQueryService:
    def __init__(
        self,
        scraping_pipeline_repository: ScrapingPipelineRepository,
        scraping_log_repository: ScrapingLogRepository,
    ) -> None:
        self._scraping_pipeline_repository = scraping_pipeline_repository
        self._scraping_log_repository = scraping_log_repository

    def get_pipelines(
        self,
        request: PipelineListQueryRequest,
    ) -> ScrapingPipelinePageRecord:
        self._validate_pipeline_list_request(request)
        return self._scraping_pipeline_repository.find_pipelines(
            keyword=request.keyword,
            status=request.status.value if request.status is not None else None,
            page=request.page,
            size=request.size,
        )

    def get_pipeline_summary(self) -> ScrapingPipelineSummaryRecord:
        return self._scraping_pipeline_repository.aggregate_summary()

    def get_pipeline_detail(self, source_name: str) -> ScrapingPipelineRecord:
        pipeline = self._scraping_pipeline_repository.find_by_source_name(source_name)
        if pipeline is None:
            raise ScrapingException(
                error_code=ScrapingErrorCode.SCRAPING_PIPELINE_NOT_FOUND,
                detail={"sourceName": source_name},
            )
        return pipeline

    def get_pipeline_logs(
        self,
        *,
        source_name: str | None,
        status: str | None,
        page: int,
        size: int,
    ) -> ScrapingLogPageRecord:
        self._validate_log_list_request(page=page, size=size)
        return self._scraping_log_repository.find_logs(
            source_name=source_name,
            scraping_status=status,
            page=page,
            size=size,
        )

    def _validate_pipeline_list_request(self, request: PipelineListQueryRequest) -> None:
        if request.page < 1:
            self._raise_validation_error("page")
        if request.size < 1:
            self._raise_validation_error("size")

    def _validate_log_list_request(self, *, page: int, size: int) -> None:
        if page < 1:
            self._raise_validation_error("page")
        if size < 1:
            self._raise_validation_error("size")

    def _raise_validation_error(self, field: str) -> None:
        raise ScrapingException(
            error_code=ScrapingErrorCode.FASTAPI_INTERNAL_ERROR,
            message="Pipeline list request validation failed.",
            detail={"field": field},
        )
