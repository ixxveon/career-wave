package kr.co.carrer.auth.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import kr.co.carrer.auth.store.LoginRateLimitStore;
import kr.co.carrer.global.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Set;

/**
 * 로그인/인증 엔드포인트에 대한 IP 기준 요청 제한 필터 (무차별 대입·크리덴셜 스터핑 완화).
 *
 * 고정 윈도우: 동일 IP가 한 윈도우(WINDOW) 안에서 보호 대상 경로로 LIMIT 회를 초과해 요청하면
 * 429(Too Many Requests)로 차단한다. 카운트는 경로별로 분리한다(로그인 과다가 비밀번호 찾기를 막지 않도록).
 *
 * 인증 자체(JWT) 이전 단계에서 동작해야 하므로 JwtAuthenticationFilter 앞에 등록한다.
 */
@Slf4j
public class LoginRateLimitFilter extends OncePerRequestFilter {

    /** 동일 IP·동일 경로에 대한 윈도우당 허용 요청 수 */
    private static final int LIMIT = 10;
    /** 고정 윈도우 길이 */
    private static final Duration WINDOW = Duration.ofMinutes(1);

    /**
     * 보호 대상 경로(모두 POST). 로그인은 물론 계정 열거/OTP 남용이 가능한
     * 비밀번호 찾기·인증코드 발송도 포함한다.
     */
    private static final Set<String> PROTECTED_PATHS = Set.of(
            "/api/v1/user/members/login",
            "/api/v1/admin/auth/login",
            "/api/v1/user/members/recovery/find-id",
            "/api/v1/user/members/recovery/password-token",
            "/api/v1/user/members/recovery/reset-password",
            "/api/v1/user/members/verifications/send"
    );

    private final LoginRateLimitStore rateLimitStore;
    private final ClientIpResolver clientIpResolver;
    private final ObjectMapper objectMapper;

    public LoginRateLimitFilter(LoginRateLimitStore rateLimitStore,
                                ClientIpResolver clientIpResolver,
                                ObjectMapper objectMapper) {
        this.rateLimitStore = rateLimitStore;
        this.clientIpResolver = clientIpResolver;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (!isProtected(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = clientIpResolver.resolve(request);
        long count = rateLimitStore.increment(request.getRequestURI(), clientIp, WINDOW);

        if (count > LIMIT) {
            log.warn("[레이트 리밋] 요청 제한 초과 — path={}, ip={}, count={}",
                    request.getRequestURI(), clientIp, count);
            writeTooManyRequests(response);
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean isProtected(HttpServletRequest request) {
        return HttpMethod.POST.matches(request.getMethod())
                && PROTECTED_PATHS.contains(request.getRequestURI());
    }

    private void writeTooManyRequests(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setHeader(HttpHeaders.RETRY_AFTER, String.valueOf(WINDOW.toSeconds()));

        ApiResponse<Object> body = ApiResponse.fail(
                HttpStatus.TOO_MANY_REQUESTS.value(),
                "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
