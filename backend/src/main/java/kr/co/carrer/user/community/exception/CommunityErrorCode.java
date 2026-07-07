package kr.co.carrer.user.community.exception;

import kr.co.carrer.global.exception.BaseErrorCode;
import org.springframework.http.HttpStatus;

public enum CommunityErrorCode implements BaseErrorCode {

    BOARD_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 게시글입니다."),
    COMMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 댓글입니다."),
    COMMUNITY_ACCESS_DENIED(HttpStatus.FORBIDDEN, "해당 커뮤니티 리소스에 접근할 수 없습니다."),
    DUPLICATE_REPORT(HttpStatus.CONFLICT, "이미 신고한 대상입니다."),
    INVALID_REPORT_TARGET(HttpStatus.BAD_REQUEST, "유효하지 않은 신고 대상입니다.");

    private final HttpStatus status;
    private final String message;

    CommunityErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }

    @Override
    public HttpStatus getStatus() {
        return status;
    }

    @Override
    public String getMessage() {
        return message;
    }
}