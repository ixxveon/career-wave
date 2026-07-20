import logging
from types import SimpleNamespace
from uuid import UUID

import pytest
import httpx

from admin.ai_metrics.schema import UsageLogCreateRequest
from core.ai_usage.usage_log_client import record_ai_usage


class _Usage:
    prompt_tokens = 120
    completion_tokens = 40


class _Response:
    def __init__(
        self,
        should_raise: bool = False,
        status_code: int = 200,
        response_body: dict | None = None,
    ) -> None:
        self._should_raise = should_raise
        self._status_code = status_code
        self._response_body = response_body

    def raise_for_status(self) -> None:
        if self._should_raise:
            raise RuntimeError("boom")
        if self._status_code >= 400:
            request = httpx.Request("POST", "http://fastapi.local/internal/admin/ai-metrics/usage/log")
            response = httpx.Response(self._status_code, json=self._response_body, request=request)
            raise httpx.HTTPStatusError("request failed", request=request, response=response)


class _AsyncClient:
    instances: list["_AsyncClient"] = []
    should_raise = False
    status_code = 200
    response_body: dict | None = None

    def __init__(self, timeout: float) -> None:
        self.timeout = timeout
        self.requests: list[dict] = []
        _AsyncClient.instances.append(self)

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        return None

    async def post(self, url: str, headers: dict, json: dict):
        self.requests.append(
            {
                "url": url,
                "headers": headers,
                "json": json,
                "timeout": self.timeout,
            }
        )
        return _Response(
            should_raise=self.should_raise,
            status_code=self.status_code,
            response_body=self.response_body,
        )


@pytest.fixture(autouse=True)
def reset_async_client():
    _AsyncClient.instances = []
    _AsyncClient.should_raise = False
    _AsyncClient.status_code = 200
    _AsyncClient.response_body = None


@pytest.fixture
def usage_settings():
    return SimpleNamespace(
        ai_metrics_internal_base_url="http://fastapi.local/internal/admin/ai-metrics",
        ai_metrics_internal_secret="internal-secret",
        ai_usage_log_timeout_seconds=1.5,
    )


@pytest.mark.asyncio
async def test_record_ai_usage_posts_usage_log(monkeypatch, usage_settings):
    monkeypatch.setattr("core.ai_usage.usage_log_client.get_settings", lambda: usage_settings)
    monkeypatch.setattr("core.ai_usage.usage_log_client.httpx.AsyncClient", _AsyncClient)

    recorded = await record_ai_usage(
        member_id=UUID("55555555-5555-5555-5555-555555555555"),
        session_id=UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
        model_name="gpt-4o-mini",
        feature_type="DOCUMENT",
        usage=_Usage(),
    )

    assert recorded is True
    assert _AsyncClient.instances[0].requests == [
        {
            "url": "http://fastapi.local/internal/admin/ai-metrics/usage/log",
            "headers": {"X-Internal-Secret": "internal-secret"},
            "json": {
                "memberId": "55555555-5555-5555-5555-555555555555",
                "sessionId": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                "modelName": "gpt-4o-mini",
                "featureType": "DOCUMENT",
                "inputTokens": 120,
                "outputTokens": 40,
                "cost": "0",
            },
            "timeout": 1.5,
        }
    ]


@pytest.mark.asyncio
async def test_record_ai_usage_uses_explicit_token_values(monkeypatch, usage_settings):
    monkeypatch.setattr("core.ai_usage.usage_log_client.get_settings", lambda: usage_settings)
    monkeypatch.setattr("core.ai_usage.usage_log_client.httpx.AsyncClient", _AsyncClient)

    recorded = await record_ai_usage(
        member_id="55555555-5555-5555-5555-555555555555",
        model_name="gpt-4o-mini",
        feature_type="INTERVIEW",
        input_tokens=300,
        output_tokens=80,
    )

    assert recorded is True
    assert _AsyncClient.instances[0].requests[0]["json"]["inputTokens"] == 300
    assert _AsyncClient.instances[0].requests[0]["json"]["outputTokens"] == 80
    assert "sessionId" not in _AsyncClient.instances[0].requests[0]["json"]


@pytest.mark.asyncio
async def test_record_ai_usage_prefers_explicit_token_values_over_usage(monkeypatch, usage_settings):
    monkeypatch.setattr("core.ai_usage.usage_log_client.get_settings", lambda: usage_settings)
    monkeypatch.setattr("core.ai_usage.usage_log_client.httpx.AsyncClient", _AsyncClient)

    recorded = await record_ai_usage(
        member_id="55555555-5555-5555-5555-555555555555",
        model_name="gpt-4o-mini",
        feature_type="DOCUMENT",
        usage=_Usage(),
        input_tokens=300,
        output_tokens=80,
    )

    assert recorded is True
    assert _AsyncClient.instances[0].requests[0]["json"]["inputTokens"] == 300
    assert _AsyncClient.instances[0].requests[0]["json"]["outputTokens"] == 80


@pytest.mark.asyncio
async def test_record_ai_usage_skips_when_required_context_is_missing(monkeypatch, usage_settings):
    monkeypatch.setattr("core.ai_usage.usage_log_client.get_settings", lambda: usage_settings)
    monkeypatch.setattr("core.ai_usage.usage_log_client.httpx.AsyncClient", _AsyncClient)

    recorded = await record_ai_usage(
        member_id=None,
        model_name="gpt-4o-mini",
        feature_type="DOCUMENT",
        usage=_Usage(),
    )

    assert recorded is False
    assert _AsyncClient.instances == []


