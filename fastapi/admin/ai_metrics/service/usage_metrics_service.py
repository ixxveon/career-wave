from datetime import datetime

from admin.ai_metrics.exception import AiMetricsErrorCode, AiMetricsException
from admin.ai_metrics.repository import (
    AiModelRepository,
    AiOpsSettingRepository,
    AiUsageLogRepository,
)
from admin.ai_metrics.schema import (
    AiFeatureType,
    DomainUsageResponse,
    FeatureUsageResponse,
    HeavyUserResponse,
    HeavyUsersResponse,
    SummaryResponse,
    TokenTrendInterval,
    TokenTrendPointResponse,
    TokenTrendResponse,
    UsageLogItemResponse,
    UsageLogListResponse,
)


class UsageMetricsService:
    def __init__(
        self,
        usage_log_repository: AiUsageLogRepository,
        ai_ops_setting_repository: AiOpsSettingRepository,
        ai_model_repository: AiModelRepository,
    ) -> None:
        self._usage_log_repository = usage_log_repository
        self._ai_ops_setting_repository = ai_ops_setting_repository
        self._ai_model_repository = ai_model_repository

    def get_summary(
        self,
        *,
        created_from: datetime | None,
        created_to: datetime | None,
        feature_type: str | None,
    ) -> SummaryResponse:
        self._validate_period_filters(
            created_from=created_from,
            created_to=created_to,
            feature_type=feature_type,
        )
        summary = self._usage_log_repository.aggregate_summary(
            created_from=created_from,
            created_to=created_to,
            feature_type=feature_type,
        )
        selected_model_id = self._ai_ops_setting_repository.find_selected_model_id()
        active_model = (
            self._ai_model_repository.find_by_id(selected_model_id)
            if selected_model_id is not None
            else None
        )

        return SummaryResponse(
            totalRequests=summary.total_requests,
            totalInputTokens=summary.total_input_tokens,
            totalOutputTokens=summary.total_output_tokens,
            totalCost=summary.total_cost,
            documentRequests=summary.document_requests,
            interviewRequests=summary.interview_requests,
            adminCsRequests=summary.admin_cs_requests,
            adminReportRequests=summary.admin_report_requests,
            activeModelId=active_model.ai_model_id if active_model else None,
            activeModelName=active_model.model_name if active_model else None,
        )

    def get_domain_usage(
        self,
        *,
        created_from: datetime | None,
        created_to: datetime | None,
    ) -> DomainUsageResponse:
        self._validate_period_filters(
            created_from=created_from,
            created_to=created_to,
            feature_type=None,
        )
        domain_usage = self._usage_log_repository.aggregate_domain_usage(
            created_from=created_from,
            created_to=created_to,
        )

        return DomainUsageResponse(
            document=FeatureUsageResponse(
                requestCount=domain_usage.document.request_count,
                inputTokens=domain_usage.document.input_tokens,
                outputTokens=domain_usage.document.output_tokens,
                cost=domain_usage.document.cost,
            ),
            interview=FeatureUsageResponse(
                requestCount=domain_usage.interview.request_count,
                inputTokens=domain_usage.interview.input_tokens,
                outputTokens=domain_usage.interview.output_tokens,
                cost=domain_usage.interview.cost,
            ),
            adminCs=FeatureUsageResponse(
                requestCount=domain_usage.admin_cs.request_count,
                inputTokens=domain_usage.admin_cs.input_tokens,
                outputTokens=domain_usage.admin_cs.output_tokens,
                cost=domain_usage.admin_cs.cost,
            ),
            adminReport=FeatureUsageResponse(
                requestCount=domain_usage.admin_report.request_count,
                inputTokens=domain_usage.admin_report.input_tokens,
                outputTokens=domain_usage.admin_report.output_tokens,
                cost=domain_usage.admin_report.cost,
            ),
        )

    def get_token_trend(
        self,
        *,
        created_from: datetime | None,
        created_to: datetime | None,
        feature_type: str | None,
        interval: TokenTrendInterval,
    ) -> TokenTrendResponse:
        self._validate_period_filters(
            created_from=created_from,
            created_to=created_to,
            feature_type=feature_type,
        )
        self._validate_interval(interval)
        points = self._usage_log_repository.aggregate_token_trend(
            created_from=created_from,
            created_to=created_to,
            feature_type=feature_type,
            interval=interval.value,
        )

        return TokenTrendResponse(
            interval=interval,
            points=[
                TokenTrendPointResponse(
                    bucket=point.bucket.isoformat(),
                    inputTokens=point.input_tokens,
                    outputTokens=point.output_tokens,
                    cost=point.cost,
                )
                for point in points
            ],
        )

    def get_heavy_users(
        self,
        *,
        created_from: datetime | None,
        created_to: datetime | None,
        feature_type: str | None,
        limit: int | None,
    ) -> HeavyUsersResponse:
        self._validate_period_filters(
            created_from=created_from,
            created_to=created_to,
            feature_type=feature_type,
        )
        self._validate_limit(limit)
        users = self._usage_log_repository.aggregate_heavy_users(
            created_from=created_from,
            created_to=created_to,
            feature_type=feature_type,
            limit=limit,
        )

        return HeavyUsersResponse(
            users=[
                HeavyUserResponse(
                    memberId=user.member_id,
                    adminId=user.admin_id,
                    requestCount=user.request_count,
                    inputTokens=user.input_tokens,
                    outputTokens=user.output_tokens,
                    cost=user.cost,
                )
                for user in users
            ]
        )

    def get_usage_logs(
        self,
        *,
        feature_type: str | None,
        page: int,
        size: int,
    ) -> UsageLogListResponse:
        self._validate_feature_type(feature_type)
        self._validate_page_size(page=page, size=size)
        usage_logs = self._usage_log_repository.find_usage_logs(
            feature_type=feature_type,
            page=page,
            size=size,
        )

        return UsageLogListResponse(
            content=[
                UsageLogItemResponse(
                    aiUsageLogId=log.ai_usage_log_id,
                    memberId=log.member_id,
                    adminId=log.admin_id,
                    sessionId=log.session_id,
                    aiModelId=log.ai_model_id,
                    featureType=log.feature_type,
                    inputTokens=log.input_tokens,
                    outputTokens=log.output_tokens,
                    cost=log.cost,
                    createdAt=log.created_at,
                )
                for log in usage_logs.content
            ],
            page=usage_logs.page,
            size=usage_logs.size,
            totalElements=usage_logs.total_elements,
            totalPages=usage_logs.total_pages,
        )

    def _validate_period_filters(
        self,
        *,
        created_from: datetime | None,
        created_to: datetime | None,
        feature_type: str | None,
    ) -> None:
        if created_from is not None and created_to is not None and created_from > created_to:
            self._raise_validation_error("from")
        self._validate_feature_type(feature_type)

    def _validate_feature_type(self, feature_type: str | None) -> None:
        if feature_type is None:
            return
        if feature_type not in {item.value for item in AiFeatureType}:
            self._raise_validation_error("featureType")

    def _validate_interval(self, interval: TokenTrendInterval) -> None:
        if not isinstance(interval, TokenTrendInterval):
            self._raise_validation_error("interval")

    def _validate_limit(self, limit: int | None) -> None:
        if limit is not None and limit < 1:
            self._raise_validation_error("limit")

    def _validate_page_size(self, *, page: int, size: int) -> None:
        if page < 1:
            self._raise_validation_error("page")
        if size < 1:
            self._raise_validation_error("size")

    def _raise_validation_error(self, field: str) -> None:
        raise AiMetricsException(
            error_code=AiMetricsErrorCode.TOKEN_CALCULATION_FAILED,
            message="Usage metrics request validation failed.",
            detail={"field": field},
        )
