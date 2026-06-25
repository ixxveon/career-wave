from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import Mock
from uuid import UUID

from admin.ai_metrics.repository import (
    AiUsageLogRecord,
    DomainUsageAggregateRecord,
    FeatureUsageAggregateRecord,
    HeavyUserAggregateRecord,
    TokenTrendPointAggregateRecord,
    UsageLogPageRecord,
    UsageSummaryAggregateRecord,
)
from admin.ai_metrics.repository.ai_model_repository import AiModelRecord
from admin.ai_metrics.repository.ai_ops_setting_repository import AiOpsSettingRecord
from admin.ai_metrics.schema import (
    AiFeatureType,
    AlertChannelType,
    OpsSettingSyncRequest,
    TokenTrendInterval,
    UsageLogCreateRequest,
)
from admin.ai_metrics.service.ops_settings_service import OpsSettingsService
from admin.ai_metrics.service import UsageMetricsService
from admin.ai_metrics.service.usage_log_service import UsageLogService


class InMemoryUsageLogRepository:
    def __init__(self) -> None:
        self.records: list[AiUsageLogRecord] = []

    def save(self, record: AiUsageLogRecord) -> AiUsageLogRecord:
        persisted = AiUsageLogRecord(
            ai_usage_log_id=len(self.records) + 1,
            member_id=record.member_id,
            session_id=record.session_id,
            ai_model_id=record.ai_model_id,
            feature_type=record.feature_type.value if hasattr(record.feature_type, "value") else record.feature_type,
            input_tokens=record.input_tokens,
            output_tokens=record.output_tokens,
            cost=record.cost,
            created_at=datetime(2026, 6, 18, 12, 0, tzinfo=timezone.utc),
        )
        self.records.append(persisted)
        return persisted

    def aggregate_summary(self, *, created_from, created_to, feature_type):
        filtered_records = [
            record
            for record in self.records
            if (created_from is None or record.created_at >= created_from)
            and (created_to is None or record.created_at <= created_to)
            and (feature_type is None or record.feature_type == feature_type)
        ]
        return UsageSummaryAggregateRecord(
            total_requests=len(filtered_records),
            total_input_tokens=sum(record.input_tokens for record in filtered_records),
            total_output_tokens=sum(record.output_tokens for record in filtered_records),
            total_cost=sum((record.cost for record in filtered_records), Decimal("0")),
            document_requests=sum(1 for record in filtered_records if record.feature_type == "DOCUMENT"),
            interview_requests=sum(1 for record in filtered_records if record.feature_type == "INTERVIEW"),
            admin_cs_requests=sum(1 for record in filtered_records if record.feature_type == "ADMIN_CS"),
            admin_report_requests=sum(1 for record in filtered_records if record.feature_type == "ADMIN_REPORT"),
        )


def test_usage_metrics_service_returns_summary_response():
    usage_log_repository = Mock()
    ai_ops_setting_repository = Mock()
    ai_model_repository = Mock()

    usage_log_repository.aggregate_summary.return_value = UsageSummaryAggregateRecord(
        total_requests=1250,
        total_input_tokens=420000,
        total_output_tokens=185000,
        total_cost=Decimal("980000"),
        document_requests=820,
        interview_requests=430,
        admin_cs_requests=25,
        admin_report_requests=12,
    )
    ai_ops_setting_repository.find_selected_model_id.return_value = 1
    ai_model_repository.find_by_id.return_value = AiModelRecord(
        ai_model_id=1,
        model_name="gpt-4o-mini",
        display_type="GPT-4o Mini",
        provider="OPENAI",
        input_token_price=Decimal("0.150000"),
        output_token_price=Decimal("0.600000"),
        is_enabled=True,
        created_at=datetime(2026, 6, 1, tzinfo=timezone.utc),
        updated_at=datetime(2026, 6, 1, tzinfo=timezone.utc),
    )

    service = UsageMetricsService(
        usage_log_repository=usage_log_repository,
        ai_ops_setting_repository=ai_ops_setting_repository,
        ai_model_repository=ai_model_repository,
    )

    response = service.get_summary(
        created_from=datetime(2026, 6, 1, tzinfo=timezone.utc),
        created_to=datetime(2026, 6, 10, 23, 59, 59, tzinfo=timezone.utc),
        feature_type="DOCUMENT",
    )

    assert response.model_dump(by_alias=True) == {
        "totalRequests": 1250,
        "totalInputTokens": 420000,
        "totalOutputTokens": 185000,
        "totalCost": Decimal("980000"),
        "documentRequests": 820,
        "interviewRequests": 430,
        "adminCsRequests": 25,
        "adminReportRequests": 12,
        "activeModelId": 1,
        "activeModelName": "gpt-4o-mini",
    }

    usage_log_repository.aggregate_summary.assert_called_once()
    ai_ops_setting_repository.find_selected_model_id.assert_called_once_with()
    ai_model_repository.find_by_id.assert_called_once_with(1)


