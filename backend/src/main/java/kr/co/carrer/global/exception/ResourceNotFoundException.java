package kr.co.carrer.global.exception;

public class ResourceNotFoundException extends CustomException {

    public ResourceNotFoundException(ErrorCode errorCode) {
        super(errorCode);
    }

    public ResourceNotFoundException(ErrorCode errorCode, String dynamicMessage) {
        super(errorCode, dynamicMessage);
    }
}
