package kr.co.carrer.user.billing.scheduler;

import kr.co.carrer.user.billing.entity.Subscription;
import kr.co.carrer.user.billing.repository.SubscriptionRepository;
import kr.co.carrer.user.billing.service.SubscriptionRenewalService;
import kr.co.carrer.user.billing.type.SubscriptionStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

// nextBillingAt 도달 ACTIVE 구독 자동결제 — 매시 정각 Asia/Seoul 기준
@Slf4j
@Component
@RequiredArgsConstructor
public class SubscriptionRenewalScheduler {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private final SubscriptionRepository subscriptionRepository;
    private final SubscriptionRenewalService subscriptionRenewalService;
    private final Clock clock;

    @Scheduled(cron = "0 0 * * * *", zone = "Asia/Seoul")
    public void renewDueSubscriptions() {
        ZonedDateTime now = ZonedDateTime.now(clock).withZoneSameInstant(KST);
        List<Subscription> due = subscriptionRepository.findDueBillings(SubscriptionStatus.ACTIVE, now);
        if (due.isEmpty()) return;

        log.info("자동결제 대상 {}건 처리 시작", due.size());
        int success = 0;
        for (Subscription sub : due) {
            try {
                subscriptionRenewalService.processRenewal(sub, 0);
                success++;
            } catch (Exception e) {
                log.warn("자동결제 처리 실패: subscriptionId={}", sub.getSubscriptionId());
            }
        }
        log.info("자동결제 완료: 성공={}/{}", success, due.size());
    }
}
