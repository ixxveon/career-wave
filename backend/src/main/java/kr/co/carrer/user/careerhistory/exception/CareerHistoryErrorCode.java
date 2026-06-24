package kr.co.carrer.user.careerhistory.exception;

import kr.co.carrer.global.exception.BaseErrorCode;
import org.springframework.http.HttpStatus;

public enum CareerHistoryErrorCode implements BaseErrorCode {

    CAREER_HISTORY_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 취업 준비 기록입니다."),
    CAREER_HISTORY_ACCESS_DENIED(HttpStatus.FORBIDDEN, "해당 취업 준비 기록에 접근할 수 없습니다."),
    CAREER_COMPETENCY_REPORT_NOT_FOUND(HttpStatus.NOT_FOUND, "역량 평가 데이터가 존재하지 않습니다.");

    private final HttpStatus status;
    private final String message;

    CareerHistoryErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }

    @Override
    public HttpStatus getStatus() {
        return status;
    }

    @Override
    public String getMessage() {
        return message;
    }
}
