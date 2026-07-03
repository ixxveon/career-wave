package kr.co.carrer.auth.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import kr.co.carrer.global.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.InetAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Slf4j
public class IpAclFilter extends OncePerRequestFilter {

    private final IpAclPort ipAclPort;
    private final ObjectMapper objectMapper;
    private final List<String> trustedProxies;

    public IpAclFilter(IpAclPort ipAclPort, ObjectMapper objectMapper, List<String> trustedProxies) {
        this.ipAclPort = ipAclPort;
        this.objectMapper = objectMapper;
        this.trustedProxies = trustedProxies;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        // 등록된 ACL 레코드가 하나도 없을 때만 전체 허용 (초기 세팅)
        // 레코드가 있지만 전부 비활성화된 경우는 차단 유지
        if (!ipAclPort.hasAnyIpAcl()) {
            filterChain.doFilter(request, response);
            return;
        }

        List<String> activeRanges = ipAclPort.findActiveIpRanges();

        if (activeRanges.isEmpty()) {
            writeForbiddenResponse(response);
            return;
        }

        String clientIp = extractClientIp(request);

        if (isAllowed(clientIp, activeRanges)) {
            filterChain.doFilter(request, response);
            return;
        }

        writeForbiddenResponse(response);
    }

    private String extractClientIp(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        String xForwardedFor = request.getHeader("X-Forwarded-For");

        if (xForwardedFor == null || xForwardedFor.isBlank() || !isTrustedProxy(remoteAddr)) {
            return remoteAddr;
        }

        // 신뢰 프록시가 XFF를 overwrite하지 않고 append하면 왼쪽 값은 클라이언트가 직접 심은 값일 수 있다.
        // 오른쪽부터 신뢰 프록시 체인을 하나씩 걷어내고, 신뢰 프록시가 아닌 첫 hop을 실제 클라이언트로 본다.
        String[] hops = xForwardedFor.split(",");
        for (int i = hops.length - 1; i >= 0; i--) {
            String hop = hops[i].trim();
            if (!isTrustedProxy(hop)) {
                return hop;
            }
        }
        return hops[0].trim();
    }

    private boolean isTrustedProxy(String remoteAddr) {
        for (String trustedProxy : trustedProxies) {
            try {
                if (matchesCidr(remoteAddr, trustedProxy)) {
                    return true;
                }
            } catch (Exception e) {
                log.warn("신뢰 프록시 설정값이 올바르지 않아 매칭을 건너뜁니다. trustedProxy={}", trustedProxy, e);
            }
        }
        return false;
    }

    private boolean isAllowed(String clientIp, List<String> cidrRanges) {
        for (String cidr : cidrRanges) {
            try {
                if (matchesCidr(clientIp, cidr)) {
                    return true;
                }
            } catch (Exception e) {
                // 잘못된 IP/CIDR 값이 활성 ACL로 저장된 경우 — 해당 항목만 건너뛰되,
                // 조용히 무시하면 관리자 접근이 의도치 않게 차단될 수 있으므로 경고 로그를 남긴다.
                log.warn("ip_acl에 잘못된 IP/CIDR 값이 저장되어 매칭을 건너뜁니다. cidr={}", cidr, e);
            }
        }
        return false;
    }

    private boolean matchesCidr(String clientIp, String cidr) throws Exception {
        if (!cidr.contains("/")) {
            return clientIp.equals(cidr);
        }

        String[] parts = cidr.split("/");
        int prefixLength = Integer.parseInt(parts[1]);

        byte[] networkBytes = InetAddress.getByName(parts[0]).getAddress();
        byte[] clientBytes = InetAddress.getByName(clientIp).getAddress();

        if (networkBytes.length != clientBytes.length) {
            return false;
        }

        int maxPrefix = networkBytes.length * 8;
        if (prefixLength < 0 || prefixLength > maxPrefix) {
            return false;
        }

        int fullBytes = prefixLength / 8;
        int remainingBits = prefixLength % 8;

        for (int i = 0; i < fullBytes; i++) {
            if (networkBytes[i] != clientBytes[i]) {
                return false;
            }
        }

        if (remainingBits > 0 && fullBytes < networkBytes.length) {
            int mask = 0xFF & (0xFF << (8 - remainingBits));
            if ((networkBytes[fullBytes] & mask) != (clientBytes[fullBytes] & mask)) {
                return false;
            }
        }

        return true;
    }

    private void writeForbiddenResponse(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());

        ApiResponse<Object> body = ApiResponse.fail(HttpStatus.FORBIDDEN.value(), "접근이 허용되지 않은 IP입니다.");
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
