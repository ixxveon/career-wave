from enum import Enum
from typing import Any

from fastapi import status


class ScrapingErrorCode(str, Enum):
    SCRAPING_PIPELINE_NOT_FOUND = "SCRAPING_PIPELINE_NOT_FOUND"
    SCRAPING_SOURCE_NOT_FOUND = "SCRAPING_SOURCE_NOT_FOUND"
    SCRAPING_ALREADY_RUNNING = "SCRAPING_ALREADY_RUNNING"
    SCRAPING_EXECUTION_FAILED = "SCRAPING_EXECUTION_FAILED"
    SCRAPING_TEST_FAILED = "SCRAPING_TEST_FAILED"
    FASTAPI_INTERNAL_ERROR = "FASTAPI_INTERNAL_ERROR"
    DISCORD_ALERT_SEND_FAILED = "DISCORD_ALERT_SEND_FAILED"


ERROR_STATUS_BY_CODE: dict[ScrapingErrorCode, int] = {
    ScrapingErrorCode.SCRAPING_PIPELINE_NOT_FOUND: status.HTTP_404_NOT_FOUND,
    ScrapingErrorCode.SCRAPING_SOURCE_NOT_FOUND: status.HTTP_404_NOT_FOUND,
    ScrapingErrorCode.SCRAPING_ALREADY_RUNNING: status.HTTP_409_CONFLICT,
    ScrapingErrorCode.SCRAPING_EXECUTION_FAILED: status.HTTP_500_INTERNAL_SERVER_ERROR,
    ScrapingErrorCode.SCRAPING_TEST_FAILED: status.HTTP_500_INTERNAL_SERVER_ERROR,
    ScrapingErrorCode.FASTAPI_INTERNAL_ERROR: status.HTTP_500_INTERNAL_SERVER_ERROR,
    ScrapingErrorCode.DISCORD_ALERT_SEND_FAILED: status.HTTP_500_INTERNAL_SERVER_ERROR,
}


DEFAULT_MESSAGE_BY_CODE: dict[ScrapingErrorCode, str] = {
    ScrapingErrorCode.SCRAPING_PIPELINE_NOT_FOUND: "Scraping pipeline was not found.",
    ScrapingErrorCode.SCRAPING_SOURCE_NOT_FOUND: "Scraping source was not found.",
    ScrapingErrorCode.SCRAPING_ALREADY_RUNNING: "Scraping pipeline is already running.",
    ScrapingErrorCode.SCRAPING_EXECUTION_FAILED: "Scraping execution failed.",
    ScrapingErrorCode.SCRAPING_TEST_FAILED: "Scraping test execution failed.",
    ScrapingErrorCode.FASTAPI_INTERNAL_ERROR: "FastAPI internal error occurred.",
    ScrapingErrorCode.DISCORD_ALERT_SEND_FAILED: "Discord alert send failed.",
}


class ScrapingException(Exception):
    def __init__(
        self,
        error_code: ScrapingErrorCode,
        message: str | None = None,
        detail: dict[str, Any] | None = None,
    ) -> None:
        self.error_code = error_code
        self.message = message or DEFAULT_MESSAGE_BY_CODE[error_code]
        self.detail = detail or {}
        self.status_code = ERROR_STATUS_BY_CODE[error_code]
        super().__init__(self.message)


def build_error_response(error: ScrapingException) -> dict[str, Any]:
    return {
        "success": False,
        "errorCode": error.error_code.value,
        "message": error.message,
        "detail": error.detail,
    }
