package kr.co.carrer.user.billing.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.user.billing.dto.BillingDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.UUID;

@Tag(name = "User Subscriptions", description = "내 구독 및 월 사용량 조회 API")
public interface SubscriptionControllerDocs {

    @Operation(summary = "내 구독 목록 조회")
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<BillingDTO.ResponseSubscriptionList>> getMySubscriptions(
            @AuthenticationPrincipal AuthPrincipal principal);

    @Operation(summary = "내 월 사용량 조회")
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<BillingDTO.ResponseUsageList>> getMyUsages(
            @AuthenticationPrincipal AuthPrincipal principal);

    @Operation(summary = "구독 해지 예약", description = "ACTIVE 구독을 CANCEL_SCHEDULED로 전이합니다. 현재 기간 종료 후 EXPIRED됩니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "해지 예약 성공"),
            @ApiResponse(responseCode = "404", description = "구독 없음 또는 본인 소유 아님"),
            @ApiResponse(responseCode = "409", description = "해지 불가 상태 (ACTIVE가 아님)")
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<BillingDTO.ResponseCancelSubscription>> cancelSubscription(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable UUID subscriptionId);
}
