from datetime import datetime

from fastapi import APIRouter, Depends
from fastapi import Path as FastApiPath
from fastapi.responses import JSONResponse

from admin.ai_metrics.client import MockVectorStoreClient
from admin.ai_metrics.exception import AiMetricsErrorCode, AiMetricsException, build_error_response
from admin.ai_metrics.repository import (
    AiModelRepository,
    AiOpsSettingRepository,
    AiUsageLogRepository,
    RagDocumentRepository,
    get_session,
)
from admin.ai_metrics.schema import (
    DomainUsageRequest,
    HeavyUsersRequest,
    OpsSettingSyncRequest,
    RagIndexStartRequest,
    SummaryRequest,
    TokenTrendRequest,
    UsageLogCreateRequest,
    UsageLogCreateResponse,
    UsageLogSearchRequest,
)
from admin.ai_metrics.service import (
    OpsSettingsService,
    RagIndexDeleteService,
    RagIndexService,
    UsageLogService,
    UsageMetricsService,
)
from core.security import verify_internal_secret


router = APIRouter(
    prefix="/ai-metrics",
    tags=["admin-ai-metrics-internal"],
    dependencies=[Depends(verify_internal_secret)],
)


@router.post("/usage/summary")
async def usage_summary(request: SummaryRequest):
    try:
        with get_session() as session:
            service = UsageMetricsService(
                usage_log_repository=AiUsageLogRepository(session),
                ai_ops_setting_repository=AiOpsSettingRepository(session),
                ai_model_repository=AiModelRepository(session),
            )
            return service.get_summary(
                created_from=_parse_iso_datetime(request.from_),
                created_to=_parse_iso_datetime(request.to),
                feature_type=request.feature_type.value if request.feature_type else None,
            )
    except AiMetricsException as error:
        return JSONResponse(
            status_code=error.status_code,
            content=build_error_response(error),
        )


@router.post("/usage/domain-usage")
async def domain_usage(request: DomainUsageRequest):
    try:
        with get_session() as session:
            service = UsageMetricsService(
                usage_log_repository=AiUsageLogRepository(session),
                ai_ops_setting_repository=AiOpsSettingRepository(session),
                ai_model_repository=AiModelRepository(session),
            )
            return service.get_domain_usage(
                created_from=_parse_iso_datetime(request.from_),
                created_to=_parse_iso_datetime(request.to),
            )
    except AiMetricsException as error:
        return JSONResponse(
            status_code=error.status_code,
            content=build_error_response(error),
        )


@router.post("/usage/token-trend")
async def token_trend(request: TokenTrendRequest):
    try:
        with get_session() as session:
            service = UsageMetricsService(
                usage_log_repository=AiUsageLogRepository(session),
                ai_ops_setting_repository=AiOpsSettingRepository(session),
                ai_model_repository=AiModelRepository(session),
            )
            return service.get_token_trend(
                created_from=_parse_iso_datetime(request.from_),
                created_to=_parse_iso_datetime(request.to),
                interval=request.interval,
                feature_type=request.feature_type.value if request.feature_type else None,
            )
    except AiMetricsException as error:
        return JSONResponse(
            status_code=error.status_code,
            content=build_error_response(error),
        )


@router.post("/usage/heavy-users")
async def heavy_users(request: HeavyUsersRequest):
    try:
        with get_session() as session:
            service = UsageMetricsService(
                usage_log_repository=AiUsageLogRepository(session),
                ai_ops_setting_repository=AiOpsSettingRepository(session),
                ai_model_repository=AiModelRepository(session),
            )
            return service.get_heavy_users(
                created_from=_parse_iso_datetime(request.from_),
                created_to=_parse_iso_datetime(request.to),
                limit=request.limit,
                feature_type=request.feature_type.value if request.feature_type else None,
            )
    except AiMetricsException as error:
        return JSONResponse(
            status_code=error.status_code,
            content=build_error_response(error),
        )


@router.post("/usage/logs/search")
async def usage_logs(request: UsageLogSearchRequest):
    try:
        with get_session() as session:
            service = UsageMetricsService(
                usage_log_repository=AiUsageLogRepository(session),
                ai_ops_setting_repository=AiOpsSettingRepository(session),
                ai_model_repository=AiModelRepository(session),
            )
            return service.get_usage_logs(
                page=request.page,
                size=request.size,
                feature_type=request.feature_type.value if request.feature_type else None,
            )
    except AiMetricsException as error:
        return JSONResponse(
            status_code=error.status_code,
            content=build_error_response(error),
        )


@router.post("/ops/sync-settings")
async def sync_settings(request: OpsSettingSyncRequest):
    try:
        with get_session() as session:
            service = OpsSettingsService(
                ai_ops_setting_repository=AiOpsSettingRepository(session),
                ai_model_repository=AiModelRepository(session),
            )
            return service.sync_settings(request)
    except AiMetricsException as error:
        return JSONResponse(
            status_code=error.status_code,
            content=build_error_response(error),
        )


@router.post("/rag-documents/index")
async def start_rag_document_index(request: RagIndexStartRequest):
    try:
        with get_session() as session:
            service = RagIndexService(
                rag_document_repository=RagDocumentRepository(session),
            )
            response = service.start_indexing(request)
            session.commit()
            return response
    except AiMetricsException as error:
        return JSONResponse(
            status_code=error.status_code,
            content=build_error_response(error),
        )


@router.delete("/rag-documents/{ragDocumentId}/index")
async def delete_rag_document_index(
    rag_document_id: int = FastApiPath(alias="ragDocumentId"),
):
    try:
        with get_session() as session:
            service = RagIndexDeleteService(
                rag_document_repository=RagDocumentRepository(session),
                vector_store_client=MockVectorStoreClient(),
            )
            return await service.delete_index(rag_document_id)
    except AiMetricsException as error:
        return JSONResponse(
            status_code=error.status_code,
            content=build_error_response(error),
        )


@router.post("/usage/log")
async def create_usage_log(request: UsageLogCreateRequest):
    try:
        with get_session() as session:
            service = UsageLogService(
                usage_log_repository=AiUsageLogRepository(session),
                ai_model_repository=AiModelRepository(session),
            )
            saved_record = service.create_usage_log(request)
            session.commit()
            return UsageLogCreateResponse(
                aiUsageLogId=saved_record.ai_usage_log_id,
                recorded=True,
                createdAt=saved_record.created_at,
            )
    except AiMetricsException as error:
        return JSONResponse(
            status_code=error.status_code,
            content=build_error_response(error),
        )


def _parse_iso_datetime(value: str) -> datetime:
    normalized = value.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(normalized)
    except ValueError as error:
        raise AiMetricsException(
            error_code=AiMetricsErrorCode.TOKEN_CALCULATION_FAILED,
            message="Usage metrics request validation failed.",
            detail={
                "field": "from/to",
                "value": value,
                "reason": "invalid_iso_datetime_format",
            },
        ) from error
