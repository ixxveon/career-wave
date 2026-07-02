package kr.co.carrer.user.billing.client.mock;

import kr.co.carrer.user.billing.client.BillingPaymentClient;
import kr.co.carrer.user.billing.client.dto.TossBillingPaymentResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;

// 데모 전용 — 최초/매월 자동결제 호출을 대체한다.
// toss.mock=true 일 때만 주입되며, 항상 DONE 을 동기 반환한다.
// (orderId/amount/KRW 를 그대로 echo → confirm 단계의 금액·주문번호·통화 검증 통과)
@Slf4j
@Component
@ConditionalOnProperty(name = "toss.mock", havingValue = "true")
public class MockBillingPaymentClient implements BillingPaymentClient {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    @Override
    public TossBillingPaymentResponse pay(String plainBillingKey,
                                          String customerKey, String customerEmail, String customerName,
                                          String orderId, String orderName, int amount) {
        log.info("[TOSS-MOCK] 자동결제 승인(DONE): orderId={}, orderName={}, amount={}", orderId, orderName, amount);
        return new TossBillingPaymentResponse(
                "mock_pk_" + UUID.randomUUID().toString().replace("-", ""),
                orderId,
                "DONE",
                amount,
                "KRW",
                ZonedDateTime.now(KST)
        );
    }
}
