package kr.co.carrer.admin.payment.client.mock;

import kr.co.carrer.admin.payment.client.PaymentCancelClient;
import kr.co.carrer.admin.payment.client.dto.TossCancelResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

// 데모 전용 — 실제 Toss 결제 취소 호출을 대체한다.
// toss.mock=true 일 때만 주입되며, 항상 CANCELED 를 동기 반환한다.
@Slf4j
@Component
@ConditionalOnProperty(name = "toss.mock", havingValue = "true")
public class MockPaymentCancelClient implements PaymentCancelClient {

    @Override
    public TossCancelResponse cancel(String paymentKey, String cancelReason, int cancelAmount) {
        log.info("[TOSS-MOCK] 결제 취소(CANCELED): paymentKey={}, cancelAmount={}", paymentKey, cancelAmount);
        return new TossCancelResponse(paymentKey, "CANCELED");
    }
}
