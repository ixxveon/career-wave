from admin.scraping.adapter import require_source_registry_entry
from admin.scraping.exception import ScrapingErrorCode, ScrapingException
from admin.scraping.repository import ScrapingPipelineRecord, ScrapingPipelineRepository
from admin.scraping.schema import PipelineActionRequest, ScrapingActionType


class ActionService:
    def __init__(self, scraping_pipeline_repository: ScrapingPipelineRepository) -> None:
        self._scraping_pipeline_repository = scraping_pipeline_repository

    def request_action(
        self,
        *,
        source_name: str,
        action_type: ScrapingActionType,
        request: PipelineActionRequest,
    ) -> ScrapingPipelineRecord:
        if action_type == ScrapingActionType.RUN:
            return self._validate_run_request(source_name=source_name, request=request)
        if action_type == ScrapingActionType.RETRY:
            return self._validate_retry_request(source_name=source_name, request=request)
        if action_type == ScrapingActionType.TEST:
            return self._validate_test_request(source_name=source_name, request=request)
        raise NotImplementedError("Unsupported scraping action type.")

    def _validate_run_request(
        self,
        *,
        source_name: str,
        request: PipelineActionRequest,
    ) -> ScrapingPipelineRecord:
        if not request.requested_by.strip():
            self._raise_validation_error("requestedBy")

        require_source_registry_entry(source_name)

        pipeline = self._require_pipeline(source_name)
        self._ensure_not_running(pipeline)
        return pipeline

    def _validate_retry_request(
        self,
        *,
        source_name: str,
        request: PipelineActionRequest,
    ) -> ScrapingPipelineRecord:
        if not request.requested_by.strip():
            self._raise_validation_error("requestedBy")

        require_source_registry_entry(source_name)

        pipeline = self._require_pipeline(source_name)
        self._ensure_not_running(pipeline)
        if pipeline.pipeline_status not in {"SUCCESS", "FAILED"}:
            raise ScrapingException(
                error_code=ScrapingErrorCode.SCRAPING_INVALID_REQUEST,
                message="Scraping retry request validation failed.",
                detail={
                    "field": "pipelineStatus",
                    "sourceName": source_name,
                    "pipelineStatus": pipeline.pipeline_status,
                },
            )
        return pipeline

    def _validate_test_request(
        self,
        *,
        source_name: str,
        request: PipelineActionRequest,
    ) -> ScrapingPipelineRecord:
        if not request.requested_by.strip():
            self._raise_validation_error("requestedBy")

        require_source_registry_entry(source_name)

        pipeline = self._require_pipeline(source_name)
        self._ensure_not_running(pipeline)
        return pipeline

    def _require_pipeline(self, source_name: str) -> ScrapingPipelineRecord:
        pipeline = self._scraping_pipeline_repository.find_by_source_name(source_name)
        if pipeline is None:
            raise ScrapingException(
                error_code=ScrapingErrorCode.SCRAPING_PIPELINE_NOT_FOUND,
                detail={"sourceName": source_name},
            )
        return pipeline

    @staticmethod
    def _ensure_not_running(pipeline: ScrapingPipelineRecord) -> None:
        if pipeline.pipeline_status == "RUNNING":
            raise ScrapingException(
                error_code=ScrapingErrorCode.SCRAPING_ALREADY_RUNNING,
                detail={
                    "sourceName": pipeline.source_name,
                    "pipelineStatus": pipeline.pipeline_status,
                },
            )

    def _raise_validation_error(self, field: str) -> None:
        raise ScrapingException(
            error_code=ScrapingErrorCode.SCRAPING_INVALID_REQUEST,
            message="Scraping action request validation failed.",
            detail={"field": field},
        )
