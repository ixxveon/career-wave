package kr.co.carrer.user.billing.client.mock;

import jakarta.annotation.PostConstruct;
import kr.co.carrer.user.billing.client.BillingAuthorizationClient;
import kr.co.carrer.user.billing.client.dto.TossBillingAuthResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;

// 데모 전용 — Toss 자동결제(빌링) 계약 미개통 환경에서 billingKey 발급을 대체한다.
// toss.mock=true 일 때만 주입되며, 실 Toss 호출 없이 가짜 billingKey/카드정보를 반환한다.
@Slf4j
@Component
@ConditionalOnProperty(name = "toss.mock", havingValue = "true")
public class MockBillingAuthorizationClient implements BillingAuthorizationClient {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    @PostConstruct
    void warnMockEnabled() {
        log.warn("[TOSS-MOCK] billingKey 발급이 MOCK 으로 동작합니다 — 실제 결제/카드 등록 아님");
    }

    // authKey 유효성은 검증하지 않는다(프론트가 넘긴 가짜 authKey 그대로 허용).
    @Override
    public TossBillingAuthResponse issue(String authKey, String customerKey) {
        String billingKey = "mock_bk_" + UUID.randomUUID().toString().replace("-", "");
        log.info("[TOSS-MOCK] billingKey 발급: customerKey={}", customerKey);
        return new TossBillingAuthResponse(
                billingKey,
                customerKey,
                ZonedDateTime.now(KST),
                new TossBillingAuthResponse.CardInfo("모의카드(Mock)", "1234-56**-****-7890")
        );
    }
}
