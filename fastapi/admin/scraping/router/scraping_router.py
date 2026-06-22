from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from admin.ai_metrics.repository.database import get_session
from admin.scraping.exception import ScrapingException, build_error_response
from admin.scraping.repository import ScrapingLogRepository, ScrapingPipelineRepository
from admin.scraping.schema import (
    PipelineActionRequest,
    PipelineActionResponse,
    PipelineBatchActionRequest,
    PipelineListQueryRequest,
    PipelineLogQueryRequest,
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
from core.security import verify_internal_secret


router = APIRouter(
    prefix="/internal/scraping",
    tags=["admin-scraping"],
    dependencies=[Depends(verify_internal_secret)],
)


@router.get("/pipelines")
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
            return service.get_pipelines(request)
    except ScrapingException as error:
        return JSONResponse(
            status_code=error.status_code,
            content=build_error_response(error),
        )


@router.get("/pipelines/summary")
async def get_pipeline_summary():
    try:
        with get_session() as session:
            service = PipelineQueryService(
                scraping_pipeline_repository=ScrapingPipelineRepository(session),
                scraping_log_repository=ScrapingLogRepository(session),
            )
            return service.get_pipeline_summary()
    except ScrapingException as error:
        return JSONResponse(
            status_code=error.status_code,
            content=build_error_response(error),
        )


@router.get("/pipelines/{sourceName}")
async def get_pipeline_detail(sourceName: str):
    try:
        with get_session() as session:
            service = PipelineQueryService(
                scraping_pipeline_repository=ScrapingPipelineRepository(session),
                scraping_log_repository=ScrapingLogRepository(session),
            )
            return service.get_pipeline_detail(sourceName)
    except ScrapingException as error:
        return JSONResponse(
            status_code=error.status_code,
            content=build_error_response(error),
        )


@router.get("/logs")
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
            return service.get_pipeline_logs(
                source_name=request.source_name,
                status=request.status.value if request.status is not None else None,
                page=request.page,
                size=request.size,
            )
    except ScrapingException as error:
        return JSONResponse(
            status_code=error.status_code,
            content=build_error_response(error),
        )


@router.post("/pipelines/{sourceName}/run")
async def run_pipeline(sourceName: str, request: PipelineActionRequest):
    try:
        with get_session() as session:
            scraping_pipeline_repository = ScrapingPipelineRepository(session)
            action_service = ActionService(scraping_pipeline_repository)
            pipeline_status_service = PipelineStatusService(scraping_pipeline_repository)

            action_service.request_action(
                source_name=sourceName,
                action_type=ScrapingActionType.RUN,
                request=request,
            )
            updated_pipeline = pipeline_status_service.mark_running(sourceName)
            session.commit()

            return PipelineActionResponse(
                sourceName=updated_pipeline.source_name,
                accepted=True,
                pipelineStatus=updated_pipeline.pipeline_status,
                requestedAt=datetime.now(timezone.utc),
            )
    except ScrapingException as error:
        return JSONResponse(
            status_code=error.status_code,
            content=build_error_response(error),
        )


@router.post("/pipelines/{sourceName}/retry")
async def retry_pipeline(sourceName: str, request: PipelineActionRequest):
    try:
        with get_session() as session:
            scraping_pipeline_repository = ScrapingPipelineRepository(session)
            action_service = ActionService(scraping_pipeline_repository)
            pipeline_status_service = PipelineStatusService(scraping_pipeline_repository)

            action_service.request_action(
                source_name=sourceName,
                action_type=ScrapingActionType.RETRY,
                request=request,
            )
            updated_pipeline = pipeline_status_service.mark_running(sourceName)
            session.commit()

            return PipelineActionResponse(
                sourceName=updated_pipeline.source_name,
                accepted=True,
                pipelineStatus=updated_pipeline.pipeline_status,
                requestedAt=datetime.now(timezone.utc),
            )
    except ScrapingException as error:
        return JSONResponse(
            status_code=error.status_code,
            content=build_error_response(error),
        )


@router.post("/pipelines/{sourceName}/test")
async def test_pipeline(sourceName: str, request: PipelineActionRequest):
    try:
        with get_session() as session:
            scraping_pipeline_repository = ScrapingPipelineRepository(session)
            action_service = ActionService(scraping_pipeline_repository)
            pipeline_status_service = PipelineStatusService(scraping_pipeline_repository)

            action_service.request_action(
                source_name=sourceName,
                action_type=ScrapingActionType.TEST,
                request=request,
            )
            updated_pipeline = pipeline_status_service.mark_running(sourceName)
            session.commit()

            return PipelineActionResponse(
                sourceName=updated_pipeline.source_name,
                accepted=True,
                pipelineStatus=updated_pipeline.pipeline_status,
                requestedAt=datetime.now(timezone.utc),
            )
    except ScrapingException as error:
        return JSONResponse(
            status_code=error.status_code,
            content=build_error_response(error),
        )


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
