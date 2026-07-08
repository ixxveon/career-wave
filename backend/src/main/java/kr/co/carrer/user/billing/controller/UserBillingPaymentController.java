package kr.co.carrer.user.billing.controller;

import jakarta.validation.Valid;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.user.billing.docs.UserBillingPaymentControllerDocs;
import kr.co.carrer.user.billing.dto.BillingDTO;
import kr.co.carrer.user.billing.service.PaymentHistoryQueryService;
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
    private final PaymentHistoryQueryService paymentHistoryQueryService;

    @Override
    @PostMapping("/checkout/orders")
    public ResponseEntity<ApiResponse<BillingDTO.ResponseCreateOrder>> createOrder(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody BillingDTO.RequestCreateOrder request
    ) {
        UUID memberId = UUID.fromString(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(
                "결제 주문이 생성되었습니다.",
                checkoutOrderService.createOrder(memberId, request)
        ));
    }

    @Override
    @PostMapping("/payments/confirm")
    public ResponseEntity<ApiResponse<BillingDTO.ResponseConfirmPayment>> confirmPayment(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody BillingDTO.RequestConfirmPayment request
    ) {
        UUID memberId = UUID.fromString(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(
                "결제가 완료되었습니다.",
                paymentConfirmService.confirm(memberId, request)
        ));
    }

    @Override
    @PostMapping("/payments/confirm-onetime")
    public ResponseEntity<ApiResponse<BillingDTO.ResponseConfirmPayment>> confirmOneTimePayment(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody BillingDTO.RequestConfirmOneTimePayment request
    ) {
        UUID memberId = UUID.fromString(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(
                "결제가 완료되었습니다.",
                paymentConfirmService.confirmOneTime(memberId, request)
        ));
    }

    @Override
    @PostMapping("/payments/fail")
    public ResponseEntity<ApiResponse<BillingDTO.ResponseRecordPaymentFail>> recordPaymentFail(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody BillingDTO.RequestRecordPaymentFail request
    ) {
        UUID memberId = UUID.fromString(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(
                "결제 실패가 기록되었습니다.",
                paymentConfirmService.recordFail(memberId, request)
        ));
    }

    @Override
    @GetMapping("/payments/orders/{orderId}")
    public ResponseEntity<ApiResponse<BillingDTO.ResponsePaymentStatus>> getOrderStatus(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable String orderId
    ) {
        UUID memberId = UUID.fromString(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(
                "주문 상태를 조회했습니다.",
                orderQueryService.getOrderStatus(memberId, orderId)
        ));
    }

    @Override
    @GetMapping("/payments/history")
    public ResponseEntity<ApiResponse<BillingDTO.ResponsePaymentHistory>> getPaymentHistory(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam(defaultValue = "1M") String period,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        UUID memberId = UUID.fromString(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(
                "결제 내역을 조회했습니다.",
                paymentHistoryQueryService.getPaymentHistory(memberId, period, page, size)
        ));
    }
}