@pytest.mark.asyncio
async def test_record_ai_usage_skips_blank_member_identifier(monkeypatch, usage_settings):
    monkeypatch.setattr("core.ai_usage.usage_log_client.get_settings", lambda: usage_settings)
    monkeypatch.setattr("core.ai_usage.usage_log_client.httpx.AsyncClient", _AsyncClient)

    recorded = await record_ai_usage(
        member_id="   ",
        model_name="gpt-4o-mini",
        feature_type="INTERVIEW",
        usage=_Usage(),
        session_id="   ",
    )

    assert recorded is False
    assert _AsyncClient.instances == []


@pytest.mark.asyncio
async def test_record_ai_usage_supports_admin_actor(monkeypatch, usage_settings):
    monkeypatch.setattr("core.ai_usage.usage_log_client.get_settings", lambda: usage_settings)
    monkeypatch.setattr("core.ai_usage.usage_log_client.httpx.AsyncClient", _AsyncClient)

    recorded = await record_ai_usage(
        member_id=None,
        admin_id=44,
        model_name="gpt-4o-mini",
        feature_type="ADMIN_CS",
        input_tokens=300,
        output_tokens=80,
    )

    assert recorded is True
    assert _AsyncClient.instances[0].requests[0]["json"]["adminId"] == 44
    assert "memberId" not in _AsyncClient.instances[0].requests[0]["json"]


@pytest.mark.asyncio
async def test_record_ai_usage_omits_blank_session_identifier(monkeypatch, usage_settings):
    monkeypatch.setattr("core.ai_usage.usage_log_client.get_settings", lambda: usage_settings)
    monkeypatch.setattr("core.ai_usage.usage_log_client.httpx.AsyncClient", _AsyncClient)

    recorded = await record_ai_usage(
        member_id="55555555-5555-5555-5555-555555555555",
        session_id=" ",
        model_name="gpt-4o-mini",
        feature_type="INTERVIEW",
        usage=_Usage(),
    )

    assert recorded is True
    assert "sessionId" not in _AsyncClient.instances[0].requests[0]["json"]


@pytest.mark.asyncio
async def test_record_ai_usage_skips_when_both_actor_identifiers_are_provided(monkeypatch, usage_settings):
    monkeypatch.setattr("core.ai_usage.usage_log_client.get_settings", lambda: usage_settings)
    monkeypatch.setattr("core.ai_usage.usage_log_client.httpx.AsyncClient", _AsyncClient)

    recorded = await record_ai_usage(
        member_id="55555555-5555-5555-5555-555555555555",
        admin_id=44,
        model_name="gpt-4o-mini",
        feature_type="ADMIN_CS",
        input_tokens=300,
        output_tokens=80,
    )

    assert recorded is False
    assert _AsyncClient.instances == []


@pytest.mark.asyncio
async def test_record_ai_usage_returns_false_when_post_fails(monkeypatch, usage_settings):
    monkeypatch.setattr("core.ai_usage.usage_log_client.get_settings", lambda: usage_settings)
    monkeypatch.setattr("core.ai_usage.usage_log_client.httpx.AsyncClient", _AsyncClient)
    _AsyncClient.should_raise = True

    recorded = await record_ai_usage(
        member_id="55555555-5555-5555-5555-555555555555",
        model_name="gpt-4o-mini",
        feature_type="DOCUMENT",
        usage=_Usage(),
    )

    assert recorded is False
    assert len(_AsyncClient.instances[0].requests) == 1


@pytest.mark.asyncio
async def test_record_ai_usage_logs_non_sensitive_validation_fields_for_422(monkeypatch, usage_settings, caplog):
    monkeypatch.setattr("core.ai_usage.usage_log_client.get_settings", lambda: usage_settings)
    monkeypatch.setattr("core.ai_usage.usage_log_client.httpx.AsyncClient", _AsyncClient)
    _AsyncClient.status_code = 422
    _AsyncClient.response_body = {
        "detail": [
            {"loc": ["body", "sessionId"], "msg": "invalid uuid: secret-value", "type": "uuid_parsing"},
            {"loc": ["body", "featureType"], "msg": "invalid enum", "type": "enum"},
        ]
    }

    with caplog.at_level(logging.WARNING):
        recorded = await record_ai_usage(
            member_id="55555555-5555-5555-5555-555555555555",
            session_id="not-a-uuid",
            model_name="gpt-4o-mini",
            feature_type="INTERVIEW",
            usage=_Usage(),
        )

    assert recorded is False
    assert "statusCode=422" in caplog.text
    assert "errorCode=VALIDATION_ERROR" in caplog.text
    assert "validationFields=['sessionId', 'featureType']" in caplog.text
    assert "secret-value" not in caplog.text


def test_usage_log_request_accepts_interview_report_payload():
    request = UsageLogCreateRequest.model_validate(
        {
            "memberId": "55555555-5555-5555-5555-555555555555",
            "sessionId": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            "modelName": "gpt-4o-mini",
            "featureType": "INTERVIEW",
            "inputTokens": 120,
            "outputTokens": 40,
            "cost": "0",
        }
    )

    assert request.member_id == UUID("55555555-5555-5555-5555-555555555555")
    assert request.session_id == UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
