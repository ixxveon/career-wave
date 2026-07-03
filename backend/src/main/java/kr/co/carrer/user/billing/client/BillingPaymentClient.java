package kr.co.carrer.user.billing.client;

import kr.co.carrer.user.billing.client.dto.TossBillingPaymentResponse;

// billingKey 기반 자동결제(최초/매월) 게이트웨이 — 실 구현(TossBillingPaymentClient) 또는 데모 mock(MockBillingPaymentClient)이
// toss.mock 프로퍼티에 따라 하나만 주입된다.
public interface BillingPaymentClient {

    TossBillingPaymentResponse pay(String plainBillingKey,
                                   String customerKey, String customerEmail, String customerName,
                                   String orderId, String orderName, int amount);
}
