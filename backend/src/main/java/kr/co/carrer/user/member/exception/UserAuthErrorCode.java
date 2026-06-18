package kr.co.carrer.user.member.exception;

import kr.co.carrer.global.exception.BaseErrorCode;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum UserAuthErrorCode implements BaseErrorCode {

    // 로그인
    AUTH_INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "아이디, 비밀번호 또는 회원 유형을 확인해 주세요."),
    AUTH_ACCOUNT_LOCKED(HttpStatus.LOCKED, "로그인 시도 횟수 초과로 계정이 잠겼습니다."),

    // 계정 상태
    AUTH_ACCOUNT_SUSPENDED(HttpStatus.FORBIDDEN, "계정이 일시 정지되었습니다."),
    AUTH_ACCOUNT_BANNED(HttpStatus.FORBIDDEN, "계정이 영구 정지되었습니다."),
    AUTH_ACCOUNT_BLACKLISTED(HttpStatus.FORBIDDEN, "블랙리스트 계정입니다."),
    AUTH_ACCOUNT_WITHDRAWN(HttpStatus.FORBIDDEN, "탈퇴한 계정입니다."),

    // 기업회원 승인 상태
    AUTH_COMPANY_PENDING_REVIEW(HttpStatus.FORBIDDEN, "기업회원 승인 검토 중입니다."),
    AUTH_COMPANY_REJECTED(HttpStatus.FORBIDDEN, "기업회원 가입이 반려되었습니다."),
    AUTH_COMPANY_NEEDS_REVISION(HttpStatus.FORBIDDEN, "기업 정보 보완이 필요합니다."),

    // 회원가입 — loginId / 중복
    LOGIN_ID_INVALID(HttpStatus.BAD_REQUEST, "아이디 형식이 올바르지 않습니다. 영문/숫자 6~20자로 입력해 주세요."),
    LOGIN_ID_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 사용 중인 아이디입니다."),
    EMAIL_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다."),
    PHONE_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 사용 중인 휴대폰 번호입니다."),
    BUSINESS_NUMBER_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 등록된 사업자등록번호입니다."),

    // 회원가입 — 약관 / 비밀번호
    REGISTER_TERMS_REQUIRED(HttpStatus.BAD_REQUEST, "필수 약관에 동의해 주세요."),
    PASSWORD_POLICY_VIOLATION(HttpStatus.BAD_REQUEST, "비밀번호는 8~64자이며 영문, 숫자, 특수문자를 포함해야 합니다."),

    // 기업회원 — 사업자 검증
    COMPANY_TYPE_INVALID(HttpStatus.BAD_REQUEST, "유효하지 않은 기업 형태입니다."),
    COMPANY_BUSINESS_VERIFICATION_FAILED(HttpStatus.BAD_REQUEST, "사업자등록정보 확인에 실패했습니다. 사업자등록번호를 다시 확인해 주세요."),
    COMPANY_BUSINESS_VERIFICATION_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "사업자 검증 서비스를 일시적으로 이용할 수 없습니다. 잠시 후 다시 시도해 주세요."),

    // 재직증명서 업로드
    EMPLOYMENT_FILE_INVALID(HttpStatus.BAD_REQUEST, "재직증명서는 PDF 파일만 업로드할 수 있습니다."),
    EMPLOYMENT_FILE_TOO_LARGE(HttpStatus.PAYLOAD_TOO_LARGE, "파일 크기는 5MB를 초과할 수 없습니다."),
    EMPLOYMENT_FILE_UNSUPPORTED(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "지원하지 않는 파일 형식입니다."),

    // 인증번호
    VERIFICATION_TARGET_INVALID(HttpStatus.BAD_REQUEST, "인증 대상 형식이 올바르지 않습니다."),
    INVALID_VERIFICATION_CODE(HttpStatus.BAD_REQUEST, "인증번호가 일치하지 않습니다."),
    VERIFICATION_EXPIRED(HttpStatus.BAD_REQUEST, "인증번호가 만료되었습니다. 다시 발송해 주세요."),
    VERIFICATION_RATE_LIMITED(HttpStatus.TOO_MANY_REQUESTS, "인증 요청 횟수를 초과했습니다. 잠시 후 다시 시도해 주세요."),
    VERIFICATION_TOKEN_INVALID(HttpStatus.BAD_REQUEST, "인증 토큰이 유효하지 않습니다. 인증을 다시 진행해 주세요."),

    // 비밀번호 재설정
    PASSWORD_RESET_TOKEN_INVALID(HttpStatus.BAD_REQUEST, "비밀번호 재설정 권한이 유효하지 않습니다."),
    PASSWORD_RESET_TOKEN_EXPIRED(HttpStatus.BAD_REQUEST, "비밀번호 재설정 권한이 만료되었습니다. 다시 인증해 주세요."),

    // 소셜 OAuth
    OAUTH_PROVIDER_INVALID(HttpStatus.BAD_REQUEST, "지원하지 않는 소셜 로그인 provider입니다."),
    OAUTH_STATE_INVALID(HttpStatus.BAD_REQUEST, "소셜 인증 요청이 유효하지 않습니다. 다시 시도해 주세요."),
    OAUTH_PROVIDER_AUTH_FAILED(HttpStatus.UNAUTHORIZED, "소셜 provider 인증에 실패했습니다."),
    SOCIAL_SIGNUP_TOKEN_INVALID(HttpStatus.BAD_REQUEST, "소셜 가입 토큰이 유효하지 않습니다. 소셜 로그인을 다시 시도해 주세요."),
    SOCIAL_EMAIL_ALREADY_EXISTS(HttpStatus.CONFLICT, "해당 이메일로 가입된 계정이 이미 존재합니다."),
    SOCIAL_ACCOUNT_ALREADY_LINKED(HttpStatus.CONFLICT, "이미 연결된 소셜 계정입니다.");

    private final HttpStatus status;
    private final String message;

    UserAuthErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }
}