def test_usage_metrics_summary_is_consistent_with_persisted_usage_logs():
    usage_log_repository = InMemoryUsageLogRepository()
    ai_model_repository = Mock()
    token_cost_calculator = Mock()
    ai_ops_setting_repository = Mock()

    ai_model_repository.find_by_id.return_value = AiModelRecord(
        ai_model_id=5,
        model_name="gpt-4.1-mini",
        display_type="GPT-4.1 Mini",
        provider="OPENAI",
        input_token_price=Decimal("0.400000"),
        output_token_price=Decimal("1.600000"),
        is_enabled=True,
        created_at=datetime(2026, 6, 1, tzinfo=timezone.utc),
        updated_at=datetime(2026, 6, 1, tzinfo=timezone.utc),
    )
    ai_ops_setting_repository.find_selected_model_id.return_value = 5
    token_cost_calculator.calculate_input_tokens.side_effect = [1300, 900]
    token_cost_calculator.calculate_output_tokens.side_effect = [420, 210]
    token_cost_calculator.calculate_cost.side_effect = [
        Decimal("1192.000000"),
        Decimal("696.000000"),
    ]

    usage_log_service = UsageLogService(
        usage_log_repository=usage_log_repository,
        ai_model_repository=ai_model_repository,
        token_cost_calculator=token_cost_calculator,
    )
    metrics_service = UsageMetricsService(
        usage_log_repository=usage_log_repository,
        ai_ops_setting_repository=ai_ops_setting_repository,
        ai_model_repository=ai_model_repository,
    )

    first_record = usage_log_service.create_usage_log(
        UsageLogCreateRequest(
            memberId=UUID("55555555-5555-5555-5555-555555555555"),
            sessionId=UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
            aiModelId=5,
            featureType="DOCUMENT",
            inputTokens=1000,
            outputTokens=300,
            cost=Decimal("0"),
        )
    )
    second_record = usage_log_service.create_usage_log(
        UsageLogCreateRequest(
            memberId=UUID("66666666-6666-6666-6666-666666666666"),
            sessionId=UUID("cccccccc-cccc-cccc-cccc-cccccccccccc"),
            aiModelId=5,
            featureType="INTERVIEW",
            inputTokens=700,
            outputTokens=150,
            cost=Decimal("0"),
        )
    )

    summary = metrics_service.get_summary(
        created_from=datetime(2026, 6, 1, tzinfo=timezone.utc),
        created_to=datetime(2026, 6, 30, 23, 59, 59, tzinfo=timezone.utc),
        feature_type=None,
    )

    assert first_record.ai_usage_log_id == 1
    assert second_record.ai_usage_log_id == 2
    assert summary.model_dump(by_alias=True) == {
        "totalRequests": 2,
        "totalInputTokens": 2200,
        "totalOutputTokens": 630,
        "totalCost": Decimal("1888.000000"),
        "documentRequests": 1,
        "interviewRequests": 1,
        "adminCsRequests": 0,
        "adminReportRequests": 0,
        "activeModelId": 5,
        "activeModelName": "gpt-4.1-mini",
    }


