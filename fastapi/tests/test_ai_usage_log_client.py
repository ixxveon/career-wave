from types import SimpleNamespace
from uuid import UUID

import pytest

from core.ai_usage.usage_log_client import record_ai_usage


class _Usage:
    prompt_tokens = 120
    completion_tokens = 40


class _Response:
    def __init__(self, should_raise: bool = False) -> None:
        self._should_raise = should_raise

    def raise_for_status(self) -> None:
        if self._should_raise:
            raise RuntimeError("boom")


class _AsyncClient:
    instances: list["_AsyncClient"] = []
    should_raise = False

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
        return _Response(should_raise=self.should_raise)


@pytest.fixture(autouse=True)
def reset_async_client():
    _AsyncClient.instances = []
    _AsyncClient.should_raise = False


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
