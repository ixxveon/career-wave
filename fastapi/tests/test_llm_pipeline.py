"""
llm_pipeline.py — 단위 테스트

검증 항목:
- LLM 타임아웃 → 폴백 질문 반환
- LLM JSONDecodeError → 재시도 후 폴백
- RAG 컨텍스트 포함 시 시스템 프롬프트에 주입 확인
- 폴백 질문 중복 방지 (used_fallback_questions)
"""
import asyncio
import json
from dataclasses import field
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from tests.conftest import TEST_SESSION_ID
from user.interview.pipeline import llm_pipeline
from user.interview.pipeline.llm_pipeline import _pick_fallback, _parse_llm_json
from user.interview.prompts.interview_prompts import get_fallback_questions
from user.interview.websocket.interview_ws_handler import _SessionContext, _sessions


def _make_ctx(**kwargs) -> _SessionContext:
    mock_ws = AsyncMock()
    return _SessionContext(ws=mock_ws, **kwargs)


# ── _parse_llm_json ──────────────────────────────────────────────────────────

def test_parse_llm_json_valid():
    raw = json.dumps({"question": "테스트 질문입니다.", "questionType": "FOLLOW_UP"})
    result = _parse_llm_json(raw)
    assert result["question"] == "테스트 질문입니다."
    assert result["questionType"] == "FOLLOW_UP"


def test_parse_llm_json_invalid_type_corrected():
    raw = json.dumps({"question": "질문", "questionType": "UNKNOWN"})
    result = _parse_llm_json(raw)
    assert result["questionType"] == "NEXT"


def test_parse_llm_json_missing_fields_raises():
    with pytest.raises((json.JSONDecodeError, KeyError, ValueError)):
        _parse_llm_json(json.dumps({"question": "질문만 있음"}))


# ── 폴백 질문 중복 방지 ──────────────────────────────────────────────────────

def test_pick_fallback_no_duplicate():
    ctx = _make_ctx(interview_type="TECHNICAL")
    chosen_set: set[str] = set()
    candidates = get_fallback_questions("TECHNICAL")

    for _ in range(len(candidates)):
        q = _pick_fallback(ctx)
        assert q not in chosen_set, "폴백 질문이 중복으로 선택되었습니다."
        chosen_set.add(q)


def test_pick_fallback_resets_after_all_used():
    ctx = _make_ctx(interview_type="TECHNICAL")
    candidates = get_fallback_questions("TECHNICAL")

    # 전부 소진
    for _ in range(len(candidates)):
        _pick_fallback(ctx)
    assert len(ctx.used_fallback_questions) == len(candidates)

    # 소진 후 새 질문 선택 가능
    extra = _pick_fallback(ctx)
    assert extra in candidates


# ── LLM 타임아웃 → 폴백 ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_llm_timeout_uses_fallback():
    _sessions.clear()
    mock_ws = AsyncMock()
    ctx = _SessionContext(ws=mock_ws, interview_type="TECHNICAL", session_type="TEXT")
    _sessions[TEST_SESSION_ID] = ctx

    with (
        patch("user.interview.pipeline.llm_pipeline._call_llm", side_effect=asyncio.TimeoutError()),
        patch("user.interview.pipeline.llm_pipeline.send_question_to_spring", new_callable=AsyncMock) as mock_send,
        patch("user.interview.pipeline.llm_pipeline.send_error", new_callable=AsyncMock),
    ):
        await llm_pipeline.generate_and_deliver_question(
            session_id=TEST_SESSION_ID,
            question_order=1,
            answer_text="테스트 답변입니다.",
            question_text="첫 번째 질문입니다.",
        )

    mock_send.assert_called_once()
    payload = mock_send.call_args.args[1]
    assert payload.questionOrder == 2
    assert payload.questionText in get_fallback_questions("TECHNICAL")
    assert payload.questionType == "NEXT"

    _sessions.clear()


# ── RAG 컨텍스트 프롬프트 주입 ───────────────────────────────────────────────

@pytest.mark.asyncio
async def test_rag_context_injected_into_prompt():
    """RAG 컨텍스트가 있으면 시스템 프롬프트에 서류 내용이 포함된다."""
    _sessions.clear()
    mock_ws = AsyncMock()
    ctx = _SessionContext(
        ws=mock_ws,
        interview_type="TECHNICAL",
        session_type="TEXT",
        rag_context="Python 10년 경력, FastAPI 프로젝트 다수",
    )
    _sessions[TEST_SESSION_ID] = ctx

    captured_messages: list = []

    async def fake_chat(client, model, messages):
        captured_messages.extend(messages)
        return json.dumps({"question": "질문입니다.", "questionType": "FOLLOW_UP"}), None

    with (
        patch("user.interview.pipeline.llm_pipeline._chat", side_effect=fake_chat),
        patch("user.interview.pipeline.llm_pipeline.send_question_to_spring", new_callable=AsyncMock),
    ):
        await llm_pipeline.generate_and_deliver_question(
            session_id=TEST_SESSION_ID,
            question_order=1,
            answer_text="답변입니다.",
            question_text="질문입니다.",
        )

    system_msg = captured_messages[0]["content"]
    assert "Python 10년 경력" in system_msg, "RAG 컨텍스트가 시스템 프롬프트에 주입되지 않았습니다."

    _sessions.clear()
