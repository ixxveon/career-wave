from dataclasses import dataclass
from datetime import datetime, timezone

from admin.scraping.adapter import require_source_registry_entry
from admin.scraping.exception import ScrapingErrorCode, ScrapingException
from admin.scraping.schema import (
    PipelineActionRequest,
    PipelineBatchActionItemResponse,
    PipelineBatchActionRequest,
    PipelineBatchActionResponse,
    ScrapingActionType,
)
from admin.scraping.service.action_service import ActionService


@dataclass(frozen=True)
class BatchActionResultItem:
    source_name: str
    accepted: bool
    pipeline_status: str


@dataclass(frozen=True)
class BatchActionAggregation:
    requested_count: int
    accepted_count: int
    results: list[BatchActionResultItem]


class BatchActionService:
    SUPPORTED_BATCH_ACTION_TYPES = {
        ScrapingActionType.RUN,
        ScrapingActionType.RETRY,
        ScrapingActionType.TEST,
    }

    def __init__(self, action_service: ActionService) -> None:
        self._action_service = action_service

    def validate_action_type(self, request: PipelineBatchActionRequest) -> ScrapingActionType:
        if request.action_type not in self.SUPPORTED_BATCH_ACTION_TYPES:
            raise ScrapingException(
                error_code=ScrapingErrorCode.SCRAPING_INVALID_REQUEST,
                message="Scraping batch action request validation failed.",
                detail={
                    "field": "actionType",
                    "actionType": request.action_type,
                },
            )
        return request.action_type

    def validate_source_names(self, request: PipelineBatchActionRequest) -> list[str]:
        normalized_source_names: list[str] = []
        seen_source_names: set[str] = set()
        for index, source_name in enumerate(request.source_names):
            normalized_source_name = source_name.strip()
            if not normalized_source_name:
                raise ScrapingException(
                    error_code=ScrapingErrorCode.SCRAPING_INVALID_REQUEST,
                    message="Scraping batch action request validation failed.",
                    detail={
                        "field": "sourceNames",
                        "index": index,
                    },
                )

            if normalized_source_name in seen_source_names:
                raise ScrapingException(
                    error_code=ScrapingErrorCode.SCRAPING_INVALID_REQUEST,
                    message="Scraping batch action request validation failed.",
                    detail={
                        "field": "sourceNames",
                        "index": index,
                        "sourceName": normalized_source_name,
                    },
                )

            require_source_registry_entry(normalized_source_name)
            seen_source_names.add(normalized_source_name)
            normalized_source_names.append(normalized_source_name)

        return normalized_source_names

    def aggregate_results(
        self,
        *,
        action_type: ScrapingActionType,
        source_names: list[str],
        requested_by: str,
    ) -> BatchActionAggregation:
        results: list[BatchActionResultItem] = []

        for source_name in source_names:
            try:
                pipeline = self._action_service.request_action(
                    source_name=source_name,
                    action_type=action_type,
                    request=PipelineActionRequest(requestedBy=requested_by),
                )
                results.append(
                    BatchActionResultItem(
                        source_name=source_name,
                        accepted=True,
                        pipeline_status=pipeline.pipeline_status,
                    )
                )
            except ScrapingException as exc:
                pipeline_status = self._extract_pipeline_status(exc)
                results.append(
                    BatchActionResultItem(
                        source_name=source_name,
                        accepted=False,
                        pipeline_status=pipeline_status,
                    )
                )

        accepted_count = sum(1 for result in results if result.accepted)
        return BatchActionAggregation(
            requested_count=len(source_names),
            accepted_count=accepted_count,
            results=results,
        )

    def to_response(
        self,
        *,
        action_type: ScrapingActionType,
        aggregation: BatchActionAggregation,
    ) -> PipelineBatchActionResponse:
        return PipelineBatchActionResponse(
            actionType=action_type,
            requestedCount=aggregation.requested_count,
            acceptedCount=aggregation.accepted_count,
            results=[
                PipelineBatchActionItemResponse(
                    sourceName=result.source_name,
                    accepted=result.accepted,
                    message=self._build_result_message(action_type, result),
                )
                for result in aggregation.results
            ],
            requestedAt=datetime.now(timezone.utc),
        )

    @staticmethod
    def _build_result_message(action_type: ScrapingActionType, result: BatchActionResultItem) -> str:
        outcome = "accepted" if result.accepted else "rejected"
        return (
            f"{action_type.value} action {outcome}. "
            f"pipelineStatus={result.pipeline_status}"
        )

    @staticmethod
    def _extract_pipeline_status(exc: ScrapingException) -> str:
        detail = exc.detail if isinstance(exc.detail, dict) else {}
        pipeline_status = detail.get("pipelineStatus")
        if isinstance(pipeline_status, str) and pipeline_status:
            return pipeline_status
        return "FAILED"
