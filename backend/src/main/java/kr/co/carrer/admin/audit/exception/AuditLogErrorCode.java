package kr.co.carrer.admin.audit.exception;

import kr.co.carrer.global.exception.BaseErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum AuditLogErrorCode implements BaseErrorCode {

    AUDIT_LOG_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 감사 로그입니다."),
    INVALID_AUDIT_LOG_TYPE(HttpStatus.BAD_REQUEST, "유효하지 않은 감사 로그 유형입니다."),
    INVALID_AUDIT_LOG_SEVERITY(HttpStatus.BAD_REQUEST, "유효하지 않은 감사 로그 심각도입니다.");

    private final HttpStatus status;
    private final String message;
}
