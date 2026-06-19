import base64
import logging

from openai import AsyncOpenAI, OpenAIError

from core.config import get_settings
from user.interview.websocket.interview_ws_handler import InterviewErrorCode, send_error, send_stt_final, send_stt_partial

log = logging.getLogger(__name__)


def calculate_voice_quality_ratio(no_speech_prob: float) -> float:
    """Whisper no_speech_prob 기반 음성 품질 비율 산정 (0.00 ~ 100.00)."""
    return round((1.0 - no_speech_prob) * 100, 2)


def should_mask_scores(voice_quality_ratio: float) -> bool:
    """voiceQualityRatio < 50.00 이면 delivery/fluency 점수를 null 처리해야 한다."""
    settings = get_settings()
    return voice_quality_ratio < settings.voice_quality_threshold


async def transcribe_chunk(
    audio_bytes: bytes,
    session_id: str,
    question_order: int,
    chunk_index: int,
    is_final: bool,
) -> None:
    """
    음성 청크를 Whisper로 STT 변환한 뒤 WebSocket으로 결과를 Push한다.

    - 중간 청크: STT_PARTIAL 전송
    - 최종 청크(is_final=True): STT_FINAL + voiceQualityRatio 전송
    - 실패 시: INTERVIEW_STT_FAILED 전송 후 종료
    """
    settings = get_settings()
    client = AsyncOpenAI(api_key=settings.openai_api_key)

    log.info(
        "STT pipeline triggered: sessionId=%s, chunkIndex=%d, isFinal=%s",
        session_id,
        chunk_index,
        is_final,
    )

    try:
        audio_file = ("audio.webm", audio_bytes, "audio/webm")
        response = await client.audio.transcriptions.create(
            model=settings.openai_model_stt,
            file=audio_file,
            response_format="verbose_json",
        )
    except OpenAIError as e:
        log.error("STT failed: sessionId=%s, chunkIndex=%d, error=%s", session_id, chunk_index, e)
        await send_error(
            session_id,
            "음성 인식 처리 중 오류가 발생했습니다.",
            InterviewErrorCode.STT_FAILED,
            question_order=question_order,
        )
        return

    transcript: str = response.text or ""

    # no_speech_prob은 verbose_json에서만 제공된다.
    # segments 원소는 SDK 버전에 따라 dict 또는 객체로 올 수 있어 양쪽 모두 처리한다.
    no_speech_prob: float = getattr(response, "no_speech_prob", 0.0)
    if not no_speech_prob and hasattr(response, "segments") and response.segments:
        probs = [
            seg.get("no_speech_prob", 0.0) if isinstance(seg, dict)
            else getattr(seg, "no_speech_prob", 0.0)
            for seg in response.segments
        ]
        no_speech_prob = sum(probs) / len(probs) if probs else 0.0

    voice_quality_ratio = calculate_voice_quality_ratio(no_speech_prob)

    if is_final:
        log.info(
            "STT final: sessionId=%s, questionOrder=%d, voiceQualityRatio=%.2f",
            session_id,
            question_order,
            voice_quality_ratio,
        )
        # 리포트 파이프라인에서 활용하기 위해 세션 컨텍스트에 저장
        from user.interview.websocket.interview_ws_handler import _sessions
        ctx = _sessions.get(session_id)
        if ctx is not None:
            ctx.voice_quality_by_order[question_order] = voice_quality_ratio

        await send_stt_final(session_id, transcript, question_order, voice_quality_ratio)
    else:
        await send_stt_partial(session_id, transcript, question_order, chunk_index)
