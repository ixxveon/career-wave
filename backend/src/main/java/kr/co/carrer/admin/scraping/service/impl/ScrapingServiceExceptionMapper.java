package kr.co.carrer.admin.scraping.service.impl;

import kr.co.carrer.admin.scraping.exception.ScrapingErrorCode;
import kr.co.carrer.admin.scraping.type.ScrapingActionType;
import kr.co.carrer.global.exception.BaseErrorCode;
import kr.co.carrer.global.exception.CustomException;

final class ScrapingServiceExceptionMapper {

    private ScrapingServiceExceptionMapper() {
    }

    static RuntimeException toReadException(RuntimeException exception) {
        if (exception instanceof CustomException customException) {
            BaseErrorCode errorCode = customException.getErrorCode();
            if (errorCode instanceof ScrapingErrorCode) {
                return customException;
            }
        }
        return new CustomException(ScrapingErrorCode.SCRAPING_EXECUTION_FAILED);
    }

    static RuntimeException toActionException(ScrapingActionType actionType, RuntimeException exception) {
        if (exception instanceof CustomException customException) {
            BaseErrorCode errorCode = customException.getErrorCode();
            if (errorCode instanceof ScrapingErrorCode) {
                return customException;
            }
        }

        if (actionType == ScrapingActionType.TEST) {
            return new CustomException(ScrapingErrorCode.SCRAPING_TEST_FAILED);
        }
        return new CustomException(ScrapingErrorCode.SCRAPING_EXECUTION_FAILED);
    }
}
