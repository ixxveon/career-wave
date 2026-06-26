import asyncio
from types import SimpleNamespace

import pytest

from admin.report.schema.request import ReportAnalysisRequest
from admin.report.service import report_ai_service


class _Usage:
    prompt_tokens = 200
    completion_tokens = 80
    total_tokens = 280


class _Message:
    content = '{"severity": "높음", "category": "ABUSE", "suggestion": "조치 필요"}'


class _Choice:
    message = _Message()


class _Completion:
    usage = _Usage()
    choices = [_Choice()]


class _Completions:
    async def create(self, **kwargs):
        return _Completion()


class _Chat:
    completions = _Completions()


class _OpenAIClient:
    chat = _Chat()


@pytest.fixture
def patched_service(monkeypatch):
    monkeypatch.setattr(report_ai_service, "_get_openai_client", lambda: _OpenAIClient())
    monkeypatch.setattr(
        report_ai_service,
        "get_settings",
        lambda: SimpleNamespace(
            openai_api_key="test-key",
            openai_model_deep="gpt-test-deep",
            openai_llm_timeout_seconds=10,
        ),
    )

    recorded = {}

    async def _fake_record(**kwargs):
        recorded.update(kwargs)
        return True

    monkeypatch.setattr(report_ai_service, "record_ai_usage", _fake_record)
    return recorded


@pytest.mark.asyncio
async def test_analyze_report_records_usage_with_admin_actor(patched_service):
    request = ReportAnalysisRequest.model_validate({
        "targetType": "BOARD",
        "reason": "ABUSE",
        "contentTitle": "제목",
        "contentBody": "본문",
        "adminId": 9,
    })

    result = await report_ai_service.analyze_report(request)
    await asyncio.sleep(0)

    assert result.severity == "높음"
    assert patched_service["admin_id"] == 9
    assert patched_service["member_id"] is None
    assert patched_service["feature_type"] == "ADMIN_REPORT"
    assert patched_service["model_name"] == "gpt-test-deep"
    assert patched_service["usage"].prompt_tokens == 200


def test_request_schema_requires_admin_id():
    """신고 분석 요청은 adminId를 필수로 수신한다."""
    request = ReportAnalysisRequest.model_validate(
        {"targetType": "BOARD", "reason": "ABUSE", "adminId": 42}
    )
    assert request.admin_id == 42
