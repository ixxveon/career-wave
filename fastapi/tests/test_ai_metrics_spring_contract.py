from admin.ai_metrics.exception import AiMetricsErrorCode, AiMetricsException, build_error_response
from admin.ai_metrics.router.ai_metrics_router import _parse_iso_datetime
from admin.ai_metrics.schema import (
    AiFeatureType,
    AlertChannelType,
    DomainUsageRequest,
    DomainUsageResponse,
    FeatureUsageResponse,
    HeavyUsersRequest,
    HeavyUsersResponse,
    HeavyUserResponse,
    OpsSettingSyncRequest,
    OpsSettingSyncResponse,
    RagIndexDeleteResponse,
    RagDocumentStatusType,
    RagIndexStartRequest,
    RagIndexStartResponse,
    SummaryRequest,
    SummaryResponse,
    TokenTrendInterval,
    TokenTrendRequest,
    TokenTrendPointResponse,
    TokenTrendResponse,
    UsageLogCreateRequest,
    UsageLogCreateResponse,
    UsageLogItemResponse,
    UsageLogListResponse,
    UsageLogSearchRequest,
)


def test_usage_request_contracts_match_spring_boot_fields():
    summary_request = SummaryRequest.model_validate(
        {
            "from": "2026-06-01T00:00:00Z",
            "to": "2026-06-10T23:59:59Z",
            "featureType": "DOCUMENT",
        }
    )
    domain_usage_request = DomainUsageRequest.model_validate(
        {
            "from": "2026-06-01T00:00:00Z",
            "to": "2026-06-10T23:59:59Z",
        }
    )
    token_trend_request = TokenTrendRequest.model_validate(
        {
            "from": "2026-06-01T00:00:00Z",
            "to": "2026-06-10T23:59:59Z",
            "featureType": "DOCUMENT",
            "interval": "DAILY",
        }
    )
    heavy_users_request = HeavyUsersRequest.model_validate(
        {
            "from": "2026-06-01T00:00:00Z",
            "to": "2026-06-10T23:59:59Z",
            "featureType": "INTERVIEW",
            "limit": 10,
        }
    )
    usage_log_search_request = UsageLogSearchRequest.model_validate(
        {
            "featureType": "DOCUMENT",
            "page": 1,
            "size": 20,
        }
    )

    assert summary_request.model_dump(by_alias=True) == {
        "from": "2026-06-01T00:00:00Z",
        "to": "2026-06-10T23:59:59Z",
        "featureType": "DOCUMENT",
    }
    assert domain_usage_request.model_dump(by_alias=True) == {
        "from": "2026-06-01T00:00:00Z",
        "to": "2026-06-10T23:59:59Z",
    }
    assert token_trend_request.model_dump(by_alias=True) == {
        "from": "2026-06-01T00:00:00Z",
        "to": "2026-06-10T23:59:59Z",
        "featureType": "DOCUMENT",
        "interval": "DAILY",
    }
    assert heavy_users_request.model_dump(by_alias=True) == {
        "from": "2026-06-01T00:00:00Z",
        "to": "2026-06-10T23:59:59Z",
        "featureType": "INTERVIEW",
        "limit": 10,
    }
    assert usage_log_search_request.model_dump(by_alias=True) == {
        "featureType": "DOCUMENT",
        "page": 1,
        "size": 20,
    }

    assert summary_request.feature_type == AiFeatureType.DOCUMENT
    assert token_trend_request.interval == TokenTrendInterval.DAILY
    assert heavy_users_request.feature_type == AiFeatureType.INTERVIEW


