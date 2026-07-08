"""
LLM 기반 면접 질문 생성 파이프라인.

- GPT-4o로 다음 질문 생성 (이전 답변 이력 + RAG 컨텍스트 반영)
- asyncio.wait_for로 타임아웃 처리 → 폴백 질문 반환
- JSONDecodeError 시 1회 재시도 → 실패 시 폴백
- 세션별 used_fallback_questions로 중복 폴백 방지
"""
import asyncio
import json
import logging
import random
from typing import Any

from openai import AsyncOpenAI

from core.ai_usage.usage_log_client import record_ai_usage
from core.config import get_settings
from core.spring_client import QuestionPayload, send_question_to_spring
from user.interview.prompts.interview_prompts import (
    MAX_ANSWER_HISTORY,
    TEMPERATURE,
    build_rag_injection,
    get_company_overlay,
    get_difficulty_overlay,
    get_fallback_questions,
    get_focus_overlay,
    get_system_prompt,
)
from user.interview.websocket.interview_ws_handler import (
    InterviewErrorCode,
    get_session_meta,
    update_session_meta,
    send_error,
)

log = logging.getLogger(__name__)

_openai_client: AsyncOpenAI | None = None


def _get_openai_client() -> AsyncOpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = AsyncOpenAI(api_key=get_settings().openai_api_key)
    return _openai_client


async def generate_and_deliver_question(
    session_id: str,
    question_order: int,
    answer_text: str,
    question_text: str,
) -> None:
    """
    텍스트 답변 수신 후 LLM으로 다음 질문을 생성하고 Spring에 전달한다.
    실패 시 폴백 질문으로 대체하며 세션을 중단하지 않는다.
    """
    meta = await get_session_meta(session_id)
    if meta is None:
        log.warning("[Session: %s] LLM skipped: no active session context", session_id)
        return

    if question_order > 0:
        _record_answer(meta, question_text, answer_text)
        meta["recent_answer_quality"] = _assess_answer_quality(meta, question_order, answer_text)
        log.debug(
            "[Session: %s] answer quality assessed: order=%d, quality=%s",
            session_id, question_order, meta["recent_answer_quality"],
        )

    settings = get_settings()
    next_question_order = question_order + 1

    if next_question_order > 10:
        log.info("[Session: %s] max questions reached, triggering report", session_id)
        await update_session_meta(session_id, meta)
        from user.interview.pipeline import report_pipeline
        await report_pipeline.generate_and_send_report(session_id, meta.get("session_type") or "TEXT")
        return

    try:
        result = await asyncio.wait_for(
            _call_llm(session_id, meta, settings),
            timeout=settings.openai_llm_timeout_seconds,
        )
        question_text_generated = result["question"]
        question_type = result["questionType"]
        log.info(
            "[Session: %s] LLM question generated: order=%d, type=%s",
            session_id, next_question_order, question_type,
        )
    except Exception as e:  # asyncio.TimeoutError, OpenAIError 포함
        log.warning("[Session: %s] LLM failed (%s), using fallback", session_id, e)
        await send_error(
            session_id,
            "LLM 질문 생성에 실패하여 폴백 질문으로 대체합니다.",
            InterviewErrorCode.LLM_FAILED,
            question_order=next_question_order,
        )
        question_text_generated = _pick_fallback(meta)
        question_type = "NEXT"

    await update_session_meta(session_id, meta)

    payload = QuestionPayload(
        questionOrder=next_question_order,
        questionText=question_text_generated,
        questionType=question_type,
    )
    delivered = await send_question_to_spring(session_id, payload)
    if not delivered:
        log.error("[Session: %s] question delivery failed: order=%d", session_id, next_question_order)
        await send_error(
            session_id,
            "질문 전달에 실패했습니다. 잠시 후 다시 시도해 주세요.",
            InterviewErrorCode.LLM_FAILED,
            question_order=next_question_order,
        )
        return

    if meta.get("session_type") == "VOICE":
        from user.interview.pipeline import tts_pipeline
        await tts_pipeline.synthesize_and_stream(question_text_generated, session_id, next_question_order)


async def _call_llm(session_id: str, meta: dict[str, Any], settings) -> dict[str, str]:
    """GPT-4o 호출 후 JSON 파싱. 실패 시 1회 재시도."""
    client = _get_openai_client()
    messages = _build_messages(meta)
    model = settings.openai_model_interview

    raw, usage = await _chat(client, model, messages)
    input_tokens = _get_tokens(usage, "prompt_tokens")
    output_tokens = _get_tokens(usage, "completion_tokens")
    try:
        result = _parse_llm_json(raw)
    except (json.JSONDecodeError, KeyError, ValueError):
        log.warning("[Session: %s] LLM JSON parse failed, retrying with format hint", session_id)
        messages.append({"role": "assistant", "content": raw})
        messages.append({"role": "user", "content": "JSON 형식으로만 답해줘."})
        raw2, usage2 = await _chat(client, model, messages)
        input_tokens += _get_tokens(usage2, "prompt_tokens")
        output_tokens += _get_tokens(usage2, "completion_tokens")
        result = _parse_llm_json(raw2)

    await record_ai_usage(
        member_id=meta.get("member_id"),
        model_name=model,
        feature_type="INTERVIEW",
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        session_id=session_id,
    )
    return result


