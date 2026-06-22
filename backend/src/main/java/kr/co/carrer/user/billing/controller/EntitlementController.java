package kr.co.carrer.user.billing.controller;

import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.user.billing.docs.EntitlementControllerDocs;
import kr.co.carrer.user.billing.dto.EntitlementDTO;
import kr.co.carrer.user.billing.service.EntitlementQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/user/subscriptions/me")
@RequiredArgsConstructor
public class EntitlementController implements EntitlementControllerDocs {

    private final EntitlementQueryService entitlementQueryService;

    @GetMapping("/entitlements")
    public ResponseEntity<ApiResponse<EntitlementDTO.ResponseEntitlementList>> getMyEntitlements(
            @AuthenticationPrincipal AuthPrincipal principal
    ) {
        UUID memberId = UUID.fromString(principal.getId());
        EntitlementDTO.ResponseEntitlementList result = entitlementQueryService.getMyEntitlements(memberId);
        return ResponseEntity.ok(ApiResponse.ok("이용권 목록 조회 성공", result));
    }
}
