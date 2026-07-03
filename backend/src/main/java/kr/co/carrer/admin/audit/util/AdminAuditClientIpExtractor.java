package kr.co.carrer.admin.audit.util;

import jakarta.servlet.http.HttpServletRequest;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.regex.Pattern;

public final class AdminAuditClientIpExtractor {

    private static final Pattern IPV4_PATTERN = Pattern.compile(
            "^(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}$");

    private AdminAuditClientIpExtractor() {
    }

    public static String extract(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            String clientIp = xForwardedFor.split(",")[0].trim();
            if (isValidIp(clientIp)) {
                return clientIp;
            }
        }

        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null) {
            String clientIp = xRealIp.trim();
            if (isValidIp(clientIp)) {
                return clientIp;
            }
        }

        return request.getRemoteAddr();
    }

    private static boolean isValidIp(String value) {
        if (IPV4_PATTERN.matcher(value).matches()) {
            return true;
        }
        if (!value.contains(":")) {
            return false;
        }
        try {
            InetAddress.getByName(value);
            return true;
        } catch (UnknownHostException e) {
            return false;
        }
    }
}
