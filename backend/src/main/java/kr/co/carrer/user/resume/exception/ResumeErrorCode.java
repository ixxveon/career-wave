package kr.co.carrer.user.resume.exception;

import kr.co.carrer.global.exception.BaseErrorCode;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ResumeErrorCode implements BaseErrorCode {

    INVALID_FILE_SIZE(HttpStatus.BAD_REQUEST, "파일 크기는 10MB를 초과할 수 없습니다."),
    INVALID_FILE_TYPE(HttpStatus.BAD_REQUEST, "PDF, DOC, DOCX 형식의 파일만 업로드할 수 있습니다."),
    INVALID_CONTENT_COUNT(HttpStatus.BAD_REQUEST, "자기소개서 문항은 1개 이상 5개 이하로 입력해주세요."),
    INVALID_CONTENT_LENGTH(HttpStatus.BAD_REQUEST, "자기소개서 답변은 1000자를 초과할 수 없습니다."),
    DUPLICATE_CONTENT_ORDER(HttpStatus.BAD_REQUEST, "문항 순서에 중복된 번호가 있습니다."),
    DOCUMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 문서입니다."),
    DOCUMENT_ACCESS_DENIED(HttpStatus.FORBIDDEN, "해당 문서에 대한 접근 권한이 없습니다."),
    FEEDBACK_PARSE_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "피드백 데이터 처리 중 오류가 발생했습니다."),
    WEBHOOK_SECRET_INVALID(HttpStatus.FORBIDDEN, "유효하지 않은 Webhook 인증 키입니다.");

    private final HttpStatus status;
    private final String message;

    ResumeErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }
}
