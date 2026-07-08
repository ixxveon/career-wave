"""
stt_pipeline.py — 단위 테스트

검증 항목:
- voiceQualityRatio = 49.99 경계값 → should_mask_scores True
- voiceQualityRatio = 50.00 경계값 → should_mask_scores False
- STT 실패 시 INTERVIEW_STT_FAILED WebSocket 메시지 전송
- is_final=True 시 voice_quality_by_order가 세션 메타에 저장됨
- is_final=False 시 STT 변환 없이 버퍼에만 누적
"""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from tests.conftest import TEST_SESSION_ID, make_meta
from user.interview.pipeline.stt_pipeline import (
    calculate_voice_quality_ratio,
    should_mask_scores,
)


# ── 경계값 테스트 ─────────────────────────────────────────────────────────────

def test_voice_quality_ratio_calculation():
    """no_speech_prob 0.0 → 100.00, 1.0 → 0.00."""
    assert calculate_voice_quality_ratio(0.0) == 100.0
    assert calculate_voice_quality_ratio(1.0) == 0.0
    assert calculate_voice_quality_ratio(0.5) == 50.0


def test_should_mask_scores_below_threshold():
    """voiceQualityRatio = 49.99 → mask True."""
    assert should_mask_scores(49.99) is True


def test_should_mask_scores_at_threshold():
    """voiceQualityRatio = 50.00 → mask False (경계값 포함)."""
    assert should_mask_scores(50.00) is False


def test_should_mask_scores_above_threshold():
    """voiceQualityRatio = 80.00 → mask False."""
    assert should_mask_scores(80.00) is False


# ── STT 실패 시 에러 전송 ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_stt_failure_sends_error_message():
    """OpenAIError 발생 시 INTERVIEW_STT_FAILED WebSocket 메시지가 전송된다."""
    from openai import OpenAIError

    meta = make_meta()

    with (
        patch("user.interview.pipeline.stt_pipeline.get_session_meta", new=AsyncMock(return_value=meta)),
        patch("user.interview.pipeline.stt_pipeline.AsyncOpenAI") as mock_openai_cls,
    ):
        mock_client = AsyncMock()
        mock_openai_cls.return_value = mock_client
        mock_client.audio.transcriptions.create.side_effect = OpenAIError("STT error")

        import user.interview.pipeline.stt_pipeline as stt_mod
        with patch.object(stt_mod, "send_error", new=AsyncMock()) as mock_send_error:
            await stt_mod.transcribe_chunk(
                audio_bytes=b"fake-audio",
                session_id=TEST_SESSION_ID,
                question_order=1,
                chunk_index=0,
                is_final=True,
            )

            mock_send_error.assert_called_once()
            args = mock_send_error.call_args
            from user.interview.websocket.interview_ws_handler import InterviewErrorCode
            assert args[0][2] == InterviewErrorCode.STT_FAILED


# ── is_final=True 시 voice_quality_by_order 저장 ─────────────────────────────

@pytest.mark.asyncio
async def test_stt_final_stores_voice_quality():
    """is_final=True 처리 후 update_session_meta로 voice_quality_by_order가 저장된다."""
    meta = make_meta()

    mock_response = MagicMock()
    mock_response.text = "테스트 답변입니다."
    mock_response.no_speech_prob = 0.1  # voiceQualityRatio = 90.0
    mock_response.segments = []
    mock_response.duration = None

    import user.interview.pipeline.stt_pipeline as stt_mod
    with (
        patch("user.interview.pipeline.stt_pipeline.get_session_meta", new=AsyncMock(return_value=meta)),
        patch("user.interview.pipeline.stt_pipeline.update_session_meta", new=AsyncMock()) as mock_update,
        patch("user.interview.pipeline.stt_pipeline.AsyncOpenAI") as mock_openai_cls,
        patch.object(stt_mod, "send_stt_final", new=AsyncMock()) as mock_send_final,
    ):
        mock_client = AsyncMock()
        mock_openai_cls.return_value = mock_client
        mock_client.audio.transcriptions.create = AsyncMock(return_value=mock_response)

        await stt_mod.transcribe_chunk(
            audio_bytes=b"fake-audio",
            session_id=TEST_SESSION_ID,
            question_order=2,
            chunk_index=0,
            is_final=True,
        )

        mock_update.assert_called_once()
        updated_patch = mock_update.call_args[0][1]
        vqbo = updated_patch.get("voice_quality_by_order", {})
        assert 2 in vqbo
        assert pytest.approx(vqbo[2], abs=0.1) == 90.0
        mock_send_final.assert_called_once()


# ── is_final=False 시 STT 호출 없이 버퍼에만 누적 ─────────────────────────────

@pytest.mark.asyncio
async def test_stt_partial_does_not_call_whisper():
    """is_final=False 처리 시 STT(Whisper) 호출 없이 버퍼에만 누적된다."""
    import user.interview.pipeline.stt_pipeline as stt_mod
    with patch("user.interview.pipeline.stt_pipeline.AsyncOpenAI") as mock_openai_cls:
        mock_client = AsyncMock()
        mock_openai_cls.return_value = mock_client

        await stt_mod.transcribe_chunk(
            audio_bytes=b"fake-audio",
            session_id=TEST_SESSION_ID,
            question_order=1,
            chunk_index=3,
            is_final=False,
        )

        # is_final=False 경로에서는 Whisper API 호출 없음
        mock_client.audio.transcriptions.create.assert_not_called()
