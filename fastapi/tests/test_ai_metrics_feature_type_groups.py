from sqlalchemy import select

from admin.ai_metrics.repository.ai_usage_log_repository import (
    AiUsageLogRepository,
    ai_usage_logs_table,
    resolve_feature_types,
)


def test_resolve_feature_types_groups_interview_voice_usage() -> None:
    assert resolve_feature_types("INTERVIEW") == (
        "INTERVIEW",
        "INTERVIEW_STT",
        "INTERVIEW_TTS",
    )


def test_resolve_feature_types_groups_admin_member_report_usage() -> None:
    assert resolve_feature_types("ADMIN_REPORT") == (
        "ADMIN_REPORT",
        "ADMIN_REPORT_MEMBER",
    )


def test_resolve_feature_types_keeps_raw_feature_type_filter() -> None:
    assert resolve_feature_types("INTERVIEW_STT") == ("INTERVIEW_STT",)


def test_usage_filter_expands_parent_feature_type_to_all_raw_types() -> None:
    statement = AiUsageLogRepository._apply_usage_filters(
        select(ai_usage_logs_table.c.ai_usage_log_id),
        created_from=None,
        created_to=None,
        feature_type="INTERVIEW",
    )

    compiled = statement.compile()

    assert tuple(compiled.params.values()) == (["INTERVIEW", "INTERVIEW_STT", "INTERVIEW_TTS"],)
