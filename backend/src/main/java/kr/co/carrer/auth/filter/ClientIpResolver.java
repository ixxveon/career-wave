package kr.co.carrer.auth.filter;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;

import java.net.InetAddress;
import java.util.List;

/**
 * 신뢰 프록시(trusted proxy)를 고려한 실제 클라이언트 IP 추출기.
 *
 * X-Forwarded-For는 클라이언트가 임의로 심을 수 있으므로 그대로 신뢰하면 안 된다.
 * remoteAddr가 신뢰 프록시일 때만 XFF를 해석하고, 오른쪽부터 신뢰 프록시 체인을 걷어내
 * 신뢰 프록시가 아닌 첫 hop을 실제 클라이언트로 본다. (IpAclFilter와 동일한 정책)
 *
 * 레이트 리밋 키가 스푸핑 가능한 IP로 산정되면 공격자가 XFF를 회전시켜 제한을 우회할 수 있으므로,
 * 로그인/인증 레이트 리밋은 반드시 이 해석기를 사용한다.
 */
@Slf4j
public class ClientIpResolver {

    private final List<String> trustedProxies;

    public ClientIpResolver(List<String> trustedProxies) {
        this.trustedProxies = trustedProxies;
    }

    public String resolve(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        String xForwardedFor = request.getHeader("X-Forwarded-For");

        if (xForwardedFor == null || xForwardedFor.isBlank() || !isTrustedProxy(remoteAddr)) {
            return remoteAddr;
        }

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
}
