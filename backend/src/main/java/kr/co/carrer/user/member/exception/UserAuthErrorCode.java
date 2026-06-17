package kr.co.carrer.user.member.exception;

import kr.co.carrer.global.exception.BaseErrorCode;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum UserAuthErrorCode implements BaseErrorCode {

    // 사용자 전용 계정 상태 에러
    AUTH_ACCOUNT_SUSPENDED(HttpStatus.FORBIDDEN, "계정이 일시 정지되었습니다."),
    AUTH_ACCOUNT_BANNED(HttpStatus.FORBIDDEN, "계정이 영구 정지되었습니다."),
    AUTH_ACCOUNT_BLACKLISTED(HttpStatus.FORBIDDEN, "블랙리스트 계정입니다."),
    AUTH_ACCOUNT_WITHDRAWN(HttpStatus.FORBIDDEN, "탈퇴한 계정입니다."),

    // 기업 회원 전용 승인 상태 에러
    AUTH_COMPANY_PENDING_REVIEW(HttpStatus.FORBIDDEN, "기업회원 승인 검토 중입니다."),
    AUTH_COMPANY_REJECTED(HttpStatus.FORBIDDEN, "기업회원 가입이 반려되었습니다."),
    AUTH_COMPANY_NEEDS_REVISION(HttpStatus.FORBIDDEN, "기업 정보 보완이 필요합니다.");

    private final HttpStatus status;
    private final String message;

    UserAuthErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }
}
