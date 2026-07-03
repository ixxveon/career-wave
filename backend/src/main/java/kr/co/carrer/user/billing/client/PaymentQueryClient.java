package kr.co.carrer.user.billing.client;

import kr.co.carrer.user.billing.client.dto.TossBillingPaymentResponse;

import java.util.Optional;

// RECONCILING 대사용 결제 상태 조회 게이트웨이 — 실 구현(TossPaymentQueryClient) 또는 데모 mock(MockPaymentQueryClient)이
// toss.mock 프로퍼티에 따라 하나만 주입된다.
public interface PaymentQueryClient {

    Optional<TossBillingPaymentResponse> queryByOrderId(String orderId);
}
