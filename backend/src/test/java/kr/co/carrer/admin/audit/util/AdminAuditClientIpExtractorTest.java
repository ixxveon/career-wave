package kr.co.carrer.admin.audit.util;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

class AdminAuditClientIpExtractorTest {

    @Test
    void usesFirstForwardedAddressWhenProxyHeadersExist() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Forwarded-For", "203.0.113.10, 10.0.0.1, 10.0.0.2");
        request.addHeader("X-Real-IP", "198.51.100.20");
        request.setRemoteAddr("127.0.0.1");

        String clientIp = AdminAuditClientIpExtractor.extract(request);

        assertThat(clientIp).isEqualTo("203.0.113.10");
    }

    @Test
    void usesRealIpWhenForwardedHeaderIsMissing() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Real-IP", "198.51.100.20");
        request.setRemoteAddr("127.0.0.1");

        String clientIp = AdminAuditClientIpExtractor.extract(request);

        assertThat(clientIp).isEqualTo("198.51.100.20");
    }

    @Test
    void fallsBackToRemoteAddressWhenProxyHeadersAreMissing() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");

        String clientIp = AdminAuditClientIpExtractor.extract(request);

        assertThat(clientIp).isEqualTo("127.0.0.1");
    }
}
