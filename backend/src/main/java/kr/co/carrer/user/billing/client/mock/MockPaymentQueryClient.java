package kr.co.carrer.user.billing.client.mock;

import kr.co.carrer.user.billing.client.PaymentQueryClient;
import kr.co.carrer.user.billing.client.dto.TossBillingPaymentResponse;
import kr.co.carrer.user.billing.repository.UserPaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Optional;
import java.util.UUID;

// 데모 전용 — 대사(reconciliation) 조회 대체.
// mock 의 pay 는 항상 DONE 을 동기 반환하므로 RECONCILING 상태 자체가 생기지 않아 실제로는 호출되지 않는
// 데드패스지만, 계약 완결 + 방어를 위해 실제 주문 금액을 echo 하여 금액 불일치 가능성을 없앤다.
@Slf4j
@Component
@ConditionalOnProperty(name = "toss.mock", havingValue = "true")
@RequiredArgsConstructor
public class MockPaymentQueryClient implements PaymentQueryClient {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private final UserPaymentRepository userPaymentRepository;

    @Override
    public Optional<TossBillingPaymentResponse> queryByOrderId(String orderId) {
        // 하드코딩 대신 실제 주문 금액을 조회해 반환 (주문 없으면 0 fallback)
        int amount = userPaymentRepository.findByOrderId(orderId)
                .map(p -> p.getAmount())
                .orElse(0);
        log.info("[TOSS-MOCK] 결제 조회(DONE): orderId={}, amount={}", orderId, amount);
        return Optional.of(new TossBillingPaymentResponse(
                "mock_pk_" + UUID.randomUUID().toString().replace("-", ""),
                orderId,
                "DONE",
                amount,
                "KRW",
                ZonedDateTime.now(KST)
        ));
    }
}
