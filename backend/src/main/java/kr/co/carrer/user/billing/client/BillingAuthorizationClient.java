package kr.co.carrer.user.billing.client;

import kr.co.carrer.user.billing.client.dto.TossBillingAuthResponse;

// billingKey 발행 게이트웨이 — 실 구현(TossBillingAuthorizationClient) 또는 데모 mock(MockBillingAuthorizationClient)이
// toss.mock 프로퍼티에 따라 하나만 주입된다.
public interface BillingAuthorizationClient {

    TossBillingAuthResponse issue(String authKey, String customerKey);
}
