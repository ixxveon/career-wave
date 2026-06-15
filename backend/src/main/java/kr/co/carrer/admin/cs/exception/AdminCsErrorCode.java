package kr.co.carrer.admin.cs.exception;

import kr.co.carrer.global.exception.BaseErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum AdminCsErrorCode implements BaseErrorCode {

    NOTICE_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 공지사항입니다."),
    FAQ_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 FAQ입니다."),
    INQUIRY_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 문의입니다."),
    INQUIRY_ALREADY_COMPLETED(HttpStatus.CONFLICT, "이미 완료된 문의입니다."),
    INQUIRY_NOT_IN_PROGRESS(HttpStatus.BAD_REQUEST, "처리 중인 문의만 완료 처리할 수 있습니다."),
    INQUIRY_CONFLICT(HttpStatus.CONFLICT, "다른 관리자가 동시에 수정 중입니다. 다시 시도해주세요."),
    AI_SERVER_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "AI 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.");

    private final HttpStatus status;
    private final String message;
}
