package kr.co.carrer.user.support.exception;

import kr.co.carrer.global.exception.BaseErrorCode;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum UserSupportErrorCode implements BaseErrorCode {

    NOTICE_NOT_FOUND(HttpStatus.NOT_FOUND, "공지사항을 찾을 수 없습니다."),
    INVALID_INQUIRY_CONTENT(HttpStatus.BAD_REQUEST, "문의 내용은 10자 이상 입력해주세요.");

    private final HttpStatus status;
    private final String message;

    UserSupportErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }
}
