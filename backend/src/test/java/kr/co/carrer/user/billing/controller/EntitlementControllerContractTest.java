package kr.co.carrer.user.billing.controller;

import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.user.billing.dto.EntitlementDTO;
import kr.co.carrer.user.billing.service.EntitlementQueryService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class EntitlementControllerContractTest {

    private final EntitlementQueryService queryService = mock(EntitlementQueryService.class);
    private final EntitlementController controller = new EntitlementController(queryService);

    @Test
    @DisplayName("이용권 목록 조회 — 200, 메시지·리스트 포함")
    void getMyEntitlements_200_withItems() {
        UUID memberId = UUID.randomUUID();
        AuthPrincipal principal = new AuthPrincipal(memberId.toString(), AccountType.USER, "USER", null);

        EntitlementDTO.ResponseEntitlementList result = new EntitlementDTO.ResponseEntitlementList(
                Map.of("document-coaching", true, "interview", true),
                List.of(
                        freeItem("document-coaching", 1, "AVAILABLE", true, null),
                        freeItem("interview", 1, "AVAILABLE", true, null)
                )
        );
        given(queryService.getMyEntitlements(memberId)).willReturn(result);

        ResponseEntity<ApiResponse<EntitlementDTO.ResponseEntitlementList>> response =
                controller.getMyEntitlements(principal);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage()).isEqualTo("이용권 목록 조회 성공");
        assertThat(response.getBody().getData().entitlements())
                .containsEntry("document-coaching", true)
                .containsEntry("interview", true);
        assertThat(response.getBody().getData().entitlementDetails()).hasSize(2);
    }

    @Test
    @DisplayName("이용권이 없는 경우 — 200, 빈 목록")
    void getMyEntitlements_200_emptyList() {
        UUID memberId = UUID.randomUUID();
        AuthPrincipal principal = new AuthPrincipal(memberId.toString(), AccountType.USER, "USER", null);

        given(queryService.getMyEntitlements(memberId))
                .willReturn(new EntitlementDTO.ResponseEntitlementList(Map.of(), List.of()));

        ResponseEntity<ApiResponse<EntitlementDTO.ResponseEntitlementList>> response =
                controller.getMyEntitlements(principal);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().getData().entitlements()).isEmpty();
    }

    @Test
    @DisplayName("productCode · planType · serviceAvailable 필드 포함 검증")
    void getMyEntitlements_responseFields() {
        UUID memberId = UUID.randomUUID();
        AuthPrincipal principal = new AuthPrincipal(memberId.toString(), AccountType.USER, "USER", null);

        EntitlementDTO.EntitlementItem item = new EntitlementDTO.EntitlementItem(
                "document-coaching", "FREE", 0, "USED", null,
                false, "SUBSCRIPTION_REQUIRED",
                null, null, null, null, null, null);
        given(queryService.getMyEntitlements(memberId))
                .willReturn(new EntitlementDTO.ResponseEntitlementList(
                        Map.of("document-coaching", false), List.of(item)));

        ResponseEntity<ApiResponse<EntitlementDTO.ResponseEntitlementList>> response =
                controller.getMyEntitlements(principal);

        EntitlementDTO.EntitlementItem returned = response.getBody().getData().entitlementDetails().get(0);
        assertThat(returned.productCode()).isEqualTo("document-coaching");
        assertThat(returned.planType()).isEqualTo("FREE");
        assertThat(returned.freeRemaining()).isZero();
        assertThat(returned.freeUsageStatus()).isEqualTo("USED");
        assertThat(returned.serviceAvailable()).isFalse();
        assertThat(returned.unavailableReason()).isEqualTo("SUBSCRIPTION_REQUIRED");
    }

    private EntitlementDTO.EntitlementItem freeItem(
            String productCode, int freeRemaining, String freeUsageStatus,
            boolean serviceAvailable, String unavailableReason) {
        return new EntitlementDTO.EntitlementItem(
                productCode, "FREE", freeRemaining, freeUsageStatus, null,
                serviceAvailable, unavailableReason,
                null, null, null, null, null, null);
    }
}
