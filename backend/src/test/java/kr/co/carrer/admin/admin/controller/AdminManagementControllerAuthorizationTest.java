package kr.co.carrer.admin.admin.controller;

import kr.co.carrer.admin.admin.docs.AdminManagementDocs;
import kr.co.carrer.admin.admin.service.AdminManagementService;
import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.response.PaginationResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mockito;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.time.ZonedDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

@ExtendWith(SpringExtension.class)
@ContextConfiguration(classes = AdminManagementControllerAuthorizationTest.TestConfig.class)
class AdminManagementControllerAuthorizationTest {

    @Configuration
    @EnableMethodSecurity
    static class TestConfig {

        @Bean
        AdminManagementService adminManagementService() {
            return Mockito.mock(AdminManagementService.class);
        }

        @Bean
        AdminManagementController adminManagementController(AdminManagementService adminManagementService) {
            return new AdminManagementController(adminManagementService);
        }
    }

    @org.springframework.beans.factory.annotation.Autowired
    private AdminManagementDocs adminManagementController;

    @org.springframework.beans.factory.annotation.Autowired
    private AdminManagementService adminManagementService;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("MASTER는 관리자 요약 조회에 접근할 수 있다")
    void masterCanAccessAdminSummary() {
        given(adminManagementService.getAdminSummary())
            .willReturn(new AdminManagementService.SummaryResult(5, 4, 1, 1));
        authenticateAs("MASTER");

        var response = adminManagementController.getAdminSummary();

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData().totalAdminCount()).isEqualTo(5L);
    }

    @Test
    @DisplayName("BACKEND는 관리자 요약 조회에 접근할 수 없다")
    void backendCannotAccessAdminSummary() {
        authenticateAs("BACKEND");

        assertThatThrownBy(() -> adminManagementController.getAdminSummary())
            .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("BACKEND는 IP ACL 목록 조회에 접근할 수 있다")
    void backendCanAccessIpAclList() {
        var item = new AdminManagementService.IpAclListItem(
            1L,
            "사내망",
            "10.0.0.0/24",
            true,
            "본사 내부망",
            ZonedDateTime.parse("2026-06-15T00:00:00Z"),
            ZonedDateTime.parse("2026-06-15T00:10:00Z")
        );
        given(adminManagementService.getIpAcls(1, 20))
            .willReturn(PaginationResponse.of(List.of(item), 1, 20, 1));
        authenticateAs("BACKEND");

        var response = adminManagementController.getIpAcls(1, 20);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData().content()).hasSize(1);
    }

    @Test
    @DisplayName("CS는 IP ACL 목록 조회에 접근할 수 없다")
    void csCannotAccessIpAclList() {
        authenticateAs("CS");

        assertThatThrownBy(() -> adminManagementController.getIpAcls(1, 20))
            .isInstanceOf(AccessDeniedException.class);
    }

    private void authenticateAs(String adminRole) {
        AuthPrincipal principal = new AuthPrincipal("1", AccountType.ADMIN, "ADMIN", adminRole);
        var authentication = new UsernamePasswordAuthenticationToken(
            principal,
            null,
            principal.getAuthorities()
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
