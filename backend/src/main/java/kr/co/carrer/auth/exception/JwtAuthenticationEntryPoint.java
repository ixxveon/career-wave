package kr.co.carrer.auth.exception;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import kr.co.carrer.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        String jwtError = (String) request.getAttribute("jwtException");
        if (jwtError != null) {
            log.warn("[인증 실패] JWT 검증 오류: {}", jwtError);
        } else {
            log.warn("[인증 실패] Authorization 헤더 없음 또는 인증 정보 불충분 | URI: {}", request.getRequestURI());
        }

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE + ";charset=UTF-8");

        ApiResponse<Object> body = ApiResponse.fail(
                HttpServletResponse.SC_UNAUTHORIZED,
                AuthErrorCode.AUTH_UNAUTHENTICATED.getMessage(),
                AuthErrorCode.AUTH_UNAUTHENTICATED.name()
        );
        objectMapper.writeValue(response.getWriter(), body);
    }
}
