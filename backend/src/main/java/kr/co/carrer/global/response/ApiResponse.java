package kr.co.carrer.global.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;

/**
 * 팀 응답 표준:
 * - 성공: { success, message, data }
 * - 실패: { success, status, message, code(선택), data }
 *
 * status 필드는 실패 응답에만 포함 (NON_NULL).
 * code 필드는 인증/인가 등 클라이언트 분기가 필요한 경우에만 포함 (NON_NULL).
 * data 필드는 성공·실패 모두 항상 직렬화 (null 포함).
 */
@Getter
public class ApiResponse<T> {

    private final boolean success;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private final Integer status;

    private final String message;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private final String code;

    private final T data;

    private ApiResponse(boolean success, Integer status, String message, String code, T data) {
        this.success = success;
        this.status = status;
        this.message = message;
        this.code = code;
        this.data = data;
    }

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, null, "요청이 성공적으로 처리되었습니다.", null, data);
    }

    public static <T> ApiResponse<T> ok(String message, T data) {
        return new ApiResponse<>(true, null, message, null, data);
    }

    public static ApiResponse<Void> ok(String message) {
        return new ApiResponse<>(true, null, message, null, null);
    }

    public static <T> ApiResponse<T> created(String message, T data) {
        return new ApiResponse<>(true, null, message, null, data);
    }

    public static ApiResponse<Object> fail(int status, String message) {
        return new ApiResponse<>(false, status, message, null, null);
    }

    public static <T> ApiResponse<T> fail(int status, String message, T data) {
        return new ApiResponse<>(false, status, message, null, data);
    }

    public static ApiResponse<Object> fail(int status, String message, String code) {
        return new ApiResponse<>(false, status, message, code, null);
    }

    public static <T> ApiResponse<T> fail(int status, String message, String code, T data) {
        return new ApiResponse<>(false, status, message, code, data);
    }
}
