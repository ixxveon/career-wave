package kr.co.carrer.user.billing.scheduler;

import kr.co.carrer.user.billing.entity.Subscription;
import kr.co.carrer.user.billing.repository.SubscriptionRepository;
import kr.co.carrer.user.billing.type.SubscriptionStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

// CANCEL_SCHEDULED 구독 중 currentPeriodEnd 도달 시 EXPIRED 전이 — 5분 간격 실행
@Slf4j
@Component
@RequiredArgsConstructor
public class SubscriptionExpirationScheduler {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private final SubscriptionRepository subscriptionRepository;
    private final Clock clock;

    @Scheduled(fixedRate = 300_000)
    @Transactional
    public void expireCancelScheduled() {
        ZonedDateTime now = ZonedDateTime.now(clock).withZoneSameInstant(KST);
        List<Subscription> targets = subscriptionRepository.findExpiredCancelScheduled(
                SubscriptionStatus.CANCEL_SCHEDULED, now);
        if (targets.isEmpty()) return;

        int count = 0;
        for (Subscription sub : targets) {
            try {
                sub.expire();
                count++;
            } catch (Exception e) {
                log.warn("구독 만료 전이 실패: subscriptionId={}", sub.getSubscriptionId());
            }
        }
        if (count > 0) {
            log.info("CANCEL_SCHEDULED 구독 {}건 EXPIRED 처리 완료", count);
        }
    }
}
