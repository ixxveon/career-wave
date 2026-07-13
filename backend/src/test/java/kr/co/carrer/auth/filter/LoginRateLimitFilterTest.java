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
        assertThat(response.getHeader("Retry-After")).isEqualTo("60");
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
}