def test_usage_metrics_service_returns_domain_usage_response():
    usage_log_repository = Mock()
    ai_ops_setting_repository = Mock()
    ai_model_repository = Mock()

    usage_log_repository.aggregate_domain_usage.return_value = DomainUsageAggregateRecord(
        document=FeatureUsageAggregateRecord(
            request_count=820,
            input_tokens=250000,
            output_tokens=110000,
            cost=Decimal("560000"),
        ),
        interview=FeatureUsageAggregateRecord(
            request_count=430,
            input_tokens=170000,
            output_tokens=75000,
            cost=Decimal("420000"),
        ),
        admin_cs=FeatureUsageAggregateRecord(
            request_count=25,
            input_tokens=12000,
            output_tokens=5000,
            cost=Decimal("25000"),
        ),
        admin_report=FeatureUsageAggregateRecord(
            request_count=12,
            input_tokens=9000,
            output_tokens=3000,
            cost=Decimal("15000"),
        ),
    )

    service = UsageMetricsService(
        usage_log_repository=usage_log_repository,
        ai_ops_setting_repository=ai_ops_setting_repository,
        ai_model_repository=ai_model_repository,
    )

    response = service.get_domain_usage(
        created_from=datetime(2026, 6, 1, tzinfo=timezone.utc),
        created_to=datetime(2026, 6, 10, 23, 59, 59, tzinfo=timezone.utc),
    )

    assert response.model_dump(by_alias=True) == {
        "document": {
            "requestCount": 820,
            "inputTokens": 250000,
            "outputTokens": 110000,
            "cost": Decimal("560000"),
        },
        "interview": {
            "requestCount": 430,
            "inputTokens": 170000,
            "outputTokens": 75000,
            "cost": Decimal("420000"),
        },
        "adminCs": {
            "requestCount": 25,
            "inputTokens": 12000,
            "outputTokens": 5000,
            "cost": Decimal("25000"),
        },
        "adminReport": {
            "requestCount": 12,
            "inputTokens": 9000,
            "outputTokens": 3000,
            "cost": Decimal("15000"),
        },
    }

    usage_log_repository.aggregate_domain_usage.assert_called_once()


def test_usage_metrics_service_returns_token_trend_response():
    usage_log_repository = Mock()
    ai_ops_setting_repository = Mock()
    ai_model_repository = Mock()

    usage_log_repository.aggregate_token_trend.return_value = [
        TokenTrendPointAggregateRecord(
            bucket=datetime(2026, 6, 1, 0, 0, tzinfo=timezone.utc),
            input_tokens=120000,
            output_tokens=48000,
            cost=Decimal("210000"),
        ),
        TokenTrendPointAggregateRecord(
            bucket=datetime(2026, 6, 2, 0, 0, tzinfo=timezone.utc),
            input_tokens=145000,
            output_tokens=59000,
            cost=Decimal("260000"),
        ),
    ]

    service = UsageMetricsService(
        usage_log_repository=usage_log_repository,
        ai_ops_setting_repository=ai_ops_setting_repository,
        ai_model_repository=ai_model_repository,
    )

    response = service.get_token_trend(
        created_from=datetime(2026, 6, 1, tzinfo=timezone.utc),
        created_to=datetime(2026, 6, 2, 23, 59, 59, tzinfo=timezone.utc),
        feature_type="DOCUMENT",
        interval=TokenTrendInterval.DAILY,
    )

    assert response.model_dump(by_alias=True) == {
        "interval": TokenTrendInterval.DAILY,
        "points": [
            {
                "bucket": "2026-06-01T00:00:00+00:00",
                "inputTokens": 120000,
                "outputTokens": 48000,
                "cost": Decimal("210000"),
            },
            {
                "bucket": "2026-06-02T00:00:00+00:00",
                "inputTokens": 145000,
                "outputTokens": 59000,
                "cost": Decimal("260000"),
            },
        ],
    }

    usage_log_repository.aggregate_token_trend.assert_called_once_with(
        created_from=datetime(2026, 6, 1, tzinfo=timezone.utc),
        created_to=datetime(2026, 6, 2, 23, 59, 59, tzinfo=timezone.utc),
        feature_type="DOCUMENT",
        interval="DAILY",
    )


