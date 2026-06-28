package kr.co.carrer.admin.audit.util;

import jakarta.servlet.http.HttpServletRequest;

public final class AdminAuditClientIpExtractor {

    private AdminAuditClientIpExtractor() {
    }

    public static String extract(HttpServletRequest request) {
        return request.getRemoteAddr();
    }
}
