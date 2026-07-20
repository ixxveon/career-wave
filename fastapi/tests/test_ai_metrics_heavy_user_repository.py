from unittest.mock import Mock

from sqlalchemy.dialects import postgresql

from admin.ai_metrics.repository.ai_usage_log_repository import AiUsageLogRepository


def test_heavy_user_aggregation_excludes_admin_usage_and_ranks_by_total_tokens():
    session = Mock()
    session.execute.return_value.mappings.return_value.all.return_value = []
    repository = AiUsageLogRepository(session)

    repository.aggregate_heavy_users(
        created_from=None,
        created_to=None,
        feature_type=None,
        limit=6,
    )

    statement = session.execute.call_args.args[0]
    sql = str(statement.compile(dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True}))

    assert "ai_usage_logs.member_id IS NOT NULL" in sql
    assert "total_tokens DESC, request_count DESC, ai_usage_logs.member_id ASC" in sql
    assert "ORDER BY cost DESC" not in sql
    assert "LIMIT 6" in sql
