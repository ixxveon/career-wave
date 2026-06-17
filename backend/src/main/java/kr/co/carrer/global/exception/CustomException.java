package kr.co.carrer.global.exception;

import lombok.Getter;

@Getter
public class CustomException extends RuntimeException {

    private final BaseErrorCode errorCode;
    private final Object additionalData;

    public CustomException(BaseErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
        this.additionalData = null;
    }

    public CustomException(BaseErrorCode errorCode, String dynamicMessage) {
        super(dynamicMessage);
        this.errorCode = errorCode;
        this.additionalData = null;
    }

    public CustomException(BaseErrorCode errorCode, Object additionalData) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
        this.additionalData = additionalData;
    }
}
