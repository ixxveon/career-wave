package kr.co.carrer.global.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private final boolean success;
    private final int statusCode;
    private final String message;
    private final T data;

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, 200, "요청이 성공적으로 처리되었습니다.", data);
    }

    public static <T> ApiResponse<T> ok(String message, T data) {
        return new ApiResponse<>(true, 200, message, data);
    }

    public static ApiResponse<Void> ok(String message) {
        return new ApiResponse<>(true, 200, message, null);
    }

    public static ApiResponse<Object> fail(int statusCode, String message) {
        return new ApiResponse<>(false, statusCode, message, null);
    }

    public static <T> ApiResponse<T> fail(int statusCode, String message, T data) {
        return new ApiResponse<>(false, statusCode, message, data);
    }
}