def test_usage_period_filters_are_optional_like_spring_boot():
    summary_request = SummaryRequest.model_validate(
        {
            "featureType": "DOCUMENT",
        }
    )
    domain_usage_request = DomainUsageRequest.model_validate({})
    token_trend_request = TokenTrendRequest.model_validate(
        {
            "from": None,
            "to": None,
            "interval": "DAILY",
        }
    )
    heavy_users_request = HeavyUsersRequest.model_validate(
        {
            "from": "",
            "to": "   ",
            "featureType": "INTERVIEW",
            "limit": 10,
        }
    )

    assert summary_request.model_dump(by_alias=True) == {
        "from": None,
        "to": None,
        "featureType": "DOCUMENT",
    }
    assert domain_usage_request.model_dump(by_alias=True) == {
        "from": None,
        "to": None,
    }
    assert token_trend_request.model_dump(by_alias=True) == {
        "from": None,
        "to": None,
        "featureType": None,
        "interval": "DAILY",
    }
    assert heavy_users_request.model_dump(by_alias=True) == {
        "from": "",
        "to": "   ",
        "featureType": "INTERVIEW",
        "limit": 10,
    }

    assert _parse_iso_datetime(summary_request.from_) is None
    assert _parse_iso_datetime(domain_usage_request.to) is None
    assert _parse_iso_datetime(heavy_users_request.from_) is None
    assert _parse_iso_datetime(heavy_users_request.to) is None


def test_non_usage_request_contracts_match_spring_boot_fields():
    ops_settings_request = OpsSettingSyncRequest.model_validate(
        {
            "aiOpsSettingId": 1,
            "selectedModelId": 1,
            "modelName": "gpt-4o-mini",
            "monthlyBudget": "3500000",
            "alertEnabled": True,
            "alertChannel": "DISCORD",
            "alertThreshold": 90,
            "rateLimitEnabled": True,
        }
    )
    usage_log_create_request = UsageLogCreateRequest.model_validate(
        {
            "memberId": "7d8b4d74-0a38-4e4a-8c5d-a8d4b25d2f3a",
            "sessionId": None,
            "aiModelId": 1,
            "featureType": "DOCUMENT",
            "inputTokens": 1200,
            "outputTokens": 450,
            "cost": "2800",
        }
    )

    assert ops_settings_request.model_dump(by_alias=True) == {
        "aiOpsSettingId": 1,
        "selectedModelId": 1,
        "modelName": "gpt-4o-mini",
        "monthlyBudget": ops_settings_request.monthly_budget,
        "alertEnabled": True,
        "alertChannel": "DISCORD",
        "alertThreshold": 90,
        "rateLimitEnabled": True,
    }
    assert usage_log_create_request.model_dump(mode="json", by_alias=True) == {
        "memberId": "7d8b4d74-0a38-4e4a-8c5d-a8d4b25d2f3a",
        "sessionId": None,
        "aiModelId": 1,
        "featureType": "DOCUMENT",
        "inputTokens": 1200,
        "outputTokens": 450,
        "cost": "2800",
    }

    assert ops_settings_request.alert_channel == AlertChannelType.DISCORD
    assert usage_log_create_request.feature_type == AiFeatureType.DOCUMENT


