import asyncio
from types import SimpleNamespace

import pytest

from admin.cs.schema.request import (
    NoticeDraftRequest,
    FaqDraftRequest,
    InquiryDraftRequest,
)
from admin.cs.service import cs_ai_service


class _Usage:
    prompt_tokens = 100
    completion_tokens = 30
    total_tokens = 130


class _Message:
    content = "생성된 초안"


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
    """OpenAI 호출과 사용량 적재를 목으로 대체하고, 적재 호출 인자를 수집한다."""
    monkeypatch.setattr(cs_ai_service, "_get_openai_client", lambda: _OpenAIClient())
    monkeypatch.setattr(
        cs_ai_service,
        "get_settings",
        lambda: SimpleNamespace(
            openai_api_key="test-key",
            openai_model_light="gpt-test-light",
            openai_llm_timeout_seconds=10,
        ),
    )

    recorded = {}

    async def _fake_record(**kwargs):
        recorded.update(kwargs)
        return True

    monkeypatch.setattr(cs_ai_service, "record_ai_usage", _fake_record)
    return recorded


@pytest.mark.asyncio
async def test_notice_draft_records_usage_with_admin_actor(patched_service):
    request = NoticeDraftRequest(category="NOTICE", title="제목", admin_id=7)

    draft = await cs_ai_service.generate_notice_draft(request)
    await asyncio.sleep(0)

    assert draft == "생성된 초안"
    assert patched_service["admin_id"] == 7
    assert patched_service["member_id"] is None
    assert patched_service["feature_type"] == "ADMIN_CS"
    assert patched_service["model_name"] == "gpt-test-light"
    assert patched_service["usage"].prompt_tokens == 100


@pytest.mark.asyncio
async def test_faq_draft_records_usage_with_admin_actor(patched_service):
    request = FaqDraftRequest(question="질문", admin_id=11)

    await cs_ai_service.generate_faq_draft(request)
    await asyncio.sleep(0)

    assert patched_service["admin_id"] == 11
    assert patched_service["feature_type"] == "ADMIN_CS"


@pytest.mark.asyncio
async def test_inquiry_draft_records_usage_with_admin_actor(patched_service):
    request = InquiryDraftRequest(
        category="SERVICE", title="제목", content="내용", admin_id=3
    )

    await cs_ai_service.generate_inquiry_draft(request)
    await asyncio.sleep(0)

    assert patched_service["admin_id"] == 3
    assert patched_service["feature_type"] == "ADMIN_CS"


def test_request_schema_accepts_camelcase_admin_id():
    """Spring이 보내는 camelCase adminId 키를 alias로 수신한다."""
    request = NoticeDraftRequest.model_validate(
        {"category": "NOTICE", "title": "제목", "adminId": 42}
    )
    assert request.admin_id == 42
