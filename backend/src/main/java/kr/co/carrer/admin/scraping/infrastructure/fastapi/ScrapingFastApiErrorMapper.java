package kr.co.carrer.admin.scraping.infrastructure.fastapi;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.carrer.admin.scraping.exception.ScrapingErrorCode;
import kr.co.carrer.global.exception.CustomException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.Locale;

@Slf4j
final class ScrapingFastApiErrorMapper {

    private ScrapingFastApiErrorMapper() {
    }

    static CustomException toCustomException(WebClientResponseException exception, ObjectMapper objectMapper) {
        ScrapingFastApiResponse.Error error = parseError(exception, objectMapper);
        if (error == null || error.errorCode() == null || error.errorCode().isBlank()) {
            return new CustomException(ScrapingErrorCode.SCRAPING_EXECUTION_FAILED);
        }
        return new CustomException(toErrorCode(error.errorCode()));
    }

    private static ScrapingFastApiResponse.Error parseError(WebClientResponseException exception, ObjectMapper objectMapper) {
        String body = exception.getResponseBodyAsString();
        if (body == null || body.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(body, ScrapingFastApiResponse.Error.class);
        } catch (JsonProcessingException jsonProcessingException) {
            log.warn("[ScrapingFastApiErrorMapper] FastAPI error body parsing failed: status={}, bodyLength={}",
                    exception.getStatusCode(), body.length());
            return null;
        }
    }

    private static ScrapingErrorCode toErrorCode(String errorCode) {
        String normalized = errorCode == null ? "" : errorCode.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "SCRAPING_PIPELINE_NOT_FOUND" -> ScrapingErrorCode.SCRAPING_PIPELINE_NOT_FOUND;
            case "SCRAPING_SOURCE_NOT_FOUND" -> ScrapingErrorCode.SCRAPING_SOURCE_NOT_FOUND;
            case "SCRAPING_ALREADY_RUNNING" -> ScrapingErrorCode.SCRAPING_ALREADY_RUNNING;
            case "SCRAPING_EXECUTION_FAILED" -> ScrapingErrorCode.SCRAPING_EXECUTION_FAILED;
            case "SCRAPING_TEST_FAILED" -> ScrapingErrorCode.SCRAPING_TEST_FAILED;
            case "FASTAPI_INTERNAL_ERROR", "DISCORD_ALERT_SEND_FAILED" -> ScrapingErrorCode.SCRAPING_EXECUTION_FAILED;
            default -> ScrapingErrorCode.SCRAPING_EXECUTION_FAILED;
        };
    }
}
