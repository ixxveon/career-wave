package kr.co.carrer.admin.admin.controller;

import kr.co.carrer.admin.admin.service.AdminManagementService;
import kr.co.carrer.admin.admin.type.AdminRole;
import kr.co.carrer.admin.admin.type.AdminStatus;
import kr.co.carrer.global.response.PaginationResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.time.ZonedDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class AdminManagementControllerResponseTest {

    @InjectMocks
    private AdminManagementController adminManagementController;

    @Mock
    private AdminManagementService adminManagementService;

    @Test
    @DisplayName("관리자 목록 조회는 ApiResponse와 1-based 페이지 응답 형식을 반환한다")
    void getAdminsReturnsApiResponseWithOneBasedPagination() {
        ZonedDateTime createdAt = ZonedDateTime.parse("2026-06-15T10:00:00Z");
        ZonedDateTime updatedAt = ZonedDateTime.parse("2026-06-15T11:00:00Z");

        var item = new AdminManagementService.AdminListItem(
            1L,
            "master@career-wave.com",
            "master-admin",
            AdminRole.MASTER,
            AdminStatus.ACTIVE,
            null,
            null,
            createdAt,
            updatedAt
        );
        given(adminManagementService.getAdmins(null, null, null, 1, 20))
            .willReturn(PaginationResponse.of(List.of(item), 1, 20, 1));

        ResponseEntity<kr.co.carrer.global.response.ApiResponse<kr.co.carrer.admin.admin.dto.AdminManagementDTO.ResponseList>> response =
            adminManagementController.getAdmins(null, null, null, 1, 20);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        assertThat(response.getBody().getStatusCode()).isEqualTo(200);
        assertThat(response.getBody().getData().page()).isEqualTo(1);
        assertThat(response.getBody().getData().size()).isEqualTo(20);
        assertThat(response.getBody().getData().totalElements()).isEqualTo(1L);
        assertThat(response.getBody().getData().totalPages()).isEqualTo(1);
        assertThat(response.getBody().getData().content()).hasSize(1);
    }

    @Test
    @DisplayName("IP ACL 목록 조회는 ApiResponse와 1-based 페이지 응답 형식을 반환한다")
    void getIpAclsReturnsApiResponseWithOneBasedPagination() {
        ZonedDateTime createdAt = ZonedDateTime.parse("2026-06-15T10:00:00Z");
        ZonedDateTime updatedAt = ZonedDateTime.parse("2026-06-15T11:00:00Z");

        var item = new AdminManagementService.IpAclListItem(
            1L,
            "사내망",
            "10.0.0.0/24",
            true,
            "본사 내부망",
            createdAt,
            updatedAt
        );
        given(adminManagementService.getIpAcls(1, 20))
            .willReturn(PaginationResponse.of(List.of(item), 1, 20, 1));

        ResponseEntity<kr.co.carrer.global.response.ApiResponse<kr.co.carrer.admin.admin.dto.AdminAclDTO.ResponseList>> response =
            adminManagementController.getIpAcls(1, 20);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        assertThat(response.getBody().getStatusCode()).isEqualTo(200);
        assertThat(response.getBody().getData().page()).isEqualTo(1);
        assertThat(response.getBody().getData().size()).isEqualTo(20);
        assertThat(response.getBody().getData().totalElements()).isEqualTo(1L);
        assertThat(response.getBody().getData().totalPages()).isEqualTo(1);
        assertThat(response.getBody().getData().content()).hasSize(1);
    }
}
