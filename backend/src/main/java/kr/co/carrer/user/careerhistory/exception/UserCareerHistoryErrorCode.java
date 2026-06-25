package kr.co.carrer.user.careerhistory.exception;

import kr.co.carrer.global.exception.BaseErrorCode;
import org.springframework.http.HttpStatus;

public enum UserCareerHistoryErrorCode implements BaseErrorCode {

    USER_CAREER_HISTORY_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 취업 준비 기록입니다.");

    private final HttpStatus status;
    private final String message;

    UserCareerHistoryErrorCode(HttpStatus status, String message) {
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