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
from unittest.mock import AsyncMock, patch

import pytest

from tests.conftest import TEST_SESSION_ID, make_meta
from user.interview.pipeline import llm_pipeline
from user.interview.pipeline.llm_pipeline import _pick_fallback, _parse_llm_json
from user.interview.prompts.interview_prompts import get_fallback_questions


def _make_meta(**kwargs) -> dict:
    return make_meta(**kwargs)


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
    meta = _make_meta(interview_type="TECHNICAL")
    chosen_set: set[str] = set()
    candidates = get_fallback_questions("TECHNICAL")

    for _ in range(len(candidates)):
        q = _pick_fallback(meta)
        assert q not in chosen_set, "폴백 질문이 중복으로 선택되었습니다."
        chosen_set.add(q)


def test_pick_fallback_resets_after_all_used():
    meta = _make_meta(interview_type="TECHNICAL")
    candidates = get_fallback_questions("TECHNICAL")

    # 전부 소진
    for _ in range(len(candidates)):
        _pick_fallback(meta)
    assert len(meta["used_fallback_questions"]) == len(candidates)

    # 소진 후 새 질문 선택 가능
    extra = _pick_fallback(meta)
    assert extra in candidates


def test_pick_fallback_excludes_answer_history():
    """answer_history에 이미 출제된 질문은 폴백 후보에서 제외된다."""
    candidates = get_fallback_questions("TECHNICAL")
    if len(candidates) < 2:
        pytest.skip("폴백 후보가 2개 미만이면 검증 불가")

    already_asked = candidates[0]
    meta = _make_meta(
        interview_type="TECHNICAL",
        answer_history=[{"question": already_asked, "answer": "답변"}],
    )

    for _ in range(10):
        chosen = _pick_fallback(meta)
        assert chosen != already_asked, "answer_history에 있는 질문이 폴백으로 선택됐습니다."


def test_pick_fallback_relaxes_when_all_candidates_in_history():
    """모든 후보가 answer_history에 있을 때는 완화 조건으로 후보 전체에서 선택된다."""
    candidates = get_fallback_questions("TECHNICAL")
    meta = _make_meta(
        interview_type="TECHNICAL",
        answer_history=[{"question": q, "answer": "답변"} for q in candidates],
    )

    chosen = _pick_fallback(meta)
    assert chosen in candidates, "완화 조건에서도 후보 목록 내 질문이어야 합니다."


# ── LLM 타임아웃 → 폴백 ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_llm_timeout_uses_fallback():
    meta = _make_meta(interview_type="TECHNICAL", session_type="TEXT")

    with (
        patch("user.interview.pipeline.llm_pipeline.get_session_meta", new=AsyncMock(return_value=meta)),
        patch("user.interview.pipeline.llm_pipeline.update_session_meta", new=AsyncMock()),
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


# ── RAG 컨텍스트 프롬프트 주입 ───────────────────────────────────────────────

@pytest.mark.asyncio
async def test_rag_context_injected_into_prompt():
    """RAG 컨텍스트가 있으면 시스템 프롬프트에 서류 내용이 포함된다."""
    meta = _make_meta(
        interview_type="TECHNICAL",
        session_type="TEXT",
        rag_context="Python 10년 경력, FastAPI 프로젝트 다수",
    )

    captured_messages: list = []

    async def fake_chat(client, model, messages):
        captured_messages.extend(messages)
        return json.dumps({"question": "질문입니다.", "questionType": "FOLLOW_UP"}), None

    with (
        patch("user.interview.pipeline.llm_pipeline.get_session_meta", new=AsyncMock(return_value=meta)),
        patch("user.interview.pipeline.llm_pipeline.update_session_meta", new=AsyncMock()),
        patch("user.interview.pipeline.llm_pipeline._chat", side_effect=fake_chat),
        patch("user.interview.pipeline.llm_pipeline.send_question_to_spring", new_callable=AsyncMock),
        patch("user.interview.pipeline.llm_pipeline.record_ai_usage", new=AsyncMock()),
    ):
        await llm_pipeline.generate_and_deliver_question(
            session_id=TEST_SESSION_ID,
            question_order=1,
            answer_text="답변입니다.",
            question_text="질문입니다.",
        )

    system_msg = captured_messages[0]["content"]
    assert "Python 10년 경력" in system_msg, "RAG 컨텍스트가 시스템 프롬프트에 주입되지 않았습니다."