def _get_tokens(usage: object, attr: str) -> int:
    value = getattr(usage, attr, None) if usage else None
    try:
        return int(value) if value is not None else 0
    except (TypeError, ValueError):
        return 0


async def _chat(client: AsyncOpenAI, model: str, messages: list[dict]) -> tuple[str, object]:
    response = await client.chat.completions.create(
        model=model,
        messages=messages,  # type: ignore[arg-type]
        temperature=TEMPERATURE,
        response_format={"type": "json_object"},
    )
    content = response.choices[0].message.content or ""
    log.debug("LLM usage: tokens=%s", response.usage)
    return content, response.usage


def _parse_llm_json(raw: str) -> dict[str, str]:
    data = json.loads(raw)
    if "question" not in data or "questionType" not in data:
        raise ValueError("missing required fields in LLM response")
    if data["questionType"] not in ("FOLLOW_UP", "PRESSURE", "NEXT"):
        data["questionType"] = "NEXT"
    return {"question": str(data["question"]), "questionType": str(data["questionType"])}


def _build_messages(meta: dict[str, Any]) -> list[dict[str, str]]:
    system_prompt = get_system_prompt(meta.get("interview_type"))
    company_overlay = get_company_overlay(meta.get("target_company"))
    if company_overlay:
        system_prompt = system_prompt + "\n\n" + company_overlay
    focus_overlay = get_focus_overlay(meta.get("focus_type"))
    if focus_overlay:
        system_prompt = system_prompt + "\n\n" + focus_overlay
    difficulty_overlay = get_difficulty_overlay(meta.get("recent_answer_quality"))
    if difficulty_overlay:
        system_prompt = system_prompt + "\n\n" + difficulty_overlay
    rag_context = meta.get("rag_context")
    if rag_context:
        system_prompt = system_prompt + "\n\n" + build_rag_injection(rag_context)

    messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]

    # LLM 컨텍스트 초과 방지: 최근 N개만 포함
    history = (meta.get("answer_history") or [])[-MAX_ANSWER_HISTORY:]
    for record in history:
        messages.append({"role": "assistant", "content": record["question"]})
        messages.append({"role": "user", "content": record["answer"]})

    messages.append({"role": "user", "content": "다음 면접 질문을 JSON 형식으로 생성해 주세요."})
    return messages


def _record_answer(meta: dict[str, Any], question: str, answer: str) -> None:
    history: list[dict] = list(meta.get("answer_history") or [])
    history.append({"question": question, "answer": answer})
    meta["answer_history"] = history


_QUALITY_TEXT_INSUFFICIENT = 50   # 글자 수 기준: 미달
_QUALITY_TEXT_STRONG = 200        # 글자 수 기준: 우수


def _assess_answer_quality(meta: dict[str, Any], question_order: int, answer_text: str) -> str:
    """직전 답변의 품질 신호를 반환한다.

    음성 면접: voice_quality_by_order의 해당 순서 비율로 판단.
    텍스트 면접: 답변 길이로 판단.
    """
    if meta.get("session_type") == "VOICE":
        vqbo = meta.get("voice_quality_by_order") or {}
        ratio = vqbo.get(question_order)
        if ratio is None:
            return "ADEQUATE"
        if ratio < 50.0:
            return "INSUFFICIENT"
        if ratio >= 80.0:
            return "STRONG"
        return "ADEQUATE"

    text_len = len(answer_text.strip())
    if text_len < _QUALITY_TEXT_INSUFFICIENT:
        return "INSUFFICIENT"
    if text_len >= _QUALITY_TEXT_STRONG:
        return "STRONG"
    return "ADEQUATE"


def _pick_fallback(meta: dict[str, Any]) -> str:
    history = meta.get("answer_history") or []
    asked = {r["question"] for r in history}
    interview_type = meta.get("interview_type")
    used_fallback: set[str] = set(meta.get("used_fallback_questions") or [])
    candidates = get_fallback_questions(interview_type)
    unused = [q for q in candidates if q not in used_fallback and q not in asked]
    if not unused:
        unused = [q for q in candidates if q not in asked]
    if not unused:
        unused = candidates
    chosen = random.choice(unused)
    used_fallback.add(chosen)
    meta["used_fallback_questions"] = used_fallback
    return chosen
