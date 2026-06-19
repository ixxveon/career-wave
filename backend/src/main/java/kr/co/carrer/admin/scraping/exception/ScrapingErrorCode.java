package kr.co.carrer.admin.scraping.exception;

import kr.co.carrer.global.exception.BaseErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ScrapingErrorCode implements BaseErrorCode {

    SCRAPING_PIPELINE_NOT_FOUND(HttpStatus.NOT_FOUND, "스크래핑 파이프라인을 찾을 수 없습니다."),
    SCRAPING_SOURCE_NOT_FOUND(HttpStatus.NOT_FOUND, "지원하지 않는 스크래핑 소스입니다."),
    SCRAPING_ALREADY_RUNNING(HttpStatus.CONFLICT, "이미 실행 중인 스크래핑 파이프라인입니다."),
    SCRAPING_EXECUTION_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "스크래핑 실행 처리에 실패했습니다."),
    SCRAPING_TEST_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "스크래핑 테스트 실행 처리에 실패했습니다.");

    private final HttpStatus status;
    private final String message;
}
