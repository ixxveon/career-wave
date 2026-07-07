package kr.co.carrer.auth.filter;

import jakarta.servlet.FilterChain;
import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.auth.jwt.JwtProperties;
import kr.co.carrer.auth.jwt.JwtTokenProvider;
import kr.co.carrer.auth.store.SessionLivenessChecker;
import kr.co.carrer.auth.store.TokenBlacklistStore;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * JwtAuthenticationFilter의 유휴 세션 검증 분기 — SessionLivenessChecker에 위임.
 * - checker true → SecurityContext 설정
 * - checker false(유휴 만료) → SecurityContext 비움(다운스트림 EntryPoint 401)
 * (skip 규칙(구 토큰·kill-switch)은 SessionLivenessCheckerTest에서 검증)
 */
class JwtAuthenticationFilterTest {

    private JwtTokenProvider provider;
    private TokenBlacklistStore blacklistStore;
    private SessionLivenessChecker sessionLivenessChecker;
    private JwtAuthenticationFilter filter;

    @BeforeEach
    void setUp() {
        JwtProperties props = new JwtProperties();
        props.getUser().setSecret("test-user-secret-key-must-be-at-least-32-bytes!!");
        props.getUser().setAccessExpiration(1800000L);
        props.getUser().setRefreshExpiration(1209600000L);
        props.getAdmin().setSecret("test-admin-secret-key-must-be-at-least-32-bytes!");
        props.getAdmin().setAccessExpiration(10800000L);
        props.getAdmin().setRefreshExpiration(86400000L);
        provider = new JwtTokenProvider(props);

        blacklistStore = mock(TokenBlacklistStore.class); // isBlacklisted 기본 false
        sessionLivenessChecker = mock(SessionLivenessChecker.class);

        filter = new JwtAuthenticationFilter(provider, blacklistStore, sessionLivenessChecker);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private MockHttpServletRequest requestWithToken(String token) {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.addHeader("Authorization", "Bearer " + token);
        return req;
    }

    @Test
    void 세션이_살아있으면_인증_컨텍스트가_설정된다() throws Exception {
        String token = provider.createAccessToken("user-1", AccountType.USER, "USER", null, "sess-1");
        when(sessionLivenessChecker.isAliveOrSkip(eq(AccountType.USER), eq("user-1"), eq("sess-1"), anyBoolean()))
                .thenReturn(true);

        MockHttpServletResponse res = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(requestWithToken(token), res, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        verify(chain).doFilter(any(), any());
    }

    @Test
    void 유휴_만료로_세션_부재면_인증_컨텍스트가_비어있다() throws Exception {
        String token = provider.createAccessToken("user-1", AccountType.USER, "USER", null, "sess-1");
        when(sessionLivenessChecker.isAliveOrSkip(eq(AccountType.USER), eq("user-1"), eq("sess-1"), anyBoolean()))
                .thenReturn(false);

        MockHttpServletResponse res = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(requestWithToken(token), res, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(chain).doFilter(any(), any()); // 체인은 계속 → 다운스트림 401
    }
}
