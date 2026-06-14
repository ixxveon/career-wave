package kr.co.carrer.auth.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import kr.co.carrer.auth.exception.AuthErrorCode;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.exception.CustomException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Set;

/**
 * JwtAuthenticationFilter 이후 실행.
 * SecurityContext의 AuthPrincipal 기준으로 DB 계정 상태를 검증한다.
 * ACTIVE만 통과, SUSPENDED/BANNED/LOCKED/WITHDRAWN → CustomException(403/423).
 *
 * 예외 경로 (비ACTIVE도 허용):
 * - GET  /api/v1/user/members/me/status  (정지 회원 상태 조회)
 * - POST /api/v1/user/members/logout     (본인 세션 폐기 허용)
 * - POST /api/v1/admin/auth/logout
 */
public class AccountStatusAuthorizationFilter extends OncePerRequestFilter {

    private static final Set<String> EXEMPT_PATHS = Set.of(
            "/api/v1/user/members/me/status",
            "/api/v1/user/members/logout",
            "/api/v1/admin/auth/logout"
    );

    private final List<AccountStatusPort> statusPorts;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    public AccountStatusAuthorizationFilter(List<AccountStatusPort> statusPorts) {
        this.statusPorts = statusPorts;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (isExempt(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AuthPrincipal principal)) {
            filterChain.doFilter(request, response);
            return;
        }

        if (!statusPorts.isEmpty()) {
            statusPorts.stream()
                    .filter(port -> port.supports(principal.getAccountType()))
                    .findFirst()
                    .orElseThrow(() -> new CustomException(AuthErrorCode.AUTH_UNAUTHENTICATED))
                    .validateActive(principal.getId());
        }

        filterChain.doFilter(request, response);
    }

    private boolean isExempt(HttpServletRequest request) {
        String path = request.getRequestURI();
        return EXEMPT_PATHS.stream().anyMatch(p -> pathMatcher.match(p, path));
    }
}
