package kr.co.carrer.auth.principal;

import kr.co.carrer.auth.jwt.AccountType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AuthPrincipalTest {

    @Test
    @DisplayName("USER 주체 — ROLE_USER 권한만 포함")
    void user_authority_only_role_user() {
        AuthPrincipal principal = new AuthPrincipal("uuid-1", AccountType.USER, "USER", null);

        List<String> authorities = principal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();

        assertThat(authorities).containsExactly("ROLE_USER");
    }

    @Test
    @DisplayName("ADMIN+MASTER — ROLE_ADMIN, ROLE_MASTER 둘 다 포함")
    void admin_master_has_both_role_admin_and_role_master() {
        AuthPrincipal principal = new AuthPrincipal("1", AccountType.ADMIN, "ADMIN", "MASTER");

        List<String> authorities = principal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();

        assertThat(authorities).containsExactlyInAnyOrder("ROLE_ADMIN", "ROLE_MASTER");
    }

    @Test
    @DisplayName("ADMIN+CS — ROLE_ADMIN, ROLE_CS 포함")
    void admin_cs_has_role_admin_and_role_cs() {
        AuthPrincipal principal = new AuthPrincipal("2", AccountType.ADMIN, "ADMIN", "CS");

        List<String> authorities = principal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();

        assertThat(authorities).containsExactlyInAnyOrder("ROLE_ADMIN", "ROLE_CS");
    }

    @Test
    @DisplayName("ADMIN+BACKEND — ROLE_ADMIN, ROLE_BACKEND 포함")
    void admin_backend_has_role_admin_and_role_backend() {
        AuthPrincipal principal = new AuthPrincipal("3", AccountType.ADMIN, "ADMIN", "BACKEND");

        List<String> authorities = principal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();

        assertThat(authorities).containsExactlyInAnyOrder("ROLE_ADMIN", "ROLE_BACKEND");
    }
}
