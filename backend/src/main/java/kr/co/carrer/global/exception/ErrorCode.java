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

    // --- 1. 회원관리 (admin/member) ---
    MEMBER_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 회원입니다."),
    HR_MANAGER_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 기업 회원입니다."),
    ALREADY_BANNED(HttpStatus.CONFLICT, "이미 영구 정지된 회원입니다."),
    ALREADY_PROCESSED(HttpStatus.CONFLICT, "이미 처리된 신청입니다."),
    INVALID_MEMBER_FILTER(HttpStatus.BAD_REQUEST, "지원하지 않는 필터 값입니다."),
    INVALID_SANCTION_DURATION(HttpStatus.BAD_REQUEST, "SUSPEND 제재 시 유효하지 않은 기간입니다."),
    REASON_REQUIRED(HttpStatus.BAD_REQUEST, "사유는 필수입니다."),
    REASON_TOO_SHORT(HttpStatus.BAD_REQUEST, "사유는 최소 10자 이상 입력해주세요."),
    ALREADY_SUSPENDED(HttpStatus.CONFLICT, "이미 정지된 회원입니다."),
    MAX_WARNING_EXCEEDED(HttpStatus.CONFLICT, "경고는 최대 3회까지만 부여할 수 있습니다."),

    // --- 2. 서류 분석 (user/resume) ---
    INVALID_FILE_SIZE(HttpStatus.BAD_REQUEST, "파일 크기는 10MB를 초과할 수 없습니다."),
    INVALID_FILE_TYPE(HttpStatus.BAD_REQUEST, "PDF, DOC, DOCX 형식의 파일만 업로드할 수 있습니다."),
    INVALID_CONTENT_COUNT(HttpStatus.BAD_REQUEST, "자기소개서 문항은 1개 이상 5개 이하로 입력해주세요."),
    INVALID_CONTENT_LENGTH(HttpStatus.BAD_REQUEST, "자기소개서 답변은 1000자를 초과할 수 없습니다."),
    DOCUMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 문서입니다."),
    DOCUMENT_ACCESS_DENIED(HttpStatus.FORBIDDEN, "해당 문서에 대한 접근 권한이 없습니다."),
    FEEDBACK_PARSE_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "피드백 데이터 처리 중 오류가 발생했습니다.");

    private final HttpStatus status;
    private final String message;

    ErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }
}
