from enum import Enum
from typing import Any

from fastapi import status


class AiMetricsErrorCode(str, Enum):
    AI_MODEL_NOT_FOUND = "AI_MODEL_NOT_FOUND"
    AI_MODEL_PROVIDER_NOT_SUPPORTED = "AI_MODEL_PROVIDER_NOT_SUPPORTED"
    AI_OPS_SETTING_NOT_FOUND = "AI_OPS_SETTING_NOT_FOUND"
    AI_USAGE_LOG_CREATE_FAILED = "AI_USAGE_LOG_CREATE_FAILED"
    INVALID_MONTHLY_BUDGET = "INVALID_MONTHLY_BUDGET"
    INVALID_ALERT_THRESHOLD = "INVALID_ALERT_THRESHOLD"
    RAG_DOCUMENT_NOT_FOUND = "RAG_DOCUMENT_NOT_FOUND"
    RAG_DOCUMENT_ALREADY_INDEXING = "RAG_DOCUMENT_ALREADY_INDEXING"
    RAG_DOCUMENT_INDEXING_FAILED = "RAG_DOCUMENT_INDEXING_FAILED"
    RAG_DOCUMENT_DELETE_FAILED = "RAG_DOCUMENT_DELETE_FAILED"
    OPENAI_API_ERROR = "OPENAI_API_ERROR"
    TOKEN_CALCULATION_FAILED = "TOKEN_CALCULATION_FAILED"
    VECTOR_INDEX_FAILED = "VECTOR_INDEX_FAILED"
    VECTOR_INDEX_DELETE_FAILED = "VECTOR_INDEX_DELETE_FAILED"


ERROR_STATUS_BY_CODE: dict[AiMetricsErrorCode, int] = {
    AiMetricsErrorCode.AI_MODEL_NOT_FOUND: status.HTTP_404_NOT_FOUND,
    AiMetricsErrorCode.AI_MODEL_PROVIDER_NOT_SUPPORTED: status.HTTP_400_BAD_REQUEST,
    AiMetricsErrorCode.AI_OPS_SETTING_NOT_FOUND: status.HTTP_404_NOT_FOUND,
    AiMetricsErrorCode.AI_USAGE_LOG_CREATE_FAILED: status.HTTP_500_INTERNAL_SERVER_ERROR,
    AiMetricsErrorCode.INVALID_MONTHLY_BUDGET: status.HTTP_400_BAD_REQUEST,
    AiMetricsErrorCode.INVALID_ALERT_THRESHOLD: status.HTTP_400_BAD_REQUEST,
    AiMetricsErrorCode.RAG_DOCUMENT_NOT_FOUND: status.HTTP_404_NOT_FOUND,
    AiMetricsErrorCode.RAG_DOCUMENT_ALREADY_INDEXING: status.HTTP_409_CONFLICT,
    AiMetricsErrorCode.RAG_DOCUMENT_INDEXING_FAILED: status.HTTP_500_INTERNAL_SERVER_ERROR,
    AiMetricsErrorCode.RAG_DOCUMENT_DELETE_FAILED: status.HTTP_500_INTERNAL_SERVER_ERROR,
    AiMetricsErrorCode.OPENAI_API_ERROR: status.HTTP_502_BAD_GATEWAY,
    AiMetricsErrorCode.TOKEN_CALCULATION_FAILED: status.HTTP_500_INTERNAL_SERVER_ERROR,
    AiMetricsErrorCode.VECTOR_INDEX_FAILED: status.HTTP_500_INTERNAL_SERVER_ERROR,
    AiMetricsErrorCode.VECTOR_INDEX_DELETE_FAILED: status.HTTP_500_INTERNAL_SERVER_ERROR,
}


DEFAULT_MESSAGE_BY_CODE: dict[AiMetricsErrorCode, str] = {
    AiMetricsErrorCode.AI_MODEL_NOT_FOUND: "AI model was not found.",
    AiMetricsErrorCode.AI_MODEL_PROVIDER_NOT_SUPPORTED: "AI model provider is not supported.",
    AiMetricsErrorCode.AI_OPS_SETTING_NOT_FOUND: "AI ops setting was not found.",
    AiMetricsErrorCode.AI_USAGE_LOG_CREATE_FAILED: "AI usage log create failed.",
    AiMetricsErrorCode.INVALID_MONTHLY_BUDGET: "Monthly budget is invalid.",
    AiMetricsErrorCode.INVALID_ALERT_THRESHOLD: "Alert threshold is invalid.",
    AiMetricsErrorCode.RAG_DOCUMENT_NOT_FOUND: "RAG document was not found.",
    AiMetricsErrorCode.RAG_DOCUMENT_ALREADY_INDEXING: "RAG document is already indexing.",
    AiMetricsErrorCode.RAG_DOCUMENT_INDEXING_FAILED: "RAG document indexing failed.",
    AiMetricsErrorCode.RAG_DOCUMENT_DELETE_FAILED: "RAG document delete failed.",
    AiMetricsErrorCode.OPENAI_API_ERROR: "OpenAI API request failed.",
    AiMetricsErrorCode.TOKEN_CALCULATION_FAILED: "Token calculation failed.",
    AiMetricsErrorCode.VECTOR_INDEX_FAILED: "Vector index operation failed.",
    AiMetricsErrorCode.VECTOR_INDEX_DELETE_FAILED: "Vector index delete failed.",
}


class AiMetricsException(Exception):
    def __init__(
        self,
        error_code: AiMetricsErrorCode,
        message: str | None = None,
        detail: dict[str, Any] | None = None,
    ) -> None:
        self.error_code = error_code
        self.message = message or DEFAULT_MESSAGE_BY_CODE[error_code]
        self.detail = detail or {}
        self.status_code = ERROR_STATUS_BY_CODE[error_code]
        super().__init__(self.message)


def build_error_response(error: AiMetricsException) -> dict[str, Any]:
    return {
        "success": False,
        "errorCode": error.error_code.value,
        "message": error.message,
        "detail": error.detail,
    }
