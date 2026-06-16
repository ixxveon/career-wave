package kr.co.carrer.user.interview.exception;

import kr.co.carrer.global.exception.BaseErrorCode;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum InterviewErrorCode implements BaseErrorCode {

    INTERVIEW_SESSION_NOT_FOUND(HttpStatus.NOT_FOUND, "면접 세션을 찾을 수 없습니다."),
    INTERVIEW_SESSION_FORBIDDEN(HttpStatus.FORBIDDEN, "본인 소유의 면접 세션만 접근할 수 있습니다."),
    INTERVIEW_SESSION_ALREADY_ENDED(HttpStatus.BAD_REQUEST, "이미 종료된 면접 세션입니다."),
    INTERVIEW_INVALID_SESSION_TYPE(HttpStatus.BAD_REQUEST, "유효하지 않은 면접 세션 타입입니다."),
    INTERVIEW_DOCUMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "해당 서류를 찾을 수 없습니다."),
    INTERVIEW_SESSION_DUPLICATE(HttpStatus.CONFLICT, "이미 진행 중인 면접 세션이 있습니다."),
    INTERVIEW_REPORT_NOT_READY(HttpStatus.CONFLICT, "면접 리포트가 아직 생성 중입니다."),
    INTERVIEW_INVALID_AUDIO_FORMAT(HttpStatus.BAD_REQUEST, "지원하지 않는 오디오 포맷이거나 빈 파일입니다. (audio/webm, audio/mp4, audio/ogg만 허용)");

    private final HttpStatus status;
    private final String message;

    InterviewErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }
}
