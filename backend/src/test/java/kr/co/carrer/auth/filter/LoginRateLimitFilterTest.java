package kr.co.carrer.auth.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import kr.co.carrer.auth.store.LoginRateLimitStore;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class LoginRateLimitFilterTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private static final String LOGIN_PATH = "/api/v1/user/members/login";

    private LoginRateLimitFilter newFilter(LoginRateLimitStore store, List<String> trustedProxies) {
        return new LoginRateLimitFilter(store, new ClientIpResolver(trustedProxies), objectMapper);
    }

    @Test
    void 임계값_이하_요청은_통과한다() throws Exception {
        LoginRateLimitStore store = Mockito.mock(LoginRateLimitStore.class);
        given(store.increment(anyString(), anyString(), any(Duration.class))).willReturn(10L);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setMethod("POST");
        request.setRequestURI(LOGIN_PATH);
        request.setRemoteAddr("198.51.100.7");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = Mockito.mock(FilterChain.class);

        newFilter(store, List.of()).doFilter(request, response, chain);

        verify(chain).doFilter(request, response);
        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    void 임계값_초과_요청은_429로_차단하고_RetryAfter를_내린다() throws Exception {
        LoginRateLimitStore store = Mockito.mock(LoginRateLimitStore.class);
        given(store.increment(anyString(), anyString(), any(Duration.class))).willReturn(11L);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setMethod("POST");
        request.setRequestURI(LOGIN_PATH);
        request.setRemoteAddr("198.51.100.7");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = Mockito.mock(FilterChain.class);

        newFilter(store, List.of()).doFilter(request, response, chain);

        verifyNoInteractions(chain);
        assertThat(response.getStatus()).isEqualTo(429);
        // WINDOW(=1분)에서 파생된 값임을 명시 — WINDOW 변경 시 하드코딩된 상수가 조용히 어긋나지 않도록
        assertThat(response.getHeader("Retry-After"))
                .isEqualTo(String.valueOf(Duration.ofMinutes(1).toSeconds()));
    }

    @Test
    void 보호대상이_아닌_경로는_카운트하지_않고_통과한다() throws Exception {
        LoginRateLimitStore store = Mockito.mock(LoginRateLimitStore.class);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setMethod("POST");
        request.setRequestURI("/api/v1/user/members/me/status");
        request.setRemoteAddr("198.51.100.7");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = Mockito.mock(FilterChain.class);

        newFilter(store, List.of()).doFilter(request, response, chain);

        verify(chain).doFilter(request, response);
        verifyNoInteractions(store);
    }

    @Test
    void 보호대상_경로라도_POST가_아니면_카운트하지_않는다() throws Exception {
        LoginRateLimitStore store = Mockito.mock(LoginRateLimitStore.class);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setMethod("GET");
        request.setRequestURI(LOGIN_PATH);
        request.setRemoteAddr("198.51.100.7");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = Mockito.mock(FilterChain.class);

        newFilter(store, List.of()).doFilter(request, response, chain);

        verify(chain).doFilter(request, response);
        verifyNoInteractions(store);
    }

    @Test
    void Redis_오류_시_제한을_건너뛰고_요청을_통과시킨다_failopen() throws Exception {
        LoginRateLimitStore store = Mockito.mock(LoginRateLimitStore.class);
        given(store.increment(anyString(), anyString(), any(Duration.class)))
                .willThrow(new RuntimeException("redis down"));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setMethod("POST");
        request.setRequestURI(LOGIN_PATH);
        request.setRemoteAddr("198.51.100.7");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = Mockito.mock(FilterChain.class);

        newFilter(store, List.of()).doFilter(request, response, chain);

        // 스토어 장애가 인증 마비로 번지지 않도록 요청은 통과해야 한다
        verify(chain).doFilter(request, response);
        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    void 비리터럴_XForwardedFor_hop은_무시하고_remoteAddr로_카운트한다() throws Exception {
        LoginRateLimitStore store = Mockito.mock(LoginRateLimitStore.class);
        given(store.increment(anyString(), anyString(), any(Duration.class))).willReturn(1L);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setMethod("POST");
        request.setRequestURI(LOGIN_PATH);
        // 신뢰 프록시(10.0.2.92)가 hostname을 XFF에 넣은 상황 — DNS 조회 유발 없이 무시되어야 한다
        request.setRemoteAddr("10.0.2.92");
        request.addHeader("X-Forwarded-For", "evil.example.com");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = Mockito.mock(FilterChain.class);

        newFilter(store, List.of("10.0.2.92")).doFilter(request, response, chain);

        ArgumentCaptor<String> ipCaptor = ArgumentCaptor.forClass(String.class);
        verify(store).increment(eq(LOGIN_PATH), ipCaptor.capture(), any(Duration.class));
        // 비-리터럴 hop은 버려지고 remoteAddr로 폴백되어야 한다
        assertThat(ipCaptor.getValue()).isEqualTo("10.0.2.92");
    }

    @Test
    void 신뢰프록시가_아닌_출발지의_XForwardedFor_스푸핑은_무시하고_remoteAddr로_카운트한다() throws Exception {
        LoginRateLimitStore store = Mockito.mock(LoginRateLimitStore.class);
        given(store.increment(anyString(), anyString(), any(Duration.class))).willReturn(1L);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setMethod("POST");
        request.setRequestURI(LOGIN_PATH);
        // 신뢰 프록시가 아닌 곳에서 직접 접근하며 XFF로 다른 IP를 흉내
        request.setRemoteAddr("198.51.100.7");
        request.addHeader("X-Forwarded-For", "203.0.113.9");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = Mockito.mock(FilterChain.class);

        newFilter(store, List.of("10.0.2.92")).doFilter(request, response, chain);

        ArgumentCaptor<String> ipCaptor = ArgumentCaptor.forClass(String.class);
        verify(store).increment(eq(LOGIN_PATH), ipCaptor.capture(), any(Duration.class));
        // 스푸핑된 XFF(203.0.113.9)가 아니라 실제 remoteAddr(198.51.100.7)로 키가 산정되어야 한다
        assertThat(ipCaptor.getValue()).isEqualTo("198.51.100.7");
    }

    @Test
    void 신뢰프록시가_전달한_XForwardedFor는_해당_IP로_카운트한다() throws Exception {
        LoginRateLimitStore store = Mockito.mock(LoginRateLimitStore.class);
        given(store.increment(anyString(), anyString(), any(Duration.class))).willReturn(1L);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setMethod("POST");
        request.setRequestURI(LOGIN_PATH);
        // 운영 시나리오: 신뢰 프록시(10.0.2.92)가 실제 클라이언트 IP(203.0.113.9)를 XFF로 전달
        request.setRemoteAddr("10.0.2.92");
        request.addHeader("X-Forwarded-For", "203.0.113.9");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = Mockito.mock(FilterChain.class);

        newFilter(store, List.of("10.0.2.92")).doFilter(request, response, chain);

        ArgumentCaptor<String> ipCaptor = ArgumentCaptor.forClass(String.class);
        verify(store).increment(eq(LOGIN_PATH), ipCaptor.capture(), any(Duration.class));
        // 신뢰 프록시가 전달한 실제 클라이언트 IP를 레이트 리밋 키로 사용해야 한다
        assertThat(ipCaptor.getValue()).isEqualTo("203.0.113.9");
    }
}
