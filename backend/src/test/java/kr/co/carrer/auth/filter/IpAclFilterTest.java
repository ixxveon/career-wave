package kr.co.carrer.auth.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class IpAclFilterTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void 신뢰된_프록시에서_전달된_XForwardedFor는_클라이언트_IP로_신뢰한다() throws Exception {
        IpAclPort ipAclPort = Mockito.mock(IpAclPort.class);
        given(ipAclPort.hasAnyIpAcl()).willReturn(true);
        given(ipAclPort.findActiveIpRanges()).willReturn(List.of("203.0.113.5/32"));

        IpAclFilter filter = new IpAclFilter(ipAclPort, objectMapper, List.of("10.0.2.92"));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.2.92");
        request.addHeader("X-Forwarded-For", "203.0.113.5");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = Mockito.mock(FilterChain.class);

        filter.doFilter(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    void 신뢰되지_않은_출발지에서_온_요청은_XForwardedFor_스푸핑을_무시한다() throws Exception {
        IpAclPort ipAclPort = Mockito.mock(IpAclPort.class);
        given(ipAclPort.hasAnyIpAcl()).willReturn(true);
        given(ipAclPort.findActiveIpRanges()).willReturn(List.of("203.0.113.5/32"));

        IpAclFilter filter = new IpAclFilter(ipAclPort, objectMapper, List.of("10.0.2.92"));

        MockHttpServletRequest request = new MockHttpServletRequest();
        // 신뢰 프록시(10.0.2.92)가 아닌 곳에서 직접 접근하며 허용 IP를 흉내
        request.setRemoteAddr("198.51.100.7");
        request.addHeader("X-Forwarded-For", "203.0.113.5");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = Mockito.mock(FilterChain.class);

        filter.doFilter(request, response, filterChain);

        verifyNoInteractions(filterChain);
        assertThat(response.getStatus()).isEqualTo(403);
    }
}
