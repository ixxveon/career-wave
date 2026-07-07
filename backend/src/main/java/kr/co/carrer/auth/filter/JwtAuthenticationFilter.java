package kr.co.carrer.auth.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.auth.jwt.JwtTokenProvider;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.auth.store.SessionLivenessChecker;
import kr.co.carrer.auth.store.TokenBlacklistStore;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final TokenBlacklistStore tokenBlacklistStore;
    private final SessionLivenessChecker sessionLivenessChecker;

    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider,
                                    TokenBlacklistStore tokenBlacklistStore,
                                    SessionLivenessChecker sessionLivenessChecker) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.tokenBlacklistStore = tokenBlacklistStore;
        this.sessionLivenessChecker = sessionLivenessChecker;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String token = extractBearerToken(request);

        if (StringUtils.hasText(token)) {
            try {
                AccountType accountType = jwtTokenProvider.extractAccountType(token);

                if (jwtTokenProvider.validate(token, accountType)) {
                    Claims claims = jwtTokenProvider.parse(token, accountType);
                    String jti = claims.get("jti", String.class);

                    // jti 누락 토큰은 fail-closed: blacklist 조회 불가이므로 인증 거부
                    if (!StringUtils.hasText(jti)) {
                        request.setAttribute("jwtException", "Missing jti claim");
                        filterChain.doFilter(request, response);
                        return;
                    }

                    // blacklist 등록된 jti(로그아웃된 토큰) → SecurityContext 비워둠 → EntryPoint 401
                    // Redis 장애 시: 관리자 보수적 거부, 사용자 허용 (spec 장애 정책)
                    boolean adminConservative = accountType == AccountType.ADMIN;
                    if (tokenBlacklistStore.isBlacklisted(jti, adminConservative)) {
                        request.setAttribute("jwtException", "Token has been revoked (logout)");
                        filterChain.doFilter(request, response);
                        return;
                    }

                    String id = claims.getSubject();

                    // 유휴 세션 타임아웃: sessionId에 대응하는 Redis 세션이 살아있을 때만 인증 성공(존재성 확인 + 슬라이딩 갱신).
                    // sessionId 미보유(배포 과도기 구 토큰) / kill-switch OFF는 checker 내부에서 skip 처리.
                    String sessionId = claims.get("sessionId", String.class);
                    if (!sessionLivenessChecker.isAliveOrSkip(accountType, id, sessionId, adminConservative)) {
                        request.setAttribute("jwtException", "Session expired (idle timeout)");
                        filterChain.doFilter(request, response);
                        return;
                    }

                    String roleType = claims.get("roleType", String.class);
                    String adminRole = claims.get("adminRole", String.class);

                    AuthPrincipal principal = new AuthPrincipal(id, accountType, roleType, adminRole);
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            } catch (JwtException | IllegalArgumentException e) {
                // EntryPoint가 request attribute를 읽어 로그에 원인을 남길 수 있도록 저장
                request.setAttribute("jwtException", e.getMessage());
            }
        }

        filterChain.doFilter(request, response);
    }

    private String extractBearerToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (StringUtils.hasText(header) && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }
}
