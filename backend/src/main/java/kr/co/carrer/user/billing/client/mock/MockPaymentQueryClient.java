package kr.co.carrer.user.billing.client.mock;

import kr.co.carrer.user.billing.client.PaymentQueryClient;
import kr.co.carrer.user.billing.client.dto.TossBillingPaymentResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Optional;
import java.util.UUID;

// 데모 전용 — 대사(reconciliation) 조회 대체.
// mock 의 pay 는 항상 DONE 을 동기 반환하므로 RECONCILING 상태 자체가 생기지 않아 실제로는 호출되지 않는
// 데드패스지만, 게이트웨이 계약을 완결하기 위해 DONE 을 반환한다.
@Slf4j
@Component
@ConditionalOnProperty(name = "toss.mock", havingValue = "true")
public class MockPaymentQueryClient implements PaymentQueryClient {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    @Override
    public Optional<TossBillingPaymentResponse> queryByOrderId(String orderId) {
        log.info("[TOSS-MOCK] 결제 조회(DONE): orderId={}", orderId);
        return Optional.of(new TossBillingPaymentResponse(
                "mock_pk_" + UUID.randomUUID().toString().replace("-", ""),
                orderId,
                "DONE",
                0,
                "KRW",
                ZonedDateTime.now(KST)
        ));
    }
}
