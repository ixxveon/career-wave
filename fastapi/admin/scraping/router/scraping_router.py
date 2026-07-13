from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from admin.ai_metrics.repository.database import get_session
from admin.scraping.exception import ScrapingException, build_error_response
from admin.scraping.repository import ScrapingLogRepository, ScrapingPipelineRepository
from admin.scraping.schema import (
    PipelineActionRequest,
    PipelineActionResponse,
    PipelineBatchActionRequest,
    PipelineDetailResponse,
    PipelineListQueryRequest,
    PipelineLogPageResponse,
    PipelineLogQueryRequest,
    PipelinePageResponse,
    PipelineSummaryResponse,
    ScrapingActionType,
    ScrapingPipelineStatusType,
    ScrapingStatusType,
)
from admin.scraping.service import (
    ActionService,
    BatchActionAggregation,
    BatchActionResultItem,
    BatchActionService,
    PipelineQueryService,
    PipelineStatusService,
)
from admin.scraping.task import schedule_scraping_task
from core.security import verify_internal_secret


router = APIRouter(
    prefix="/internal/scraping",
    tags=["admin-scraping"],
    dependencies=[Depends(verify_internal_secret)],
)

async def _execute_pipeline_action(
    source_name: str,
    action_type: ScrapingActionType,
    request: PipelineActionRequest,
) -> PipelineActionResponse | JSONResponse:
    try:
        with get_session() as session:
            scraping_pipeline_repository = ScrapingPipelineRepository(session)
            action_service = ActionService(scraping_pipeline_repository)
            pipeline_status_service = PipelineStatusService(scraping_pipeline_repository)

            action_service.request_action(
                source_name=source_name,
                action_type=action_type,
                request=request,
            )
            updated_pipeline = pipeline_status_service.mark_running(source_name)
            session.commit()

            schedule_scraping_task(source_name, action_type)

            return PipelineActionResponse(
                sourceName=updated_pipeline.source_name,
                accepted=True,
                runId=f"{action_type.value.lower()}-{uuid4()}",
                requestedAt=datetime.now(timezone.utc),
            )
    except ScrapingException as error:
        return JSONResponse(
            status_code=error.status_code,
            content=build_error_response(error),
        )


@router.get("/pipelines", response_model=PipelinePageResponse)
async def get_pipelines(
    keyword: str | None = None,
    status: ScrapingPipelineStatusType | None = None,
    page: int = 1,
    size: int = 20,
):
    try:
        request = PipelineListQueryRequest(
            keyword=keyword,
            status=status,
            page=page,
            size=size,
        )
        with get_session() as session:
            service = PipelineQueryService(
                scraping_pipeline_repository=ScrapingPipelineRepository(session),
                scraping_log_repository=ScrapingLogRepository(session),
            )
            return PipelinePageResponse.from_record(service.get_pipelines(request))
    except ScrapingException as error:
        return JSONResponse(
            status_code=error.status_code,
            content=build_error_response(error),
        )


@router.get("/pipelines/summary", response_model=PipelineSummaryResponse)
async def get_pipeline_summary():
    try:
        with get_session() as session:
            service = PipelineQueryService(
                scraping_pipeline_repository=ScrapingPipelineRepository(session),
                scraping_log_repository=ScrapingLogRepository(session),
            )
            return PipelineSummaryResponse.from_record(service.get_pipeline_summary())
    except ScrapingException as error:
        return JSONResponse(
            status_code=error.status_code,
            content=build_error_response(error),
        )


@router.get("/pipelines/{sourceName}", response_model=PipelineDetailResponse)
async def get_pipeline_detail(sourceName: str):
    try:
        with get_session() as session:
            service = PipelineQueryService(
                scraping_pipeline_repository=ScrapingPipelineRepository(session),
                scraping_log_repository=ScrapingLogRepository(session),
            )
            return PipelineDetailResponse.from_record(service.get_pipeline_detail(sourceName))
    except ScrapingException as error:
        return JSONResponse(
            status_code=error.status_code,
            content=build_error_response(error),
        )


@router.get("/logs", response_model=PipelineLogPageResponse)
async def get_pipeline_logs(
    sourceName: str | None = None,
    status: ScrapingStatusType | None = None,
    page: int = 1,
    size: int = 20,
):
    try:
        request = PipelineLogQueryRequest(
            sourceName=sourceName,
            status=status,
            page=page,
            size=size,
        )
        with get_session() as session:
            service = PipelineQueryService(
                scraping_pipeline_repository=ScrapingPipelineRepository(session),
                scraping_log_repository=ScrapingLogRepository(session),
            )
            return PipelineLogPageResponse.from_record(
                service.get_pipeline_logs(
                    source_name=request.source_name,
                    status=request.status.value if request.status is not None else None,
                    page=request.page,
                    size=request.size,
                )
            )
    except ScrapingException as error:
        return JSONResponse(
            status_code=error.status_code,
            content=build_error_response(error),
        )


@router.post("/pipelines/{sourceName}/run")
async def run_pipeline(sourceName: str, request: PipelineActionRequest):
    return await _execute_pipeline_action(sourceName, ScrapingActionType.RUN, request)


@router.post("/pipelines/{sourceName}/retry")
async def retry_pipeline(sourceName: str, request: PipelineActionRequest):
    return await _execute_pipeline_action(sourceName, ScrapingActionType.RETRY, request)


@router.post("/pipelines/{sourceName}/test")
async def test_pipeline(sourceName: str, request: PipelineActionRequest):
    return await _execute_pipeline_action(sourceName, ScrapingActionType.TEST, request)


@router.post("/pipelines/batch-run")
async def batch_run_pipelines(request: PipelineBatchActionRequest):
    try:
        with get_session() as session:
            scraping_pipeline_repository = ScrapingPipelineRepository(session)
            action_service = ActionService(scraping_pipeline_repository)
            batch_action_service = BatchActionService(action_service)
            pipeline_status_service = PipelineStatusService(scraping_pipeline_repository)

            action_type = batch_action_service.validate_action_type(request)
            source_names = batch_action_service.validate_source_names(request)
            aggregation = batch_action_service.aggregate_results(
                action_type=action_type,
                source_names=source_names,
                requested_by=request.requested_by,
            )

            updated_results: list[BatchActionResultItem] = []
            for result in aggregation.results:
                if result.accepted:
                    updated_pipeline = pipeline_status_service.mark_running(result.source_name)
                    updated_results.append(
                        BatchActionResultItem(
                            source_name=updated_pipeline.source_name,
                            accepted=True,
                            pipeline_status=updated_pipeline.pipeline_status,
                        )
                    )
                else:
                    updated_results.append(result)

            session.commit()

            for result in updated_results:
                if result.accepted:
                    schedule_scraping_task(result.source_name, action_type)

            return batch_action_service.to_response(
                action_type=action_type,
                aggregation=BatchActionAggregation(
                    requested_count=aggregation.requested_count,
                    accepted_count=aggregation.accepted_count,
                    results=updated_results,
                ),
            )
    except ScrapingException as error:
        return JSONResponse(
            status_code=error.status_code,
            content=build_error_response(error),
        )
