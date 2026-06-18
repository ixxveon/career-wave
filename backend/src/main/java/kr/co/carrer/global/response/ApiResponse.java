package kr.co.carrer.global.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;

@Getter
public class ApiResponse<T> {

    private final boolean success;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private final Integer statusCode;

    private final String message;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private final String code;

    private final T data;

    private ApiResponse(boolean success, Integer statusCode, String message, String code, T data) {
        this.success = success;
        this.statusCode = statusCode;
        this.message = message;
        this.code = code;
        this.data = data;
    }

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, 200, "요청이 성공적으로 처리되었습니다.", null, data);
    }

    public static <T> ApiResponse<T> ok(String message, T data) {
        return new ApiResponse<>(true, 200, message, null, data);
    }

    public static ApiResponse<Void> ok(String message) {
        return new ApiResponse<>(true, 200, message, null, null);
    }

    public static ApiResponse<Object> fail(int statusCode, String message) {
        return new ApiResponse<>(false, statusCode, message, null, null);
    }

    public static <T> ApiResponse<T> fail(int statusCode, String message, T data) {
        return new ApiResponse<>(false, statusCode, message, null, data);
    }

    public static ApiResponse<Object> fail(int statusCode, String message, String code) {
        return new ApiResponse<>(false, statusCode, message, code, null);
    }

    public static <T> ApiResponse<T> fail(int statusCode, String message, String code, T data) {
        return new ApiResponse<>(false, statusCode, message, code, data);
    }
}