def test_usage_response_contracts_match_spring_boot_fields():
    summary_response = SummaryResponse(
        totalRequests=1250,
        totalInputTokens=420000,
        totalOutputTokens=185000,
        totalCost="980000",
        documentRequests=820,
        interviewRequests=430,
        activeModelId=1,
        activeModelName="gpt-4o-mini",
    )
    domain_usage_response = DomainUsageResponse(
        document=FeatureUsageResponse(
            requestCount=820,
            inputTokens=250000,
            outputTokens=110000,
            cost="560000",
        ),
        interview=FeatureUsageResponse(
            requestCount=430,
            inputTokens=170000,
            outputTokens=75000,
            cost="420000",
        ),
    )
    token_trend_response = TokenTrendResponse(
        interval=TokenTrendInterval.DAILY,
        points=[
            TokenTrendPointResponse(
                bucket="2026-06-01T00:00:00Z",
                inputTokens=12000,
                outputTokens=5400,
                cost="28000",
            )
        ],
    )
    heavy_users_response = HeavyUsersResponse(
        users=[
            HeavyUserResponse(
                memberId="7d8b4d74-0a38-4e4a-8c5d-a8d4b25d2f3a",
                requestCount=95,
                inputTokens=52000,
                outputTokens=21000,
                cost="118000",
            )
        ]
    )
    usage_log_list_response = UsageLogListResponse(
        content=[
            UsageLogItemResponse(
                aiUsageLogId=101,
                memberId="7d8b4d74-0a38-4e4a-8c5d-a8d4b25d2f3a",
                sessionId=None,
                aiModelId=1,
                featureType="DOCUMENT",
                inputTokens=1200,
                outputTokens=450,
                cost="2800",
                createdAt="2026-06-10T02:00:00Z",
            )
        ],
        page=1,
        size=20,
        totalElements=1250,
        totalPages=63,
    )

    assert summary_response.model_dump(by_alias=True) == {
        "totalRequests": 1250,
        "totalInputTokens": 420000,
        "totalOutputTokens": 185000,
        "totalCost": summary_response.total_cost,
        "documentRequests": 820,
        "interviewRequests": 430,
        "activeModelId": 1,
        "activeModelName": "gpt-4o-mini",
    }
    assert domain_usage_response.model_dump(by_alias=True) == {
        "document": {
            "requestCount": 820,
            "inputTokens": 250000,
            "outputTokens": 110000,
            "cost": domain_usage_response.document.cost,
        },
        "interview": {
            "requestCount": 430,
            "inputTokens": 170000,
            "outputTokens": 75000,
            "cost": domain_usage_response.interview.cost,
        },
    }
    assert token_trend_response.model_dump(by_alias=True) == {
        "interval": "DAILY",
        "points": [
            {
                "bucket": "2026-06-01T00:00:00Z",
                "inputTokens": 12000,
                "outputTokens": 5400,
                "cost": token_trend_response.points[0].cost,
            }
        ],
    }
    assert heavy_users_response.model_dump(mode="json", by_alias=True) == {
        "users": [
            {
                "memberId": "7d8b4d74-0a38-4e4a-8c5d-a8d4b25d2f3a",
                "requestCount": 95,
                "inputTokens": 52000,
                "outputTokens": 21000,
                "cost": "118000",
            }
        ]
    }
    assert usage_log_list_response.model_dump(mode="json", by_alias=True) == {
        "content": [
            {
                "aiUsageLogId": 101,
                "memberId": "7d8b4d74-0a38-4e4a-8c5d-a8d4b25d2f3a",
                "sessionId": None,
                "aiModelId": 1,
                "featureType": "DOCUMENT",
                "inputTokens": 1200,
                "outputTokens": 450,
                "cost": "2800",
                "createdAt": "2026-06-10T02:00:00Z",
            }
        ],
        "page": 1,
        "size": 20,
        "totalElements": 1250,
        "totalPages": 63,
    }


def test_ops_settings_sync_contract_matches_spring_boot_fields():
    ops_settings_request = OpsSettingSyncRequest.model_validate(
        {
            "aiOpsSettingId": 1,
            "selectedModelId": 1,
            "modelName": "gpt-4o-mini",
            "monthlyBudget": "3500000",
            "alertEnabled": True,
            "alertChannel": "DISCORD",
            "alertThreshold": 90,
            "rateLimitEnabled": True,
        }
    )
    ops_settings_response = OpsSettingSyncResponse(
        synced=True,
        syncedAt="2026-06-11T00:10:00Z",
    )

    assert ops_settings_request.model_dump(by_alias=True) == {
        "aiOpsSettingId": 1,
        "selectedModelId": 1,
        "modelName": "gpt-4o-mini",
        "monthlyBudget": ops_settings_request.monthly_budget,
        "alertEnabled": True,
        "alertChannel": "DISCORD",
        "alertThreshold": 90,
        "rateLimitEnabled": True,
    }
    assert ops_settings_response.model_dump(by_alias=True) == {
        "synced": True,
        "syncedAt": ops_settings_response.synced_at,
    }


