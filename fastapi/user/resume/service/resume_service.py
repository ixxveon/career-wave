import asyncio
import json
import logging
import re
from functools import lru_cache

from openai import AsyncOpenAI, APIError, APITimeoutError

from core.config import get_settings
from user.resume.prompts.resume_prompts import (
    RESUME_SYSTEM_PROMPT,
    COVER_LETTER_SYSTEM_PROMPT,
    build_resume_user_prompt,
    build_cover_letter_user_prompt,
)
from user.resume.schema.request import AnalyzeDocumentRequest
from user.resume.service.file_parser import FileParseError, parse_resume_file
from user.resume.service.webhook_client import send_webhook

logger = logging.getLogger(__name__)

_CJK_PATTERN = re.compile(r'[一-鿿㐀-䶿豈-﫿]')
_LOANWORD_FIXES: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r'[임입][팩팬][^\s트]*'), '성과 영향'),
    (re.compile(r'[퍼비][센][^\s트]*'), '비율'),
]


@lru_cache
def _get_openai_client() -> AsyncOpenAI:
    return AsyncOpenAI(api_key=get_settings().openai_api_key)


_ERROR_MESSAGES = {
    "parse_failed": "파일을 읽을 수 없습니다. PDF 또는 DOCX 형식인지 확인해 주세요.",
    "ai_timeout": "AI 분석 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.",
    "ai_error": "AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    "parse_response": "AI 응답을 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    "unknown": "분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
}

def _failed_payload(document_id: str, error_message: str) -> dict:
    return {
        "documentId": document_id,
        "status": "FAILED",
        "scoreJobFitness": None,
        "scoreTechStack": None,
        "scoreQuantified": None,
        "scoreLogical": None,
        "scoreTotal": None,
        "overallReview": None,
        "feedbackText": None,
        "errorMessage": error_message,
    }


async def analyze_document(request: AnalyzeDocumentRequest) -> None:
    document_id = str(request.document_id)
    logger.info(f"[{document_id}] Analysis started — fileType={request.file_type}")

    await _send_webhook_safe(document_id, {"documentId": document_id, "status": "PENDING"})

    try:
        if request.file_type == "RESUME":
            await _analyze_resume(document_id, request)
        else:
            await _analyze_cover_letter(document_id, request)
    except FileParseError as e:
        logger.error(f"[{document_id}] File parse failed: {e.user_message}", exc_info=True)
        await _send_webhook_safe(document_id, _failed_payload(document_id, e.user_message))
    except APITimeoutError:
        logger.error(f"[{document_id}] OpenAI timeout", exc_info=True)
        await _send_webhook_safe(document_id, _failed_payload(document_id, _ERROR_MESSAGES["ai_timeout"]))
    except APIError as e:
        logger.error(f"[{document_id}] OpenAI API error: {e}", exc_info=True)
        await _send_webhook_safe(document_id, _failed_payload(document_id, _ERROR_MESSAGES["ai_error"]))
    except (json.JSONDecodeError, KeyError, ValueError) as e:
        logger.error(f"[{document_id}] AI response parse failed: {e}", exc_info=True)
        await _send_webhook_safe(document_id, _failed_payload(document_id, _ERROR_MESSAGES["parse_response"]))
    except Exception:
        logger.error(f"[{document_id}] Unexpected error", exc_info=True)
        await _send_webhook_safe(document_id, _failed_payload(document_id, _ERROR_MESSAGES["unknown"]),
        )


async def _analyze_resume(document_id: str, request: AnalyzeDocumentRequest) -> None:
    resume_text = await asyncio.to_thread(
        parse_resume_file,
        document_id,
        str(request.file_url),
        request.original_name,
    )

    await _send_webhook_safe(document_id, {"documentId": document_id, "status": "ANALYZING"})

    result = await _call_openai(
        document_id=document_id,
        system_prompt=RESUME_SYSTEM_PROMPT,
        user_prompt=build_resume_user_prompt(resume_text),
        model="deep",
    )

    await _send_webhook_safe(document_id, {"documentId": document_id, "status": "ANALYZING"})

    await _send_completed(document_id, result)


async def _analyze_cover_letter(document_id: str, request: AnalyzeDocumentRequest) -> None:
    await _send_webhook_safe(document_id, {"documentId": document_id, "status": "ANALYZING"})

    content_dicts = [
        {"order": item.order, "question": item.question, "answer": item.answer}
        for item in (request.content or [])
    ]

    result = await _call_openai(
        document_id=document_id,
        system_prompt=COVER_LETTER_SYSTEM_PROMPT,
        user_prompt=build_cover_letter_user_prompt(
            request.company,
            request.job,
            content_dicts,
        ),
        model="deep",
    )

    await _send_webhook_safe(document_id, {"documentId": document_id, "status": "ANALYZING"})

    await _send_completed(document_id, result)


async def _call_openai(
    document_id: str,
    system_prompt: str,
    user_prompt: str,
    model: str,
) -> dict:
    settings = get_settings()
    client = _get_openai_client()
    model_id = settings.openai_model_deep if model == "deep" else settings.openai_model_light

    completion = await client.chat.completions.create(
        model=model_id,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0,
        timeout=120,
    )

    usage = completion.usage
    logger.info(
        f"[{document_id}] Token usage — "
        f"input={usage.prompt_tokens} output={usage.completion_tokens} total={usage.total_tokens}"
    )

    content = completion.choices[0].message.content or ""
    result = json.loads(content)
    return _sanitize_response(result)


def _sanitize_response(obj: object) -> object:
    if isinstance(obj, str):
        text = _CJK_PATTERN.sub('', obj)
        for pattern, replacement in _LOANWORD_FIXES:
            text = pattern.sub(replacement, text)
        return text
    if isinstance(obj, dict):
        return {k: _sanitize_response(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize_response(item) for item in obj]
    return obj


async def _send_completed(document_id: str, result: dict) -> None:
    feedback_details = result["feedbackDetails"]
    feedback_text = json.dumps(feedback_details, ensure_ascii=False)

    await _send_webhook_safe(
        document_id,
        {
            "documentId": document_id,
            "status": "COMPLETED",
            "scoreJobFitness": result["scoreJobFitness"],
            "scoreTechStack": result["scoreTechStack"],
            "scoreQuantified": result["scoreQuantified"],
            "scoreLogical": result["scoreLogical"],
            "scoreTotal": result["scoreTotal"],
            "overallReview": result["overallReview"],
            "feedbackText": feedback_text,
            "errorMessage": None,
        },
    )
    logger.info(f"[{document_id}] Analysis completed successfully")


async def _send_webhook_safe(document_id: str, payload: dict) -> None:
    try:
        await send_webhook(document_id, payload)
    except Exception:
        logger.error(f"[{document_id}] Webhook send failed — status={payload.get('status')}", exc_info=True)
