from decimal import Decimal
from uuid import UUID

from admin.ai_metrics.client import AiMetricsModelExecutionContext
from admin.ai_metrics.exception import AiMetricsErrorCode, AiMetricsException
from admin.ai_metrics.repository import AiUsageLogRecord
from admin.ai_metrics.repository.ai_model_repository import AiModelRecord, AiModelRepository
from admin.ai_metrics.repository.ai_usage_log_repository import AiUsageLogRepository
from admin.ai_metrics.schema import AiFeatureType, UsageLogCreateRequest
from admin.ai_metrics.service.token_cost_calculator import TokenCostCalculator


class UsageLogService:
    def __init__(
        self,
        usage_log_repository: AiUsageLogRepository,
        ai_model_repository: AiModelRepository,
        token_cost_calculator: TokenCostCalculator | None = None,
    ) -> None:
        self._usage_log_repository = usage_log_repository
        self._ai_model_repository = ai_model_repository
        self._token_cost_calculator = token_cost_calculator or TokenCostCalculator()

    def create_usage_log(
        self,
        request: UsageLogCreateRequest,
    ) -> AiUsageLogRecord:
        ai_model = self._validate_request(request)
        persist_request = self._build_persist_request(request, ai_model)
        saved_record = self._usage_log_repository.save(persist_request)
        return saved_record

    def _validate_request(
        self,
        request: UsageLogCreateRequest,
    ) -> AiModelRecord:
        has_member_id = request.member_id is not None
        has_admin_id = request.admin_id is not None

        if has_member_id == has_admin_id:
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.TOKEN_CALCULATION_FAILED,
                message="Usage log request validation failed.",
                detail={"field": "actorId"},
            )

        if has_member_id and not isinstance(request.member_id, UUID):
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.TOKEN_CALCULATION_FAILED,
                message="Usage log request validation failed.",
                detail={"field": "memberId"},
            )

        if has_admin_id and not isinstance(request.admin_id, int):
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.TOKEN_CALCULATION_FAILED,
                message="Usage log request validation failed.",
                detail={"field": "adminId"},
            )

        if request.session_id is not None and not isinstance(request.session_id, UUID):
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.TOKEN_CALCULATION_FAILED,
                message="Usage log request validation failed.",
                detail={"field": "sessionId"},
            )

        if not isinstance(request.feature_type, AiFeatureType):
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.TOKEN_CALCULATION_FAILED,
                message="Usage log request validation failed.",
                detail={"field": "featureType"},
            )

        ai_model = self._resolve_ai_model(request)
        if ai_model is None:
            detail = (
                {"aiModelId": request.ai_model_id}
                if request.ai_model_id is not None
                else {"modelName": request.model_name}
            )
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.AI_MODEL_NOT_FOUND,
                detail=detail,
            )
        return ai_model

    def _resolve_ai_model(
        self,
        request: UsageLogCreateRequest,
    ) -> AiModelRecord | None:
        if request.ai_model_id is not None:
            return self._ai_model_repository.find_by_id(request.ai_model_id)

        model_name = request.model_name.strip() if request.model_name else ""
        if not model_name:
            raise AiMetricsException(
                error_code=AiMetricsErrorCode.TOKEN_CALCULATION_FAILED,
                message="Usage log request validation failed.",
                detail={"field": "modelName"},
            )

        return self._ai_model_repository.find_by_model_name(model_name)

    def _build_persist_request(
        self,
        request: UsageLogCreateRequest,
        ai_model: AiModelRecord,
    ) -> UsageLogCreateRequest:
        context = AiMetricsModelExecutionContext(
            ai_model_id=ai_model.ai_model_id,
            provider=ai_model.provider,
            model_name=ai_model.model_name,
            input_token_price=ai_model.input_token_price,
            output_token_price=ai_model.output_token_price,
            pricing_unit=ai_model.pricing_unit,
        )
        input_tokens = self._token_cost_calculator.calculate_input_tokens(
            fallback_input_tokens=request.input_tokens,
        )
        output_tokens = self._token_cost_calculator.calculate_output_tokens(
            fallback_output_tokens=request.output_tokens,
        )
        cost = self._token_cost_calculator.calculate_cost(
            context,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
        )
        self._token_cost_calculator.validate_token_cost_result(
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost=cost,
        )

        return request.model_copy(
            update={
                "ai_model_id": ai_model.ai_model_id,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "cost": Decimal(cost),
            }
        )
