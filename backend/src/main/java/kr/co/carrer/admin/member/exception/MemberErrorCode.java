package kr.co.carrer.admin.member.exception;

import kr.co.carrer.global.exception.BaseErrorCode;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum MemberErrorCode implements BaseErrorCode {

    MEMBER_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 회원입니다."),
    HR_MANAGER_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 기업 회원입니다."),
    ALREADY_BANNED(HttpStatus.CONFLICT, "이미 영구 정지된 회원입니다."),
    ALREADY_PROCESSED(HttpStatus.CONFLICT, "이미 처리된 신청입니다."),
    INVALID_MEMBER_FILTER(HttpStatus.BAD_REQUEST, "지원하지 않는 필터 값입니다."),
    INVALID_SANCTION_DURATION(HttpStatus.BAD_REQUEST, "SUSPEND 제재 시 유효하지 않은 기간입니다."),
    REASON_REQUIRED(HttpStatus.BAD_REQUEST, "사유는 필수입니다."),
    REASON_TOO_SHORT(HttpStatus.BAD_REQUEST, "사유는 최소 10자 이상 입력해주세요."),
    ALREADY_SUSPENDED(HttpStatus.CONFLICT, "이미 정지된 회원입니다."),
    MAX_WARNING_EXCEEDED(HttpStatus.CONFLICT, "경고는 최대 3회까지만 부여할 수 있습니다.");

    private final HttpStatus status;
    private final String message;

    MemberErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }
}
