package kr.co.carrer.user.jobnotice.exception;

import kr.co.carrer.global.exception.BaseErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum JobNoticeErrorCode implements BaseErrorCode {

    JOB_NOTICE_NOT_FOUND(HttpStatus.NOT_FOUND, "채용 공고를 찾을 수 없습니다."),
    BOOKMARK_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 북마크한 채용 공고입니다."),
    BOOKMARK_NOT_FOUND(HttpStatus.NOT_FOUND, "북마크 정보를 찾을 수 없습니다.");

    private final HttpStatus status;
    private final String message;
}
