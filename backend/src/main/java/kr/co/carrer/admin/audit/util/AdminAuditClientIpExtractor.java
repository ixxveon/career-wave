package kr.co.carrer.admin.audit.util;

import jakarta.servlet.http.HttpServletRequest;

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
        return isValidIpv6Literal(value);
    }

    private static boolean isValidIpv6Literal(String value) {
        if (!value.contains(":") || value.indexOf(":::") >= 0) {
            return false;
        }

        String[] compressedParts = value.split("::", -1);
        if (compressedParts.length > 2) {
            return false;
        }

        int hextetCount = countValidHextets(compressedParts[0]);
        if (hextetCount < 0) {
            return false;
        }

        if (compressedParts.length == 2) {
            int rightCount = countValidHextets(compressedParts[1]);
            return rightCount >= 0 && hextetCount + rightCount < 8;
        }

        return hextetCount == 8;
    }

    private static int countValidHextets(String value) {
        if (value.isEmpty()) {
            return 0;
        }

        String[] hextets = value.split(":", -1);
        for (String hextet : hextets) {
            if (!isValidHextet(hextet)) {
                return -1;
            }
        }
        return hextets.length;
    }

    private static boolean isValidHextet(String value) {
        if (value.isEmpty() || value.length() > 4) {
            return false;
        }
        for (int i = 0; i < value.length(); i++) {
            char ch = value.charAt(i);
            boolean isHexDigit = (ch >= '0' && ch <= '9')
                    || (ch >= 'a' && ch <= 'f')
                    || (ch >= 'A' && ch <= 'F');
            if (!isHexDigit) {
                return false;
            }
        }
        return true;
    }
}
