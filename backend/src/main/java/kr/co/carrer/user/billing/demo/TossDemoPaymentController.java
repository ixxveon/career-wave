package kr.co.carrer.user.billing.demo;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * 데모 전용 일반결제(단건) 컨트롤러 — 토스페이 QR 결제 시연용.
 *
 * <p>기존 자동결제(빌링) 컨트롤러({@link kr.co.carrer.user.billing.controller.UserBillingPaymentController})와
 * 엔드포인트/서비스가 겹치지 않는 완전 독립 경로다. 결제 금액은 서버 고정 상수이며,
 * DB에 주문을 저장하지 않는다(confirm 시 금액이 고정 상수와 일치하는지만 검증).
 * 구독/entitlement 는 발급하지 않는다.
 */
@Tag(name = "Billing - Toss Demo", description = "데모용 일반결제(토스페이 QR) — 구독 발급 없음")
@RestController
@RequestMapping("/api/v1/user/billing/demo")
@RequiredArgsConstructor
@PreAuthorize("hasRole('USER')")
public class TossDemoPaymentController {

    @Value("${toss.demo.amount:1000}")
    private int demoAmount;

    @Value("${toss.demo.order-name:커리어웨이브 데모 결제}")
    private String demoOrderName;

    private final TossDemoPaymentClient demoPaymentClient;

    @Operation(summary = "데모 주문 생성", description = "고정 금액의 orderId 를 발급한다. 프론트가 Toss requestPayment() 에 사용한다.")
    @PostMapping("/orders")
    public ResponseEntity<ApiResponse<TossDemoDTO.ResponseCreateOrder>> createOrder() {
        String orderId = "demo_" + UUID.randomUUID().toString().replace("-", "");
        return ResponseEntity.ok(ApiResponse.ok(
                "데모 결제 주문이 생성되었습니다.",
                new TossDemoDTO.ResponseCreateOrder(orderId, demoAmount, "KRW", demoOrderName)
        ));
    }

    @Operation(summary = "데모 결제 승인", description = "Toss 성공 리다이렉트로 받은 paymentKey/orderId/amount 로 결제를 승인한다.")
    @PostMapping("/confirm")
    public ResponseEntity<ApiResponse<TossDemoDTO.ResponseConfirm>> confirm(
            @Valid @RequestBody TossDemoDTO.RequestConfirm request
    ) {
        // 금액 위·변조 방어: 클라이언트가 보낸 금액이 서버 고정 금액과 일치해야 한다.
        if (request.amount() != demoAmount) {
            throw new CustomException(BillingErrorCode.PAYMENT_AMOUNT_MISMATCH);
        }

        TossPaymentConfirmResult result = demoPaymentClient.confirm(
                request.paymentKey(), request.orderId(), request.amount());

        String easyPayProvider = result.easyPay() != null ? result.easyPay().provider() : null;
        return ResponseEntity.ok(ApiResponse.ok(
                "데모 결제가 완료되었습니다.",
                new TossDemoDTO.ResponseConfirm(
                        result.paymentKey(),
                        result.orderId(),
                        result.orderName(),
                        result.status(),
                        result.totalAmount(),
                        result.currency(),
                        result.method(),
                        easyPayProvider,
                        result.approvedAt()
                )
        ));
    }
}