def test_rag_index_start_contract_matches_spring_boot_fields():
    rag_index_start_request = RagIndexStartRequest.model_validate(
        {
            "ragDocumentId": 10,
            "fileUuid": "1fb3e31e-fd5a-420d-8135-ec682ac53956",
            "originalFileName": "faq.pdf",
            "filePath": "/rag/2026/06/faq.pdf",
            "mimeType": "application/pdf",
            "fileSize": 182030,
        }
    )
    rag_index_start_response = RagIndexStartResponse(
        accepted=True,
        ragDocumentId=10,
        status=RagDocumentStatusType.INDEXING,
    )

    assert rag_index_start_request.model_dump(by_alias=True) == {
        "ragDocumentId": 10,
        "fileUuid": rag_index_start_request.file_uuid,
        "originalFileName": "faq.pdf",
        "filePath": "/rag/2026/06/faq.pdf",
        "mimeType": "application/pdf",
        "fileSize": 182030,
    }
    assert rag_index_start_response.model_dump(by_alias=True) == {
        "accepted": True,
        "ragDocumentId": 10,
        "status": "INDEXING",
    }


def test_rag_index_delete_response_contract_matches_spring_boot_fields():
    rag_index_delete_response = RagIndexDeleteResponse(
        deleted=True,
        ragDocumentId=10,
    )

    assert rag_index_delete_response.model_dump(by_alias=True) == {
        "deleted": True,
        "ragDocumentId": 10,
    }


def test_usage_log_create_contract_matches_spring_boot_fields():
    usage_log_create_request = UsageLogCreateRequest.model_validate(
        {
            "memberId": "7d8b4d74-0a38-4e4a-8c5d-a8d4b25d2f3a",
            "sessionId": None,
            "aiModelId": 1,
            "featureType": "DOCUMENT",
            "inputTokens": 1200,
            "outputTokens": 450,
            "cost": "2800",
        }
    )
    usage_log_create_response = UsageLogCreateResponse(
        aiUsageLogId=101,
        recorded=True,
        createdAt="2026-06-10T02:00:00Z",
    )

    assert usage_log_create_request.model_dump(mode="json", by_alias=True) == {
        "memberId": "7d8b4d74-0a38-4e4a-8c5d-a8d4b25d2f3a",
        "sessionId": None,
        "aiModelId": 1,
        "featureType": "DOCUMENT",
        "inputTokens": 1200,
        "outputTokens": 450,
        "cost": "2800",
    }
    assert usage_log_create_response.model_dump(by_alias=True) == {
        "aiUsageLogId": 101,
        "recorded": True,
        "createdAt": usage_log_create_response.created_at,
    }


def test_error_codes_are_returned_in_spring_boot_mappable_identifiers():
    expected_codes = {
        "AI_MODEL_PROVIDER_NOT_SUPPORTED",
        "AI_MODEL_NOT_FOUND",
        "AI_OPS_SETTING_NOT_FOUND",
        "INVALID_MONTHLY_BUDGET",
        "INVALID_ALERT_THRESHOLD",
        "INVALID_DATETIME_FORMAT",
        "RAG_DOCUMENT_NOT_FOUND",
        "RAG_DOCUMENT_ALREADY_INDEXING",
        "RAG_DOCUMENT_INDEXING_FAILED",
        "RAG_DOCUMENT_DELETE_FAILED",
        "OPENAI_API_ERROR",
        "AI_USAGE_LOG_CREATE_FAILED",
        "TOKEN_CALCULATION_FAILED",
    }

    actual_codes = {error_code.value for error_code in AiMetricsErrorCode}

    assert actual_codes == expected_codes


def test_error_response_schema_matches_fastapi_contract():
    error = AiMetricsException(
        error_code=AiMetricsErrorCode.RAG_DOCUMENT_INDEXING_FAILED,
        detail={
            "ragDocumentId": 10,
            "reason": "FILE_NOT_FOUND",
        },
    )

    assert build_error_response(error) == {
        "success": False,
        "errorCode": "RAG_DOCUMENT_INDEXING_FAILED",
        "message": "RAG document indexing failed.",
        "detail": {
            "ragDocumentId": 10,
            "reason": "FILE_NOT_FOUND",
        },
    }
