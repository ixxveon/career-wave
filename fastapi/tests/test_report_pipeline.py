"""
report_pipeline.py — 단위 테스트

검증 항목:
- 리포트 생성 후 Spring 콜백 페이로드 구조 검증
- voiceQualityRatio < 50.00 → deliveryScore/fluencyScore null
- voiceQualityRatio is None (텍스트 면접) → deliveryScore/fluencyScore null
- LLM 실패 시 부분 콜백(빈 점수) 전송
- 답변 이력 없을 때 빈 콜백 전송
"""
import json
from unittest.mock import AsyncMock, patch

import pytest

from tests.conftest import TEST_SESSION_ID
from user.interview.pipeline import report_pipeline
from user.interview.websocket.interview_ws_handler import _SessionContext, _sessions


def _make_ctx(answer_history=None, voice_quality_by_order=None) -> _SessionContext:
    mock_ws = AsyncMock()
    ctx = _SessionContext(ws=mock_ws)
    if answer_history:
        ctx.answer_history = answer_history
    if voice_quality_by_order:
        ctx.voice_quality_by_order = voice_quality_by_order
    return ctx


def _fake_llm_response(feedbacks: list[dict], total_score: int = 78):
    return json.dumps({"totalScore": total_score, "feedbacks": feedbacks})


# ── 콜백 페이로드 구조 ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_report_callback_payload_structure():
    """리포트 생성 완료 후 Spring 콜백 페이로드에 필수 필드가 포함된다."""
    _sessions.clear()
    ctx = _make_ctx(
        answer_history=[{"question": "기술 스택을 소개해 주세요.", "answer": "Java Spring Boot"}],
        voice_quality_by_order={1: 85.0},
    )
    _sessions[TEST_SESSION_ID] = ctx

    llm_feedbacks = [{"questionOrder": 1, "relevanceScore": 80, "depthScore": 70,
                      "deliveryScore": 75, "fluencyScore": 80, "aiFeedback": "좋습니다."}]

    captured = {}

    async def fake_callback(session_id, payload):
        captured["payload"] = payload

    with (
        patch("user.interview.pipeline.report_pipeline._call_llm_report",
              return_value={"totalScore": 78, "feedbacks": llm_feedbacks}),
        patch("user.interview.pipeline.report_pipeline.send_report_callback",
              side_effect=fake_callback),
    ):
        await report_pipeline.generate_and_send_report(TEST_SESSION_ID, "VOICE")

    payload = captured["payload"]
    assert payload.sessionId == TEST_SESSION_ID
    assert payload.totalScore == 78
    assert len(payload.feedbacks) == 1
    fb = payload.feedbacks[0]
    assert fb.questionOrder == 1
    assert fb.relevanceScore == 80
    assert fb.voiceQualityRatio == 85.0

    _sessions.clear()


# ── voiceQualityRatio < 50 → null ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_low_voice_quality_masks_scores():
    """voiceQualityRatio < 50.00이면 deliveryScore/fluencyScore가 null이다."""
    _sessions.clear()
    ctx = _make_ctx(
        answer_history=[{"question": "질문입니다.", "answer": "답변입니다."}],
        voice_quality_by_order={1: 42.3},
    )
    _sessions[TEST_SESSION_ID] = ctx

    llm_feedbacks = [{"questionOrder": 1, "relevanceScore": 80, "depthScore": 70,
                      "deliveryScore": 75, "fluencyScore": 80, "aiFeedback": "피드백"}]

    captured = {}

    async def fake_callback(session_id, payload):
        captured["payload"] = payload

    with (
        patch("user.interview.pipeline.report_pipeline._call_llm_report",
              return_value={"totalScore": 70, "feedbacks": llm_feedbacks}),
        patch("user.interview.pipeline.report_pipeline.send_report_callback",
              side_effect=fake_callback),
    ):
        await report_pipeline.generate_and_send_report(TEST_SESSION_ID, "VOICE")

    fb = captured["payload"].feedbacks[0]
    assert fb.deliveryScore is None
    assert fb.fluencyScore is None
    assert fb.voiceQualityRatio == pytest.approx(42.3)

    _sessions.clear()


# ── 텍스트 면접 → delivery/fluency null ─────────────────────────────────────

@pytest.mark.asyncio
async def test_text_interview_masks_delivery_fluency():
    """텍스트 면접(sessionType=TEXT)이면 deliveryScore/fluencyScore가 null이다."""
    _sessions.clear()
    ctx = _make_ctx(
        answer_history=[{"question": "질문입니다.", "answer": "답변입니다."}],
    )
    _sessions[TEST_SESSION_ID] = ctx

    llm_feedbacks = [{"questionOrder": 1, "relevanceScore": 85, "depthScore": 75,
                      "deliveryScore": 80, "fluencyScore": 70, "aiFeedback": "피드백"}]

    captured = {}

    async def fake_callback(session_id, payload):
        captured["payload"] = payload

    with (
        patch("user.interview.pipeline.report_pipeline._call_llm_report",
              return_value={"totalScore": 80, "feedbacks": llm_feedbacks}),
        patch("user.interview.pipeline.report_pipeline.send_report_callback",
              side_effect=fake_callback),
    ):
        await report_pipeline.generate_and_send_report(TEST_SESSION_ID, "TEXT")

    fb = captured["payload"].feedbacks[0]
    assert fb.deliveryScore is None
    assert fb.fluencyScore is None
    assert fb.voiceQualityRatio is None

    _sessions.clear()


# ── LLM 실패 → 부분 콜백 ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_llm_failure_sends_partial_callback():
    """LLM 실패 시 점수 없이 답변 텍스트만 포함한 부분 콜백이 전송된다."""
    _sessions.clear()
    ctx = _make_ctx(
        answer_history=[{"question": "질문", "answer": "답변"}],
    )
    _sessions[TEST_SESSION_ID] = ctx

    captured = {}

    async def fake_callback(session_id, payload):
        captured["payload"] = payload

    with (
        patch("user.interview.pipeline.report_pipeline._call_llm_report",
              side_effect=Exception("LLM error")),
        patch("user.interview.pipeline.report_pipeline.send_report_callback",
              side_effect=fake_callback),
    ):
        await report_pipeline.generate_and_send_report(TEST_SESSION_ID, "TEXT")

    payload = captured["payload"]
    assert payload.totalScore is None
    assert len(payload.feedbacks) == 1
    assert payload.feedbacks[0].relevanceScore is None

    _sessions.clear()


# ── 답변 이력 없음 → 빈 콜백 ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_empty_history_sends_empty_callback():
    """답변 이력이 없으면 빈 feedbacks로 콜백이 전송된다."""
    _sessions.clear()
    ctx = _make_ctx()
    _sessions[TEST_SESSION_ID] = ctx

    captured = {}

    async def fake_callback(session_id, payload):
        captured["payload"] = payload

    with patch("user.interview.pipeline.report_pipeline.send_report_callback",
               side_effect=fake_callback):
        await report_pipeline.generate_and_send_report(TEST_SESSION_ID, "TEXT")

    assert captured["payload"].feedbacks == []
    assert captured["payload"].totalScore is None

    _sessions.clear()
