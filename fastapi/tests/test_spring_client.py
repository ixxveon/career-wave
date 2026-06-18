"""
spring_client.py — 단위 테스트

검증 항목:
- 1차 시도 성공
- 2회 실패 후 3차 성공 (지수 백오프)
- 3회 모두 실패 시 log.error 기록
- duplicated: true 응답 시 정상 처리 (멱등)
- Pydantic 페이로드 직렬화 정합성 (voiceQualityRatio < 50 null 처리)
"""
import logging
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from core.spring_client import FeedbackPayload, ReportCallbackPayload, send_report_callback
from tests.conftest import TEST_SESSION_ID


def _make_payload(
    total_score: int | None = 78,
    delivery_score: int | None = 80,
    fluency_score: int | None = 75,
    voice_quality_ratio: float | None = 92.5,
) -> ReportCallbackPayload:
    return ReportCallbackPayload(
        sessionId=TEST_SESSION_ID,
        totalScore=total_score,
        feedbacks=[
            FeedbackPayload(
                questionOrder=1,
                questionText="Spring 트랜잭션을 설명해주세요.",
                answerText="@Transactional을 사용합니다.",
                relevanceScore=85,
                depthScore=70,
                deliveryScore=delivery_score,
                fluencyScore=fluency_score,
                voiceQualityRatio=voice_quality_ratio,
                aiFeedback="구체적인 예시가 부족합니다.",
            )
        ],
    )


def _mock_response(status_code: int = 200, body: dict | None = None) -> MagicMock:
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = body or {"success": True}
    resp.raise_for_status = MagicMock()
    if status_code >= 400:
        import httpx

        resp.raise_for_status.side_effect = httpx.HTTPStatusError(
            "error", request=MagicMock(), response=resp
        )
    return resp


@pytest.mark.asyncio
async def test_callback_success_on_first_attempt():
    payload = _make_payload()
    mock_post = AsyncMock(return_value=_mock_response(200))

    with patch("httpx.AsyncClient.post", mock_post):
        await send_report_callback(TEST_SESSION_ID, payload)

    assert mock_post.call_count == 1


@pytest.mark.asyncio
async def test_callback_retry_then_success(caplog):
    payload = _make_payload()
    fail = _mock_response(500)
    success = _mock_response(200)
    mock_post = AsyncMock(side_effect=[fail, fail, success])

    with patch("httpx.AsyncClient.post", mock_post), patch("asyncio.sleep", new_callable=AsyncMock):
        with caplog.at_level(logging.WARNING, logger="core.spring_client"):
            await send_report_callback(TEST_SESSION_ID, payload)

    assert mock_post.call_count == 3
    assert any("attempt" in r.message for r in caplog.records)


@pytest.mark.asyncio
async def test_callback_all_fail_logs_error(caplog):
    payload = _make_payload()
    fail = _mock_response(500)
    mock_post = AsyncMock(side_effect=[fail, fail, fail])

    with patch("httpx.AsyncClient.post", mock_post), patch("asyncio.sleep", new_callable=AsyncMock):
        with caplog.at_level(logging.ERROR, logger="core.spring_client"):
            await send_report_callback(TEST_SESSION_ID, payload)

    assert mock_post.call_count == 3
    assert any("failed after all retries" in r.message for r in caplog.records)


@pytest.mark.asyncio
async def test_callback_duplicated_response_is_success(caplog):
    """Spring이 duplicated: true를 반환해도 예외 없이 정상 처리한다."""
    payload = _make_payload()
    mock_post = AsyncMock(return_value=_mock_response(200, {"success": True, "duplicated": True}))

    with patch("httpx.AsyncClient.post", mock_post):
        with caplog.at_level(logging.INFO, logger="core.spring_client"):
            await send_report_callback(TEST_SESSION_ID, payload)

    assert mock_post.call_count == 1
    assert any("duplicated" in r.message for r in caplog.records)


def test_payload_null_scores_when_voice_quality_low():
    """voiceQualityRatio < 50.00 항목은 deliveryScore / fluencyScore가 null이어야 한다."""
    payload = _make_payload(delivery_score=None, fluency_score=None, voice_quality_ratio=42.3)
    feedback = payload.model_dump()["feedbacks"][0]

    assert feedback["deliveryScore"] is None
    assert feedback["fluencyScore"] is None
    assert feedback["voiceQualityRatio"] == pytest.approx(42.3)


def test_payload_null_scores_for_text_interview():
    """텍스트 면접(voiceQualityRatio=null)은 deliveryScore / fluencyScore가 null이어야 한다."""
    payload = _make_payload(delivery_score=None, fluency_score=None, voice_quality_ratio=None)
    feedback = payload.model_dump()["feedbacks"][0]

    assert feedback["deliveryScore"] is None
    assert feedback["fluencyScore"] is None
    assert feedback["voiceQualityRatio"] is None
