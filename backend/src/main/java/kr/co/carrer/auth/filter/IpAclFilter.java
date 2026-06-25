package kr.co.carrer.auth.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import kr.co.carrer.global.response.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.InetAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;

public class IpAclFilter extends OncePerRequestFilter {

    private final IpAclPort ipAclPort;
    private final ObjectMapper objectMapper;

    public IpAclFilter(IpAclPort ipAclPort, ObjectMapper objectMapper) {
        this.ipAclPort = ipAclPort;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        List<String> activeRanges = ipAclPort.findActiveIpRanges();

        if (activeRanges.isEmpty()) {
            filterChain.doFilter(request, response);
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
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private boolean isAllowed(String clientIp, List<String> cidrRanges) {
        for (String cidr : cidrRanges) {
            try {
                if (matchesCidr(clientIp, cidr)) {
                    return true;
                }
            } catch (Exception ignored) {
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
