package kr.co.carrer.admin.admin.exception;

import kr.co.carrer.global.exception.BaseErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum AdminManagementErrorCode implements BaseErrorCode {

    ADMIN_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 관리자 계정입니다."),
    ADMIN_EMAIL_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 사용 중인 관리자 이메일입니다."),
    INVALID_ADMIN_ROLE(HttpStatus.BAD_REQUEST, "유효하지 않은 관리자 권한입니다."),
    INVALID_ADMIN_STATUS(HttpStatus.BAD_REQUEST, "유효하지 않은 관리자 상태입니다."),
    ADMIN_ALREADY_LOCKED(HttpStatus.CONFLICT, "이미 잠금 상태인 관리자 계정입니다."),
    ADMIN_ALREADY_ACTIVE(HttpStatus.CONFLICT, "이미 활성 상태인 관리자 계정입니다."),
    IP_ACL_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 IP ACL 정보입니다."),
    IP_ACL_DUPLICATED_RANGE(HttpStatus.CONFLICT, "이미 등록된 IP 범위입니다."),
    IP_ACL_ALREADY_ENABLED(HttpStatus.CONFLICT, "이미 활성 상태인 IP ACL입니다."),
    IP_ACL_ALREADY_DISABLED(HttpStatus.CONFLICT, "이미 비활성 상태인 IP ACL입니다.");

    private final HttpStatus status;
    private final String message;
}
