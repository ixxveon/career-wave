package kr.co.carrer.user.billing.controller;

import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.user.billing.docs.SubscriptionControllerDocs;
import kr.co.carrer.user.billing.dto.BillingDTO;
import kr.co.carrer.user.billing.service.CancelSubscriptionService;
import kr.co.carrer.user.billing.service.SubscriptionQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/user/subscriptions")
@RequiredArgsConstructor
@PreAuthorize("hasRole('USER')")
public class SubscriptionController implements SubscriptionControllerDocs {

    private final SubscriptionQueryService subscriptionQueryService;
    private final CancelSubscriptionService cancelSubscriptionService;

    @Override
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<BillingDTO.ResponseSubscriptionList>> getMySubscriptions(
            @AuthenticationPrincipal AuthPrincipal principal
    ) {
        UUID memberId = UUID.fromString(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(
                "구독 정보를 조회했습니다.",
                subscriptionQueryService.getMySubscriptions(memberId)
        ));
    }

    @Override
    @GetMapping("/me/usages")
    public ResponseEntity<ApiResponse<BillingDTO.ResponseUsageList>> getMyUsages(
            @AuthenticationPrincipal AuthPrincipal principal
    ) {
        UUID memberId = UUID.fromString(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(
                "사용량을 조회했습니다.",
                subscriptionQueryService.getMyUsages(memberId)
        ));
    }

    @Override
    @PostMapping("/{subscriptionId}/cancel")
    public ResponseEntity<ApiResponse<BillingDTO.ResponseCancelSubscription>> cancelSubscription(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable UUID subscriptionId
    ) {
        UUID memberId = UUID.fromString(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(
                "구독 해지가 예약되었습니다.",
                cancelSubscriptionService.cancel(memberId, subscriptionId)
        ));
    }
}