def test_usage_metrics_service_returns_heavy_users_response():
    usage_log_repository = Mock()
    ai_ops_setting_repository = Mock()
    ai_model_repository = Mock()

    usage_log_repository.aggregate_heavy_users.return_value = [
        HeavyUserAggregateRecord(
            member_id=UUID("11111111-1111-1111-1111-111111111111"),
            request_count=34,
            input_tokens=220000,
            output_tokens=91000,
            cost=Decimal("390000"),
        ),
        HeavyUserAggregateRecord(
            member_id=UUID("22222222-2222-2222-2222-222222222222"),
            request_count=21,
            input_tokens=150000,
            output_tokens=64000,
            cost=Decimal("280000"),
        ),
    ]

    service = UsageMetricsService(
        usage_log_repository=usage_log_repository,
        ai_ops_setting_repository=ai_ops_setting_repository,
        ai_model_repository=ai_model_repository,
    )

    response = service.get_heavy_users(
        created_from=datetime(2026, 6, 1, tzinfo=timezone.utc),
        created_to=datetime(2026, 6, 30, 23, 59, 59, tzinfo=timezone.utc),
        feature_type="INTERVIEW",
        limit=5,
    )

    assert response.model_dump(by_alias=True) == {
        "users": [
            {
                "memberId": UUID("11111111-1111-1111-1111-111111111111"),
                "requestCount": 34,
                "inputTokens": 220000,
                "outputTokens": 91000,
                "cost": Decimal("390000"),
            },
            {
                "memberId": UUID("22222222-2222-2222-2222-222222222222"),
                "requestCount": 21,
                "inputTokens": 150000,
                "outputTokens": 64000,
                "cost": Decimal("280000"),
            },
        ]
    }

    usage_log_repository.aggregate_heavy_users.assert_called_once_with(
        created_from=datetime(2026, 6, 1, tzinfo=timezone.utc),
        created_to=datetime(2026, 6, 30, 23, 59, 59, tzinfo=timezone.utc),
        feature_type="INTERVIEW",
        limit=5,
    )


