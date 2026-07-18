package kr.co.carrer.admin.report.exception;

import kr.co.carrer.global.exception.BaseErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum AdminReportErrorCode implements BaseErrorCode {

    REPORT_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 신고입니다."),
    ALREADY_PROCESSED(HttpStatus.CONFLICT, "이미 처리된 신고입니다."),
    INVALID_REPORT_FILTER(HttpStatus.BAD_REQUEST, "지원하지 않는 필터 값입니다."),
    COMMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 댓글입니다."),
    INVALID_TARGET_TYPE(HttpStatus.BAD_REQUEST, "게시글 또는 댓글 신고만 삭제할 수 있습니다.");

    private final HttpStatus status;
    private final String message;
}
