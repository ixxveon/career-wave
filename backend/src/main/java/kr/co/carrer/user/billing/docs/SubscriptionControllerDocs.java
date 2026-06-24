package kr.co.carrer.user.billing.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.user.billing.dto.BillingDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

@Tag(name = "User Subscriptions", description = "내 구독 및 월 사용량 조회 API")
public interface SubscriptionControllerDocs {

    @Operation(summary = "내 구독 목록 조회")
    ResponseEntity<ApiResponse<BillingDTO.ResponseSubscriptionList>> getMySubscriptions(
            @AuthenticationPrincipal AuthPrincipal principal);

    @Operation(summary = "내 월 사용량 조회")
    ResponseEntity<ApiResponse<BillingDTO.ResponseUsageList>> getMyUsages(
            @AuthenticationPrincipal AuthPrincipal principal);
}
