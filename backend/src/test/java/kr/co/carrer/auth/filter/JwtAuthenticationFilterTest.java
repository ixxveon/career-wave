package kr.co.carrer.auth.filter;

import jakarta.servlet.FilterChain;
import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.auth.jwt.JwtProperties;
import kr.co.carrer.auth.jwt.JwtTokenProvider;
import kr.co.carrer.auth.jwt.SessionProperties;
import kr.co.carrer.auth.store.RefreshTokenStore;
import kr.co.carrer.auth.store.TokenBlacklistStore;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * JwtAuthenticationFilter의 유휴 세션 존재성 검증 분기 검증.
 * - 세션 존재 → SecurityContext 설정
 * - 세션 부재(유휴 만료) → SecurityContext 비움(다운스트림 EntryPoint 401)
 * - sessionId 미보유(구 토큰) / kill-switch off → 존재성 검증 skip
 */
class JwtAuthenticationFilterTest {

    private JwtTokenProvider provider;
    private TokenBlacklistStore blacklistStore;
    private RefreshTokenStore refreshTokenStore;
    private SessionProperties sessionProperties;
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
        refreshTokenStore = mock(RefreshTokenStore.class);
        sessionProperties = new SessionProperties(); // existence-check on

        filter = new JwtAuthenticationFilter(provider, blacklistStore, refreshTokenStore, sessionProperties);
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
        String sessionId = "sess-1";
        String token = provider.createAccessToken("user-1", AccountType.USER, "USER", null, sessionId);
        when(refreshTokenStore.touchSession(eq(AccountType.USER), eq("user-1"), eq(sessionId),
                any(Duration.class), any(Duration.class), eq(false))).thenReturn(true);

        MockHttpServletResponse res = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(requestWithToken(token), res, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        verify(chain).doFilter(any(), any());
    }

    @Test
    void 유휴_만료로_세션_부재면_인증_컨텍스트가_비어있다() throws Exception {
        String sessionId = "sess-1";
        String token = provider.createAccessToken("user-1", AccountType.USER, "USER", null, sessionId);
        when(refreshTokenStore.touchSession(eq(AccountType.USER), eq("user-1"), eq(sessionId),
                any(Duration.class), any(Duration.class), eq(false))).thenReturn(false);

        MockHttpServletResponse res = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(requestWithToken(token), res, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(chain).doFilter(any(), any()); // 체인은 계속 → 다운스트림에서 401
    }

    @Test
    void sessionId_미보유_구토큰은_존재성_검증을_skip하고_인증한다() throws Exception {
        // 4-arg → sessionId claim 없음 (배포 과도기 구 토큰)
        String token = provider.createAccessToken("user-1", AccountType.USER, "USER", null);

        MockHttpServletResponse res = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(requestWithToken(token), res, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        verifyNoInteractions(refreshTokenStore);
    }

    @Test
    void killswitch_off면_존재성_검증을_건너뛴다() throws Exception {
        sessionProperties.setExistenceCheckEnabled(false);
        String token = provider.createAccessToken("user-1", AccountType.USER, "USER", null, "sess-1");

        MockHttpServletResponse res = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(requestWithToken(token), res, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        verifyNoInteractions(refreshTokenStore);
    }
}
