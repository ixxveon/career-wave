package kr.co.carrer.auth.principal;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;

public final class AdminPrincipalResolver {

    private AdminPrincipalResolver() {
    }

    public static Long extractAdminId(AuthPrincipal principal) {
        if (principal == null || principal.getId() == null || principal.getId().isBlank()) {
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        }

        try {
            return Long.valueOf(principal.getId());
        } catch (NumberFormatException exception) {
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        }
    }
}
