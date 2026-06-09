package kr.co.carrer.global.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {

    // --- 0. 전역 공통 에러코드 ---
    BAD_REQUEST(HttpStatus.BAD_REQUEST, "잘못된 요청입니다."),
    NOT_FOUND(HttpStatus.NOT_FOUND, "데이터를 찾을 수 없습니다."),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 오류가 발생했습니다."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "인증이 필요합니다."),
    FORBIDDEN(HttpStatus.FORBIDDEN, "접근 권한이 없습니다."),
    DUPLICATE_RESOURCE(HttpStatus.CONFLICT, "이미 존재하는 데이터입니다."),

    // --- 1. 인증 (auth) ---
    AUTH_INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 올바르지 않습니다."),
    AUTH_ACCOUNT_SUSPENDED(HttpStatus.FORBIDDEN, "계정이 일시 정지되었습니다."),
    AUTH_ACCOUNT_BANNED(HttpStatus.FORBIDDEN, "계정이 영구 정지되었습니다."),
    AUTH_ACCOUNT_WITHDRAWN(HttpStatus.FORBIDDEN, "탈퇴한 계정입니다."),
    AUTH_ACCOUNT_LOCKED(HttpStatus.LOCKED, "로그인 시도 횟수를 초과하여 계정이 잠겼습니다."),
    AUTH_COMPANY_PENDING_REVIEW(HttpStatus.FORBIDDEN, "기업회원 승인 검토 중입니다."),
    AUTH_COMPANY_REJECTED(HttpStatus.FORBIDDEN, "기업회원 가입이 반려되었습니다."),
    AUTH_COMPANY_NEEDS_REVISION(HttpStatus.FORBIDDEN, "기업 정보 보완이 필요합니다."),
    AUTH_REFRESH_INVALID(HttpStatus.UNAUTHORIZED, "유효하지 않은 리프레시 토큰입니다."),
    AUTH_UNAUTHENTICATED(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다."),

    // --- 2. 회원관리 (admin/member) ---
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

    ErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }
}
