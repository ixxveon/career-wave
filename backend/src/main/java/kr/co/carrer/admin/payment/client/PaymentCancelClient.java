package kr.co.carrer.admin.payment.client;

import kr.co.carrer.admin.payment.client.dto.TossCancelResponse;

// 관리자 환불 확정 시 Toss 결제 취소 게이트웨이 — 실 구현(TossPaymentCancelClient) 또는
// 데모 mock(MockPaymentCancelClient)이 toss.mock 프로퍼티에 따라 하나만 주입된다.
public interface PaymentCancelClient {

    TossCancelResponse cancel(String paymentKey, String cancelReason, int cancelAmount);
}
