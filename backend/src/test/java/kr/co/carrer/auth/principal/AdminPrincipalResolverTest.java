package kr.co.carrer.auth.principal;

import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

class AdminPrincipalResolverTest {

    @Test
    void extractsAdminIdFromValidPrincipal() {
        AuthPrincipal principal = new AuthPrincipal("42", AccountType.ADMIN, "ADMIN", "MASTER");

        Long adminId = AdminPrincipalResolver.extractAdminId(principal);

        assertThat(adminId).isEqualTo(42L);
    }

    @Test
    void throwsUnauthorizedWhenPrincipalIsMissing() {
        CustomException exception = catchThrowableOfType(
                () -> AdminPrincipalResolver.extractAdminId(null),
                CustomException.class
        );

        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.UNAUTHORIZED);
    }

    @Test
    void throwsUnauthorizedWhenPrincipalIdIsNotNumeric() {
        AuthPrincipal principal = new AuthPrincipal("not-a-number", AccountType.ADMIN, "ADMIN", "MASTER");

        CustomException exception = catchThrowableOfType(
                () -> AdminPrincipalResolver.extractAdminId(principal),
                CustomException.class
        );

        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.UNAUTHORIZED);
    }

    @Test
    void throwsUnauthorizedWhenPrincipalIdIsNull() {
        AuthPrincipal principal = new AuthPrincipal(null, AccountType.ADMIN, "ADMIN", "MASTER");

        CustomException exception = catchThrowableOfType(
                () -> AdminPrincipalResolver.extractAdminId(principal),
                CustomException.class
        );

        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.UNAUTHORIZED);
    }

    @Test
    void throwsUnauthorizedWhenPrincipalIdIsEmpty() {
        AuthPrincipal principal = new AuthPrincipal("", AccountType.ADMIN, "ADMIN", "MASTER");

        CustomException exception = catchThrowableOfType(
                () -> AdminPrincipalResolver.extractAdminId(principal),
                CustomException.class
        );

        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.UNAUTHORIZED);
    }

    @Test
    void throwsUnauthorizedWhenPrincipalIdIsBlank() {
        AuthPrincipal principal = new AuthPrincipal("   ", AccountType.ADMIN, "ADMIN", "MASTER");

        CustomException exception = catchThrowableOfType(
                () -> AdminPrincipalResolver.extractAdminId(principal),
                CustomException.class
        );

        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.UNAUTHORIZED);
    }
}
