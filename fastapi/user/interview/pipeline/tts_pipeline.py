"""
TTS 오디오 생성 및 WebSocket 스트리밍 파이프라인.

- OpenAI TTS streaming 방식으로 오디오 청크를 순차 전송
- TTS_AUDIO → ... → TTS_AUDIO_END 순으로 클라이언트에 전달
- TTS 실패 시 INTERVIEW_TTS_FAILED 전송 후 종료 (텍스트 질문은 이미 Spring에 전달됨)
- WebSocket 연결 끊김 감지 시 스트리밍 즉시 중단
"""
import base64
import logging

from openai import AsyncOpenAI, OpenAIError

from core.ai_usage.usage_log_client import record_ai_usage
from core.config import get_settings
from user.interview.websocket.interview_ws_handler import (
    InterviewErrorCode,
    _sessions,
    send_error,
    send_tts_audio,
)

log = logging.getLogger(__name__)

_TTS_CHUNK_SIZE = 4096  # bytes per chunk
_openai_client: AsyncOpenAI | None = None


def _get_openai_client() -> AsyncOpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = AsyncOpenAI(api_key=get_settings().openai_api_key)
    return _openai_client


async def synthesize_and_stream(
    text: str,
    session_id: str,
    question_order: int,
) -> None:
    """
    LLM 질문 텍스트를 TTS로 변환하고 WebSocket으로 스트리밍한다.

    연결이 끊어지면 즉시 중단하여 오디오 버퍼가 메모리에 잔류하지 않도록 한다.
    """
    settings = get_settings()
    client = _get_openai_client()

    log.info(
        "[Session: %s] TTS start: questionOrder=%d, textLen=%d",
        session_id, question_order, len(text),
    )

    try:
        async with client.audio.speech.with_streaming_response.create(
            model=settings.openai_model_tts,
            voice=settings.openai_tts_voice,
            input=text,
            response_format="mp3",
        ) as response:
            chunk_index = 0
            async for audio_chunk in response.iter_bytes(chunk_size=_TTS_CHUNK_SIZE):
                if _sessions.get(session_id) is None:
                    log.info("[Session: %s] TTS cancelled: session gone", session_id)
                    return

                audio_b64 = base64.b64encode(audio_chunk).decode("ascii")
                await send_tts_audio(session_id, audio_b64, question_order, chunk_index, is_final=False)
                log.debug("[Session: %s] TTS chunk sent: idx=%d", session_id, chunk_index)
                chunk_index += 1

    except OpenAIError as e:
        log.error("[Session: %s] TTS failed: %s", session_id, e)
        await send_error(
            session_id,
            "TTS 변환 중 오류가 발생했습니다. 텍스트 질문을 확인해 주세요.",
            InterviewErrorCode.TTS_FAILED,
            question_order=question_order,
        )
        return

    await send_tts_audio(session_id, "", question_order, 0, is_final=True)
    log.info("[Session: %s] TTS complete: questionOrder=%d", session_id, question_order)

    # TTS 사용량 적재 — input_tokens: 입력 글자 수 (실제 토큰 아님)
    ctx = _sessions.get(session_id)
    member_id = ctx.member_id if ctx is not None else None
    await record_ai_usage(
        member_id=member_id,
        model_name=settings.openai_model_tts,
        feature_type="INTERVIEW_TTS",
        input_tokens=max(1, len(text)),
        output_tokens=0,
        session_id=session_id,
    )
