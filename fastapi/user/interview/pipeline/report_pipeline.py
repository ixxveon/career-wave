"""
면접 리포트 생성 파이프라인.

- 세션 컨텍스트의 answer_history + voice_quality_by_order를 기반으로 GPT-4o 리포트 분석
- voiceQualityRatio < 50.00 또는 텍스트 면접(None) → deliveryScore/fluencyScore null 처리
- 리포트 생성 실패 시 빈 feedbacks + totalScore: null 부분 콜백 전송
- Spring 콜백은 spring_client.send_report_callback (지수 백오프 재시도)
"""
import json
import logging

from openai import AsyncOpenAI, OpenAIError

from core.config import get_settings
from core.spring_client import FeedbackPayload, ReportCallbackPayload, send_report_callback
from user.interview.pipeline.stt_pipeline import should_mask_scores
from user.interview.prompts.report_prompts import (
    REPORT_TEMPERATURE,
    build_report_user_prompt,
    REPORT_SYSTEM_PROMPT,
)
from user.interview.websocket.interview_ws_handler import _sessions

log = logging.getLogger(__name__)


async def generate_and_send_report(session_id: str, session_type: str) -> None:
    """
    세션 컨텍스트의 답변 이력을 분석하여 리포트를 생성하고 Spring에 콜백 전송한다.
    실패 시 빈 feedbacks로 부분 콜백을 전송하여 Spring이 REPORT_READY를 처리할 수 있도록 한다.
    """
    ctx = _sessions.get(session_id)
    if ctx is None:
        log.warning("[Session: %s] report skipped: no active session context", session_id)
        return

    if not ctx.answer_history:
        log.warning("[Session: %s] report skipped: no answer history", session_id)
        await _send_empty_report(session_id)
        return

    answers = _build_answer_list(ctx, session_type)

    try:
        result = await _call_llm_report(session_id, answers)
        feedbacks = _build_feedbacks(answers, result)
        total_score: int | None
        try:
            raw_score = result.get("totalScore")
            total_score = int(raw_score) if raw_score is not None else None
        except (TypeError, ValueError):
            log.warning("[Session: %s] totalScore 변환 실패 — null 처리: value=%s", session_id, result.get("totalScore"))
            total_score = None
        log.info(
            "[Session: %s] report generated: totalScore=%s, feedbacks=%d",
            session_id, total_score, len(feedbacks),
        )
    except Exception as e:
        log.error("[Session: %s] report generation failed: %s — sending partial callback", session_id, e)
        feedbacks = _build_feedbacks_no_score(answers)
        total_score = None

    payload = ReportCallbackPayload(
        sessionId=session_id,
        totalScore=total_score,
        feedbacks=feedbacks,
    )
    await send_report_callback(session_id, payload)


async def _call_llm_report(session_id: str, answers: list[dict]) -> dict:
    settings = get_settings()
    client = AsyncOpenAI(api_key=settings.openai_api_key)

    user_prompt = build_report_user_prompt(answers)
    response = await client.chat.completions.create(
        model=settings.openai_model_interview,
        messages=[
            {"role": "system", "content": REPORT_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=REPORT_TEMPERATURE,
        response_format={"type": "json_object"},
    )
    raw = response.choices[0].message.content or "{}"
    log.debug("[Session: %s] report LLM usage: %s", session_id, response.usage)
    data = json.loads(raw)

    if "feedbacks" not in data:
        raise ValueError("missing feedbacks in LLM report response")
    return data


def _build_answer_list(ctx, session_type: str) -> list[dict]:
    """answer_history + voice_quality_by_order를 합쳐 평가용 답변 목록을 구성한다."""
    result = []
    for idx, record in enumerate(ctx.answer_history):
        order = idx + 1
        is_voice = session_type.upper() == "VOICE"
        vqr: float | None = ctx.voice_quality_by_order.get(order) if is_voice else None
        # voiceQualityRatio가 None(텍스트 면접)이거나 50 미만이면 delivery/fluency null 처리
        mask = vqr is None or should_mask_scores(vqr)
        result.append({
            "questionOrder": order,
            "questionText": record.get("question", ""),
            "answerText": record.get("answer", ""),
            "voiceQualityRatio": vqr,
            "maskScores": mask,
        })
    return result


def _build_feedbacks(answers: list[dict], llm_result: dict) -> list[FeedbackPayload]:
    score_map: dict[int, dict] = {
        f["questionOrder"]: f
        for f in llm_result.get("feedbacks", [])
        if isinstance(f, dict) and "questionOrder" in f
    }

    feedbacks = []
    for item in answers:
        order = item["questionOrder"]
        llm_fb = score_map.get(order, {})
        mask = item["maskScores"]

        feedbacks.append(FeedbackPayload(
            questionOrder=order,
            questionText=item["questionText"],
            answerText=item["answerText"],
            relevanceScore=_to_int(llm_fb.get("relevanceScore")),
            depthScore=_to_int(llm_fb.get("depthScore")),
            deliveryScore=None if mask else _to_int(llm_fb.get("deliveryScore")),
            fluencyScore=None if mask else _to_int(llm_fb.get("fluencyScore")),
            voiceQualityRatio=item["voiceQualityRatio"],
            aiFeedback=llm_fb.get("aiFeedback"),
        ))
    return feedbacks


def _build_feedbacks_no_score(answers: list[dict]) -> list[FeedbackPayload]:
    """LLM 실패 시 점수 없이 답변 텍스트만 포함한 부분 피드백을 반환한다."""
    return [
        FeedbackPayload(
            questionOrder=item["questionOrder"],
            questionText=item["questionText"],
            answerText=item["answerText"],
            voiceQualityRatio=item["voiceQualityRatio"],
        )
        for item in answers
    ]


async def _send_empty_report(session_id: str) -> None:
    payload = ReportCallbackPayload(sessionId=session_id, totalScore=None, feedbacks=[])
    await send_report_callback(session_id, payload)


def _to_int(value) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None