def test_usage_metrics_service_returns_usage_logs_response():
    usage_log_repository = Mock()
    ai_ops_setting_repository = Mock()
    ai_model_repository = Mock()

    usage_log_repository.find_usage_logs.return_value = UsageLogPageRecord(
        content=[
            AiUsageLogRecord(
                ai_usage_log_id=101,
                member_id=UUID("33333333-3333-3333-3333-333333333333"),
                session_id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                ai_model_id=7,
                feature_type="DOCUMENT",
                input_tokens=2800,
                output_tokens=940,
                cost=Decimal("4200"),
                created_at=datetime(2026, 6, 18, 10, 30, tzinfo=timezone.utc),
            ),
            AiUsageLogRecord(
                ai_usage_log_id=100,
                member_id=UUID("44444444-4444-4444-4444-444444444444"),
                session_id=None,
                ai_model_id=8,
                feature_type="DOCUMENT",
                input_tokens=1900,
                output_tokens=610,
                cost=Decimal("3100"),
                created_at=datetime(2026, 6, 18, 9, 45, tzinfo=timezone.utc),
            ),
        ],
        page=2,
        size=2,
        total_elements=5,
        total_pages=3,
    )

    service = UsageMetricsService(
        usage_log_repository=usage_log_repository,
        ai_ops_setting_repository=ai_ops_setting_repository,
        ai_model_repository=ai_model_repository,
    )

    response = service.get_usage_logs(
        feature_type="DOCUMENT",
        page=2,
        size=2,
    )

    assert response.model_dump(by_alias=True) == {
        "content": [
            {
                "aiUsageLogId": 101,
                "memberId": UUID("33333333-3333-3333-3333-333333333333"),
                "sessionId": UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                "aiModelId": 7,
                "featureType": AiFeatureType.DOCUMENT,
                "inputTokens": 2800,
                "outputTokens": 940,
                "cost": Decimal("4200"),
                "createdAt": datetime(2026, 6, 18, 10, 30, tzinfo=timezone.utc),
            },
            {
                "aiUsageLogId": 100,
                "memberId": UUID("44444444-4444-4444-4444-444444444444"),
                "sessionId": None,
                "aiModelId": 8,
                "featureType": AiFeatureType.DOCUMENT,
                "inputTokens": 1900,
                "outputTokens": 610,
                "cost": Decimal("3100"),
                "createdAt": datetime(2026, 6, 18, 9, 45, tzinfo=timezone.utc),
            },
        ],
        "page": 2,
        "size": 2,
        "totalElements": 5,
        "totalPages": 3,
    }

    usage_log_repository.find_usage_logs.assert_called_once_with(
        feature_type="DOCUMENT",
        page=2,
        size=2,
    )


def test_ops_settings_service_syncs_runtime_context():
    ai_ops_setting_repository = Mock()
    ai_model_repository = Mock()

    ai_ops_setting_repository.find_by_id.return_value = AiOpsSettingRecord(
        ai_ops_setting_id=1,
        selected_model_id=3,
        monthly_budget=Decimal("1500000"),
        alert_enabled=True,
        alert_channel="SLACK",
        alert_threshold=80,
        rate_limit_enabled=True,
        updated_at=datetime(2026, 6, 18, 0, 0, tzinfo=timezone.utc),
    )
    ai_model_repository.find_by_id.return_value = AiModelRecord(
        ai_model_id=5,
        model_name="gpt-4.1-mini",
        display_type="GPT-4.1 Mini",
        provider="OPENAI",
        input_token_price=Decimal("0.400000"),
        output_token_price=Decimal("1.600000"),
        is_enabled=True,
        created_at=datetime(2026, 6, 1, tzinfo=timezone.utc),
        updated_at=datetime(2026, 6, 1, tzinfo=timezone.utc),
    )

    service = OpsSettingsService(
        ai_ops_setting_repository=ai_ops_setting_repository,
        ai_model_repository=ai_model_repository,
    )

    response = service.sync_settings(
        OpsSettingSyncRequest(
            aiOpsSettingId=1,
            selectedModelId=5,
            modelName="gpt-4.1-mini",
            monthlyBudget=Decimal("2000000"),
            alertEnabled=True,
            alertChannel=AlertChannelType.SLACK,
            alertThreshold=75,
            rateLimitEnabled=False,
        )
    )
    runtime_context = service.get_runtime_context()

    assert response.synced is True
    assert response.synced_at.tzinfo == timezone.utc
    assert runtime_context is not None
    assert runtime_context.ai_ops_setting_id == 1
    assert runtime_context.selected_model_id == 5
    assert runtime_context.selected_model_name == "gpt-4.1-mini"
    assert runtime_context.monthly_budget == Decimal("2000000")
    assert runtime_context.alert_enabled is True
    assert runtime_context.alert_channel == "SLACK"
    assert runtime_context.alert_threshold == 75
    assert runtime_context.rate_limit_enabled is False
    assert runtime_context.synced_at == response.synced_at

    ai_ops_setting_repository.find_by_id.assert_called_once_with(1)
    ai_model_repository.find_by_id.assert_called_once_with(5)
