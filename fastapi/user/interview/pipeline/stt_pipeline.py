import logging
from collections import defaultdict

from openai import AsyncOpenAI, OpenAIError

from core.ai_usage.usage_log_client import record_ai_usage
from core.config import get_settings
from user.interview.websocket.interview_ws_handler import InterviewErrorCode, _sessions, send_error, send_stt_final

log = logging.getLogger(__name__)

# session_id → question_order → 누적 청크 목록
_audio_buffers: dict[str, dict[int, list[bytes]]] = defaultdict(lambda: defaultdict(list))


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
    음성 청크를 누적 후 isFinal=True 시점에 Whisper로 일괄 STT 변환한다.

    - 중간 청크: 버퍼에 누적만 함
    - 최종 청크(is_final=True): 전체 합쳐서 Whisper 전송 후 STT_FINAL 전송
    - 실패 시: INTERVIEW_STT_FAILED 전송 후 종료
    """
    _audio_buffers[session_id][question_order].append(audio_bytes)

    log.info(
        "STT chunk buffered: sessionId=%s, chunkIndex=%d, isFinal=%s",
        session_id,
        chunk_index,
        is_final,
    )

    if not is_final:
        return

    # isFinal=True → 누적된 청크 합쳐서 Whisper 전송
    merged_audio = b"".join(_audio_buffers[session_id].pop(question_order, []))
    if not _audio_buffers[session_id]:
        _audio_buffers.pop(session_id, None)

    if not merged_audio:
        log.warning("STT: empty audio for sessionId=%s, questionOrder=%d", session_id, question_order)
        await send_stt_final(session_id, "", question_order, 0.0)
        return

    settings = get_settings()
    client = AsyncOpenAI(api_key=settings.openai_api_key)

    # Whisper await 전에 member_id 캡처 — 응답 대기 중 세션이 만료되어도 사용량 기록 가능
    member_id: str | None = _sessions.get(session_id) and _sessions[session_id].member_id or None

    try:
        audio_file = ("audio.webm", merged_audio, "audio/webm")
        response = await client.audio.transcriptions.create(
            model=settings.openai_model_stt,
            file=audio_file,
            response_format="verbose_json",
        )
    except OpenAIError as e:
        log.error("STT failed: sessionId=%s, questionOrder=%d, error=%s", session_id, question_order, e)
        await send_error(
            session_id,
            "음성 인식 처리 중 오류가 발생했습니다.",
            InterviewErrorCode.STT_FAILED,
            question_order=question_order,
        )
        return

    transcript: str = response.text or ""

    no_speech_prob: float = getattr(response, "no_speech_prob", 0.0)
    if not no_speech_prob and hasattr(response, "segments") and response.segments:
        probs = [
            seg.get("no_speech_prob", 0.0) if isinstance(seg, dict)
            else getattr(seg, "no_speech_prob", 0.0)
            for seg in response.segments
        ]
        no_speech_prob = sum(probs) / len(probs) if probs else 0.0

    voice_quality_ratio = calculate_voice_quality_ratio(no_speech_prob)

    log.info(
        "STT final: sessionId=%s, questionOrder=%d, voiceQualityRatio=%.2f, transcript=%s",
        session_id, question_order, voice_quality_ratio, transcript[:50],
    )

    ctx = _sessions.get(session_id)
    if ctx is not None:
        ctx.voice_quality_by_order[question_order] = voice_quality_ratio

    # STT 사용량 적재 — input_tokens: 오디오 duration(초) 기반 환산값 (실제 토큰 아님)
    audio_duration_seconds = getattr(response, "duration", None)
    if audio_duration_seconds is not None:
        await record_ai_usage(
            member_id=member_id,
            model_name=settings.openai_model_stt,
            feature_type="INTERVIEW_STT",
            input_tokens=max(1, round(audio_duration_seconds)),
            output_tokens=0,
            session_id=session_id,
        )

    await send_stt_final(session_id, transcript, question_order, voice_quality_ratio)
