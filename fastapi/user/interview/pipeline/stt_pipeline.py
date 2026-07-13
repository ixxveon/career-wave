import logging
from collections import defaultdict

from openai import AsyncOpenAI, OpenAIError

from core.ai_usage.usage_log_client import record_ai_usage
from core.config import get_settings
from user.interview.websocket.interview_ws_handler import (
    InterviewErrorCode,
    get_session_meta,
    update_session_meta,
    send_answer_hint,
    send_error,
    send_stt_final,
)

log = logging.getLogger(__name__)

# session_id → question_order → 누적 청크 목록
_audio_buffers: dict[str, dict[int, list[bytes]]] = defaultdict(lambda: defaultdict(list))


# STAR 4요소를 카테고리별로 분리. 최소 2개 이상 카테고리가 매칭돼야 구조화된 답변으로 인정한다.
# any() 단일 매칭은 "그래서", "문제" 같은 일반 단어로도 통과되므로 카테고리 집합 방식으로 변경.
_STAR_CATEGORY_KEYWORDS: dict[str, set[str]] = {
    "situation": {"상황", "배경", "당시", "situation", "context", "background"},
    "task":      {"과제", "목표", "task", "challenge", "목적"},
    "action":    {"행동", "조치", "수행", "진행", "action", "했습니다", "했어요", "적용"},
    "result":    {"결과", "성과", "달성", "result", "outcome", "이루었"},
}

_STAR_HINT_MIN_CATEGORIES = 2  # 이 개수 미만의 카테고리만 매칭되면 STAR 힌트 발동

_SHORT_ANSWER_WORD_THRESHOLD = 30   # 단어 수 기준 짧은 답변
_LONG_ANSWER_WORD_THRESHOLD = 150   # 단어 수 기준 충분한 답변 (힌트 불필요)


def _count_matched_star_categories(transcript_lower: str) -> int:
    return sum(
        any(kw in transcript_lower for kw in keywords)
        for keywords in _STAR_CATEGORY_KEYWORDS.values()
    )


def _generate_answer_hint(transcript: str) -> str | None:
    """STT 변환 결과를 규칙 기반으로 분석해 힌트 메시지를 반환한다.

    힌트가 필요 없으면 None을 반환한다.
    우선순위: 짧은 답변 > STAR 구조 부재 (둘 다 해당하면 짧은 답변 힌트 우선)
    """
    words = transcript.split()
    word_count = len(words)

    if word_count == 0:
        return None

    if word_count >= _LONG_ANSWER_WORD_THRESHOLD:
        return None

    if word_count < _SHORT_ANSWER_WORD_THRESHOLD:
        return "답변이 조금 짧은 것 같아요. 구체적인 경험이나 사례를 추가하면 더 좋은 답변이 될 거예요."

    transcript_lower = transcript.lower()
    matched_categories = _count_matched_star_categories(transcript_lower)
    if matched_categories < _STAR_HINT_MIN_CATEGORIES:
        log.debug("STAR hint triggered: matched %d/%d categories", matched_categories, len(_STAR_CATEGORY_KEYWORDS))
        return "STAR 구조(상황 → 문제 → 행동 → 결과)로 답변하면 면접관이 이해하기 더 쉬워요."

    return None


# no_speech_prob이 이 임계값 이상이면 Whisper hallucination으로 판단해 transcript를 폐기한다.
# Whisper는 무음/소음 오디오에서 학습 데이터 기반의 텍스트를 상상해 출력하는 경향이 있다.
_NO_SPEECH_PROB_THRESHOLD = 0.85

# Whisper가 무음 구간에서 자신 있게 출력하는 대표적 hallucination 패턴.
# no_speech_prob으로 잡히지 않아도 텍스트 매칭으로 폐기한다.
_HALLUCINATION_PATTERNS = [
    "субтитры предоставил",   # "Subtitles provided by" (러시아어 자막 크레딧)
    "subtitles by",
    "transcribed by",
    "translated by",
    "мфц предоставил",
    "amara.org",
    "www.zeoranger.co.uk",
    "ご視聴ありがとうございました",  # 일본어 "감사합니다" 클리셰
]


def _is_hallucination_text(text: str) -> bool:
    lower = text.lower()
    return any(pattern in lower for pattern in _HALLUCINATION_PATTERNS)


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
    _pre_meta = await get_session_meta(session_id)
    member_id: str | None = (_pre_meta or {}).get("member_id")

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

    silent = False
    if no_speech_prob >= _NO_SPEECH_PROB_THRESHOLD:
        log.warning(
            "STT: hallucination masked (no_speech_prob=%.2f): sessionId=%s, questionOrder=%d, discarded=%s",
            no_speech_prob, session_id, question_order, transcript[:50],
        )
        transcript = ""
        voice_quality_ratio = 0.0
        silent = True
    elif _is_hallucination_text(transcript):
        log.warning(
            "STT: hallucination masked (pattern match): sessionId=%s, questionOrder=%d, discarded=%s",
            session_id, question_order, transcript[:80],
        )
        transcript = ""
        voice_quality_ratio = 0.0
        silent = True
    else:
        voice_quality_ratio = calculate_voice_quality_ratio(no_speech_prob)

    log.info(
        "STT final: sessionId=%s, questionOrder=%d, voiceQualityRatio=%.2f, transcript=%s",
        session_id, question_order, voice_quality_ratio, transcript[:50],
    )

    _meta = await get_session_meta(session_id)
    if _meta is not None:
        vqbo: dict[int, float] = _meta.get("voice_quality_by_order") or {}
        vqbo[question_order] = voice_quality_ratio
        await update_session_meta(session_id, {"voice_quality_by_order": vqbo})

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

    if silent:
        await send_answer_hint(
            session_id,
            "음성이 감지되지 않았습니다. 다시 말씀해 주시겠어요?",
            question_order,
        )
        return

    hint = _generate_answer_hint(transcript)
    if hint:
        await send_answer_hint(session_id, hint, question_order)
        log.info("answer hint sent: sessionId=%s, questionOrder=%d", session_id, question_order)
