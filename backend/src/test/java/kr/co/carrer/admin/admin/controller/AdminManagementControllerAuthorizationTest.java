package kr.co.carrer.admin.admin.controller;

import jakarta.servlet.http.HttpServletRequest;
import kr.co.carrer.admin.admin.dto.AdminAclDTO;
import kr.co.carrer.admin.admin.dto.AdminManagementDTO;
import kr.co.carrer.admin.admin.service.AdminManagementService;
import kr.co.carrer.admin.admin.type.AdminRole;
import kr.co.carrer.admin.admin.type.AdminStatus;
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
import org.springframework.mock.web.MockHttpServletRequest;
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
    @EnableMethodSecurity(proxyTargetClass = true)
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
    private AdminManagementController adminManagementController;

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
            "office",
            "10.0.0.0/24",
            true,
            "office range",
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

    @Test
    @DisplayName("MASTER는 관리자 계정 생성에 접근할 수 있다")
    void masterCanCreateAdmin() {
        given(adminManagementService.createAdmin(
            org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.eq(1L),
            org.mockito.ArgumentMatchers.eq("203.0.113.10")
        )).willReturn(new AdminManagementService.AdminDetailResult(
            1L,
            "master@career-wave.com",
            "master-admin",
            AdminRole.MASTER,
            AdminStatus.ACTIVE,
            null,
            null,
            ZonedDateTime.parse("2026-06-15T00:00:00Z"),
            ZonedDateTime.parse("2026-06-15T00:00:00Z")
        ));
        authenticateAs("MASTER");

        var response = adminManagementController.createAdmin(
            new AdminManagementDTO.RequestCreateAdmin("master@career-wave.com", "temporary-password", "master-admin", AdminRole.MASTER),
            adminPrincipal("MASTER"),
            requestWithRemoteAddr("203.0.113.10")
        );

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    @DisplayName("BACKEND는 관리자 계정 생성에 접근할 수 없다")
    void backendCannotCreateAdmin() {
        authenticateAs("BACKEND");

        assertThatThrownBy(() -> adminManagementController.createAdmin(
            new AdminManagementDTO.RequestCreateAdmin("master@career-wave.com", "temporary-password", "master-admin", AdminRole.MASTER),
            adminPrincipal("BACKEND"),
            requestWithRemoteAddr("203.0.113.10")
        )).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("MASTER는 관리자 권한 변경에 접근할 수 있다")
    void masterCanUpdateAdminRole() {
        given(adminManagementService.updateAdminRole(
            org.mockito.ArgumentMatchers.eq(1L),
            org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.eq(1L),
            org.mockito.ArgumentMatchers.eq("203.0.113.11")
        )).willReturn(new AdminManagementService.AdminDetailResult(
            1L,
            "master@career-wave.com",
            "master-admin",
            AdminRole.CS,
            AdminStatus.ACTIVE,
            null,
            null,
            ZonedDateTime.parse("2026-06-15T00:00:00Z"),
            ZonedDateTime.parse("2026-06-15T00:00:00Z")
        ));
        authenticateAs("MASTER");

        var response = adminManagementController.updateAdminRole(
            1L,
            new AdminManagementDTO.RequestUpdateRole(AdminRole.CS),
            adminPrincipal("MASTER"),
            requestWithRemoteAddr("203.0.113.11")
        );

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    @DisplayName("BACKEND는 관리자 권한 변경에 접근할 수 없다")
    void backendCannotUpdateAdminRole() {
        authenticateAs("BACKEND");

        assertThatThrownBy(() -> adminManagementController.updateAdminRole(
            1L,
            new AdminManagementDTO.RequestUpdateRole(AdminRole.CS),
            adminPrincipal("BACKEND"),
            requestWithRemoteAddr("203.0.113.11")
        )).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("MASTER는 관리자 상태 변경에 접근할 수 있다")
    void masterCanUpdateAdminStatus() {
        given(adminManagementService.updateAdminStatus(
            org.mockito.ArgumentMatchers.eq(1L),
            org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.eq(1L),
            org.mockito.ArgumentMatchers.eq("203.0.113.12")
        )).willReturn(new AdminManagementService.AdminDetailResult(
            1L,
            "master@career-wave.com",
            "master-admin",
            AdminRole.MASTER,
            AdminStatus.LOCKED,
            null,
            null,
            ZonedDateTime.parse("2026-06-15T00:00:00Z"),
            ZonedDateTime.parse("2026-06-15T00:00:00Z")
        ));
        authenticateAs("MASTER");

        var response = adminManagementController.updateAdminStatus(
            1L,
            new AdminManagementDTO.RequestUpdateStatus(AdminStatus.LOCKED),
            adminPrincipal("MASTER"),
            requestWithRemoteAddr("203.0.113.12")
        );

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    @DisplayName("BACKEND는 관리자 상태 변경에 접근할 수 없다")
    void backendCannotUpdateAdminStatus() {
        authenticateAs("BACKEND");

        assertThatThrownBy(() -> adminManagementController.updateAdminStatus(
            1L,
            new AdminManagementDTO.RequestUpdateStatus(AdminStatus.LOCKED),
            adminPrincipal("BACKEND"),
            requestWithRemoteAddr("203.0.113.12")
        )).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("MASTER는 관리자 삭제에 접근할 수 있다")
    void masterCanDeleteAdmin() {
        authenticateAs("MASTER");

        var response = adminManagementController.deleteAdmin(
            2L,
            adminPrincipal("MASTER"),
            requestWithRemoteAddr("203.0.113.13")
        );

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    @DisplayName("BACKEND는 관리자 삭제에 접근할 수 없다")
    void backendCannotDeleteAdmin() {
        authenticateAs("BACKEND");

        assertThatThrownBy(() -> adminManagementController.deleteAdmin(
            2L,
            adminPrincipal("BACKEND"),
            requestWithRemoteAddr("203.0.113.13")
        )).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("MASTER는 IP ACL 등록에 접근할 수 있다")
    void masterCanCreateIpAcl() {
        given(adminManagementService.createIpAcl(
            org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.eq(1L),
            org.mockito.ArgumentMatchers.eq("203.0.113.14")
        )).willReturn(new AdminManagementService.IpAclDetailResult(
            1L,
            "office",
            "10.0.0.0/24",
            true,
            "office range",
            ZonedDateTime.parse("2026-06-15T00:00:00Z"),
            ZonedDateTime.parse("2026-06-15T00:00:00Z")
        ));
        authenticateAs("MASTER");

        var response = adminManagementController.createIpAcl(
            new AdminAclDTO.RequestCreate("office", "10.0.0.0/24", "office range"),
            adminPrincipal("MASTER"),
            requestWithRemoteAddr("203.0.113.14")
        );

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    @DisplayName("BACKEND는 IP ACL 등록에 접근할 수 없다")
    void backendCannotCreateIpAcl() {
        authenticateAs("BACKEND");

        assertThatThrownBy(() -> adminManagementController.createIpAcl(
            new AdminAclDTO.RequestCreate("office", "10.0.0.0/24", "office range"),
            adminPrincipal("BACKEND"),
            requestWithRemoteAddr("203.0.113.14")
        )).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("MASTER는 IP ACL 활성 상태 변경에 접근할 수 있다")
    void masterCanUpdateIpAclEnabled() {
        given(adminManagementService.updateIpAclEnabled(
            org.mockito.ArgumentMatchers.eq(1L),
            org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.eq(1L),
            org.mockito.ArgumentMatchers.eq("203.0.113.15")
        )).willReturn(new AdminManagementService.IpAclDetailResult(
            1L,
            "office",
            "10.0.0.0/24",
            false,
            "office range",
            ZonedDateTime.parse("2026-06-15T00:00:00Z"),
            ZonedDateTime.parse("2026-06-15T00:00:00Z")
        ));
        authenticateAs("MASTER");

        var response = adminManagementController.updateIpAclEnabled(
            1L,
            new AdminAclDTO.RequestToggleEnabled(false),
            adminPrincipal("MASTER"),
            requestWithRemoteAddr("203.0.113.15")
        );

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    @DisplayName("BACKEND는 IP ACL 활성 상태 변경에 접근할 수 없다")
    void backendCannotUpdateIpAclEnabled() {
        authenticateAs("BACKEND");

        assertThatThrownBy(() -> adminManagementController.updateIpAclEnabled(
            1L,
            new AdminAclDTO.RequestToggleEnabled(false),
            adminPrincipal("BACKEND"),
            requestWithRemoteAddr("203.0.113.15")
        )).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("MASTER는 IP ACL 삭제에 접근할 수 있다")
    void masterCanDeleteIpAcl() {
        authenticateAs("MASTER");

        var response = adminManagementController.deleteIpAcl(
            1L,
            adminPrincipal("MASTER"),
            requestWithRemoteAddr("203.0.113.16")
        );

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    @DisplayName("BACKEND는 IP ACL 삭제에 접근할 수 없다")
    void backendCannotDeleteIpAcl() {
        authenticateAs("BACKEND");

        assertThatThrownBy(() -> adminManagementController.deleteIpAcl(
            1L,
            adminPrincipal("BACKEND"),
            requestWithRemoteAddr("203.0.113.16")
        )).isInstanceOf(AccessDeniedException.class);
    }

    private void authenticateAs(String adminRole) {
        AuthPrincipal principal = adminPrincipal(adminRole);
        var authentication = new UsernamePasswordAuthenticationToken(
            principal,
            null,
            principal.getAuthorities()
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    private AuthPrincipal adminPrincipal(String adminRole) {
        return new AuthPrincipal("1", AccountType.ADMIN, "ADMIN", adminRole);
    }

    private HttpServletRequest requestWithRemoteAddr(String remoteAddr) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr(remoteAddr);
        return request;
    }
}
