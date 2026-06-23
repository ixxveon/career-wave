package kr.co.carrer.user.billing.controller;

import jakarta.validation.Valid;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.user.billing.docs.UserBillingPaymentControllerDocs;
import kr.co.carrer.user.billing.dto.BillingDTO;
import kr.co.carrer.user.billing.service.UserCheckoutOrderService;
import kr.co.carrer.user.billing.service.UserOrderQueryService;
import kr.co.carrer.user.billing.service.UserPaymentConfirmService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/user/billing")
@RequiredArgsConstructor
@PreAuthorize("hasRole('USER')")
public class UserBillingPaymentController implements UserBillingPaymentControllerDocs {

    private final UserCheckoutOrderService checkoutOrderService;
    private final UserPaymentConfirmService paymentConfirmService;
    private final UserOrderQueryService orderQueryService;

    @Override
    @PostMapping("/checkout/orders")
    public ResponseEntity<ApiResponse<BillingDTO.CreateOrderResponse>> createOrder(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody BillingDTO.CreateOrderRequest request
    ) {
        UUID memberId = UUID.fromString(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(
                "결제 주문이 생성되었습니다.",
                checkoutOrderService.createOrder(memberId, request)
        ));
    }

    @Override
    @PostMapping("/payments/confirm")
    public ResponseEntity<ApiResponse<BillingDTO.ConfirmPaymentResponse>> confirmPayment(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody BillingDTO.ConfirmPaymentRequest request
    ) {
        UUID memberId = UUID.fromString(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(
                "결제가 완료되었습니다.",
                paymentConfirmService.confirm(memberId, request)
        ));
    }

    @Override
    @PostMapping("/payments/fail")
    public ResponseEntity<ApiResponse<BillingDTO.RecordPaymentFailResponse>> recordPaymentFail(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody BillingDTO.RecordPaymentFailRequest request
    ) {
        UUID memberId = UUID.fromString(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(
                "결제 실패가 기록되었습니다.",
                paymentConfirmService.recordFail(memberId, request)
        ));
    }

    @Override
    @GetMapping("/payments/orders/{orderId}")
    public ResponseEntity<ApiResponse<BillingDTO.PaymentStatusResponse>> getOrderStatus(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable String orderId
    ) {
        UUID memberId = UUID.fromString(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(
                "주문 상태를 조회했습니다.",
                orderQueryService.getOrderStatus(memberId, orderId)
        ));
    }
}
