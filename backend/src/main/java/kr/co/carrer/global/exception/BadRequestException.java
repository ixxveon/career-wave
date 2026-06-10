package kr.co.carrer.global.exception;

public class BadRequestException extends CustomException {

    public BadRequestException(ErrorCode errorCode) {
        super(errorCode);
    }

    public BadRequestException(ErrorCode errorCode, String dynamicMessage) {
        super(errorCode, dynamicMessage);
    }
}
