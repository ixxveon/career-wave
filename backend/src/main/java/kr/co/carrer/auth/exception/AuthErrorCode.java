package kr.co.carrer.auth.exception;

import kr.co.carrer.global.exception.BaseErrorCode;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum AuthErrorCode implements BaseErrorCode {

    // user + admin 공통 인증 에러
    AUTH_INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 올바르지 않습니다."),
    AUTH_ACCOUNT_LOCKED(HttpStatus.LOCKED, "로그인 시도 횟수를 초과하여 계정이 잠겼습니다."),
    AUTH_REFRESH_INVALID(HttpStatus.UNAUTHORIZED, "유효하지 않은 리프레시 토큰입니다."),
    AUTH_UNAUTHENTICATED(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다."),
    AUTH_FORBIDDEN(HttpStatus.FORBIDDEN, "접근 권한이 없습니다."),
    AUTH_SESSION_EXPIRED(HttpStatus.UNAUTHORIZED, "세션이 만료되었습니다. 다시 로그인하세요."),
    AUTH_REFRESH_REUSE_DETECTED(HttpStatus.UNAUTHORIZED, "이미 폐기된 토큰이 재사용되어 전체 세션을 폐기했습니다. 다시 로그인하세요.");

    private final HttpStatus status;
    private final String message;

    AuthErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }
}
