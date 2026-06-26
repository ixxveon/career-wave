package kr.co.carrer.admin.audit.util;

import jakarta.servlet.http.HttpServletRequest;

public final class AdminAuditClientIpExtractor {

    private static final String X_FORWARDED_FOR = "X-Forwarded-For";
    private static final String X_REAL_IP = "X-Real-IP";

    private AdminAuditClientIpExtractor() {
    }

    public static String extract(HttpServletRequest request) {
        String xForwardedFor = request.getHeader(X_FORWARDED_FOR);
        if (hasText(xForwardedFor)) {
            return xForwardedFor.split(",")[0].trim();
        }

        String xRealIp = request.getHeader(X_REAL_IP);
        if (hasText(xRealIp)) {
            return xRealIp.trim();
        }

        return request.getRemoteAddr();
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
