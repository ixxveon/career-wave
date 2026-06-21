package kr.co.carrer.admin.scraping.infrastructure.fastapi;

import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.carrer.admin.scraping.exception.ScrapingErrorCode;
import kr.co.carrer.global.exception.CustomException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class ScrapingFastApiErrorMapperTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @DisplayName("FastAPI SCRAPING_SOURCE_NOT_FOUND 오류를 Spring 도메인 ErrorCode로 변환한다")
    void mapsScrapingSourceNotFound() {
        CustomException exception = ScrapingFastApiErrorMapper.toCustomException(
                responseException("SCRAPING_SOURCE_NOT_FOUND"),
                objectMapper
        );

        assertThat(exception.getErrorCode()).isEqualTo(ScrapingErrorCode.SCRAPING_SOURCE_NOT_FOUND);
    }

    @Test
    @DisplayName("FastAPI FASTAPI_INTERNAL_ERROR 오류를 SCRAPING_EXECUTION_FAILED로 변환한다")
    void mapsFastApiInternalErrorToExecutionFailed() {
        CustomException exception = ScrapingFastApiErrorMapper.toCustomException(
                responseException("FASTAPI_INTERNAL_ERROR"),
                objectMapper
        );

        assertThat(exception.getErrorCode()).isEqualTo(ScrapingErrorCode.SCRAPING_EXECUTION_FAILED);
    }

    @Test
    @DisplayName("FastAPI SCRAPING_TEST_FAILED 오류를 Spring 도메인 ErrorCode로 변환한다")
    void mapsScrapingTestFailed() {
        CustomException exception = ScrapingFastApiErrorMapper.toCustomException(
                responseException("SCRAPING_TEST_FAILED"),
                objectMapper
        );

        assertThat(exception.getErrorCode()).isEqualTo(ScrapingErrorCode.SCRAPING_TEST_FAILED);
    }

    @Test
    @DisplayName("알 수 없는 FastAPI 오류는 SCRAPING_EXECUTION_FAILED로 변환한다")
    void mapsUnknownErrorToExecutionFailed() {
        CustomException exception = ScrapingFastApiErrorMapper.toCustomException(
                responseException("UNKNOWN_FASTAPI_ERROR"),
                objectMapper
        );

        assertThat(exception.getErrorCode()).isEqualTo(ScrapingErrorCode.SCRAPING_EXECUTION_FAILED);
    }

    @Test
    @DisplayName("오류 코드 값의 공백과 대소문자를 정규화해 변환한다")
    void normalizesErrorCodeBeforeMapping() {
        CustomException exception = ScrapingFastApiErrorMapper.toCustomException(
                responseException("  scraping_already_running  "),
                objectMapper
        );

        assertThat(exception.getErrorCode()).isEqualTo(ScrapingErrorCode.SCRAPING_ALREADY_RUNNING);
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
