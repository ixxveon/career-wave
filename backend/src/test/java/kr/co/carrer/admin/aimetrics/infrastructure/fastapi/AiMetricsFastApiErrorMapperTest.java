package kr.co.carrer.admin.aimetrics.infrastructure.fastapi;

import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.carrer.admin.aimetrics.exception.AiMetricsErrorCode;
import kr.co.carrer.global.exception.CustomException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class AiMetricsFastApiErrorMapperTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @DisplayName("FastAPI AI_USAGE_LOG_CREATE_FAILED 오류를 Spring 도메인 ErrorCode로 변환한다")
    void mapsAiUsageLogCreateFailed() {
        CustomException exception = AiMetricsFastApiErrorMapper.toCustomException(
                responseException("AI_USAGE_LOG_CREATE_FAILED"),
                objectMapper
        );

        assertThat(exception.getErrorCode()).isEqualTo(AiMetricsErrorCode.AI_USAGE_LOG_CREATE_FAILED);
    }

    @Test
    @DisplayName("알 수 없는 FastAPI 오류는 AI_MODEL_EXECUTION_FAILED로 변환한다")
    void mapsUnknownErrorToAiModelExecutionFailed() {
        CustomException exception = AiMetricsFastApiErrorMapper.toCustomException(
                responseException("UNKNOWN_FASTAPI_ERROR"),
                objectMapper
        );

        assertThat(exception.getErrorCode()).isEqualTo(AiMetricsErrorCode.AI_MODEL_EXECUTION_FAILED);
    }

    @Test
    @DisplayName("FastAPI RAG_DOCUMENT_INDEXING_FAILED 오류를 Spring 도메인 ErrorCode로 변환한다")
    void mapsRagDocumentIndexingFailed() {
        CustomException exception = AiMetricsFastApiErrorMapper.toCustomException(
                responseException("RAG_DOCUMENT_INDEXING_FAILED"),
                objectMapper
        );

        assertThat(exception.getErrorCode()).isEqualTo(AiMetricsErrorCode.RAG_DOCUMENT_INDEXING_FAILED);
    }

    private WebClientResponseException responseException(String errorCode) {
        String body = """
                {
                  "success": false,
                  "errorCode": "%s",
                  "message": "fastapi error",
                  "detail": {}
                }
                """.formatted(errorCode);
        return WebClientResponseException.create(
                500,
                "Internal Server Error",
                HttpHeaders.EMPTY,
                body.getBytes(StandardCharsets.UTF_8),
                StandardCharsets.UTF_8
        );
    }
}
