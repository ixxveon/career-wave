package kr.co.carrer.global.exception;

import java.util.HashMap;
import java.util.Map;
import kr.co.carrer.global.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(CustomException.class)
    public ResponseEntity<ApiResponse<Object>> handleCustomException(CustomException e) {
        ErrorCode errorCode = e.getErrorCode();

        if (e.getCause() != null) {
            log.error(
                "[비즈니스 예외 발생] 에러코드: {} | 사유: {} -> [하부 원인 예외]: {} (상세 메시지: {})",
                errorCode.name(),
                e.getMessage(),
                e.getCause().getClass().getSimpleName(),
                e.getCause().getMessage()
            );
        } else {
            log.warn("[비즈니스 제재/검증 실패] 에러코드: {} | 사유: {}", errorCode.name(), e.getMessage());
        }

        return ResponseEntity
                .status(errorCode.getStatus())
                .body(ApiResponse.fail(errorCode.getStatus().value(), e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidationException(MethodArgumentNotValidException e) {
        Map<String, String> errors = new HashMap<>();

        for (FieldError fieldError : e.getBindingResult().getFieldErrors()) {
            errors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }

        log.warn("[입력값 검증 실패] 검증 오류 필드 수: {}개", errors.size());

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.fail(HttpStatus.BAD_REQUEST.value(), "입력값 검증에 실패했습니다.", errors));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Object>> handleDataIntegrityViolationException(DataIntegrityViolationException e) {
        log.error("[데이터 무결성 위반] DB 제약 조건 충돌 발생 | 상세: {}", e.getMostSpecificCause().getMessage());
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ApiResponse.fail(HttpStatus.CONFLICT.value(), "이미 존재하거나 사용 중인 데이터와 충돌이 발생했습니다."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleException(Exception e) {
        log.error("[미처리 예외 발생] 예외 타입: {} | 메시지: {}", e.getClass().getSimpleName(), e.getMessage(), e);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.fail(HttpStatus.INTERNAL_SERVER_ERROR.value(), "서버 내부 오류가 발생했습니다. 개발팀에 문의해주세요."));
    }
}
