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
import org.springframework.web.bind.annotation.RequestBody;

@Tag(name = "User Billing Payment", description = "결제 주문·확인·조회 API")
public interface UserBillingPaymentControllerDocs {

    @Operation(summary = "결제 주문 생성", description = "billingKey 자동결제 구독 주문을 생성합니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "주문 생성 성공"),
            @ApiResponse(responseCode = "403", description = "결제 불가 계정 상태"),
            @ApiResponse(responseCode = "404", description = "존재하지 않는 상품"),
            @ApiResponse(responseCode = "409", description = "이미 구독 중인 상품")
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<BillingDTO.CreateOrderResponse>> createOrder(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestBody BillingDTO.CreateOrderRequest request
    );

    @Operation(summary = "결제 확인", description = "Toss billingKey 발행 및 최초 결제 승인을 처리합니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "결제 성공"),
            @ApiResponse(responseCode = "400", description = "customerKey 불일치 또는 금액 불일치"),
            @ApiResponse(responseCode = "404", description = "주문 없음"),
            @ApiResponse(responseCode = "409", description = "처리 불가 주문 상태"),
            @ApiResponse(responseCode = "422", description = "Toss API 실패")
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<BillingDTO.ConfirmPaymentResponse>> confirmPayment(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestBody BillingDTO.ConfirmPaymentRequest request
    );

    @Operation(summary = "결제 실패 기록", description = "Toss redirect fail URL에서 결제 실패를 기록합니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "실패 기록 성공"),
            @ApiResponse(responseCode = "404", description = "주문 없음")
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<BillingDTO.RecordPaymentFailResponse>> recordPaymentFail(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestBody BillingDTO.RecordPaymentFailRequest request
    );

    @Operation(summary = "결제 주문 상태 조회", description = "주문 ID로 결제 상태를 조회합니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "조회 성공"),
            @ApiResponse(responseCode = "404", description = "주문 없음 또는 본인 소유 아님")
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<BillingDTO.PaymentStatusResponse>> getOrderStatus(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable String orderId
    );
}
