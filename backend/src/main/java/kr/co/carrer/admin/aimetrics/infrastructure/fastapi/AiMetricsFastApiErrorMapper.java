package kr.co.carrer.admin.aimetrics.infrastructure.fastapi;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.carrer.admin.aimetrics.exception.AiMetricsErrorCode;
import kr.co.carrer.global.exception.CustomException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.reactive.function.client.WebClientResponseException;

@Slf4j
final class AiMetricsFastApiErrorMapper {

    private AiMetricsFastApiErrorMapper() {
    }

    static CustomException toCustomException(WebClientResponseException exception, ObjectMapper objectMapper) {
        AiMetricsFastApiResponse.Error error = parseError(exception, objectMapper);
        if (error == null || error.errorCode() == null || error.errorCode().isBlank()) {
            return new CustomException(AiMetricsErrorCode.AI_MODEL_EXECUTION_FAILED);
        }
        return new CustomException(toErrorCode(error.errorCode()));
    }

    private static AiMetricsFastApiResponse.Error parseError(WebClientResponseException exception, ObjectMapper objectMapper) {
        String body = exception.getResponseBodyAsString();
        if (body == null || body.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(body, AiMetricsFastApiResponse.Error.class);
        } catch (JsonProcessingException e) {
            log.warn("[AiMetricsFastApiErrorMapper] FastAPI error body parsing failed: status={}, bodyLength={}",
                    exception.getStatusCode(), body.length());
            return null;
        }
    }

    private static AiMetricsErrorCode toErrorCode(String errorCode) {
        return switch (errorCode) {
            case "AI_MODEL_NOT_FOUND" -> AiMetricsErrorCode.AI_MODEL_NOT_FOUND;
            case "AI_OPS_SETTING_NOT_FOUND" -> AiMetricsErrorCode.AI_OPS_SETTING_NOT_FOUND;
            case "AI_USAGE_LOG_CREATE_FAILED" -> AiMetricsErrorCode.AI_USAGE_LOG_CREATE_FAILED;
            case "INVALID_ALERT_THRESHOLD" -> AiMetricsErrorCode.INVALID_ALERT_THRESHOLD;
            case "INVALID_MONTHLY_BUDGET" -> AiMetricsErrorCode.INVALID_MONTHLY_BUDGET;
            case "RAG_DOCUMENT_NOT_FOUND" -> AiMetricsErrorCode.RAG_DOCUMENT_NOT_FOUND;
            case "RAG_DOCUMENT_ALREADY_INDEXING" -> AiMetricsErrorCode.RAG_DOCUMENT_ALREADY_INDEXING;
            case "RAG_DOCUMENT_INDEXING_FAILED" -> AiMetricsErrorCode.RAG_DOCUMENT_INDEXING_FAILED;
            case "RAG_DOCUMENT_DELETE_FAILED" -> AiMetricsErrorCode.RAG_DOCUMENT_DELETE_FAILED;
            default -> AiMetricsErrorCode.AI_MODEL_EXECUTION_FAILED;
        };
    }
}
