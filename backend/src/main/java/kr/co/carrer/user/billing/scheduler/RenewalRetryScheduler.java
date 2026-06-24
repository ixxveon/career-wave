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

// PAYMENT_FAILED 구독 재시도 스케줄러
// - paymentFailedAt + 1일: 1차 재시도 (retryCount=0)
// - paymentFailedAt + 3일: 2차 재시도 (retryCount=1)
// 매시 30분 Asia/Seoul 기준 (주 스케줄러와 시간 분리)
@Slf4j
@Component
@RequiredArgsConstructor
public class RenewalRetryScheduler {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private final SubscriptionRepository subscriptionRepository;
    private final SubscriptionRenewalService subscriptionRenewalService;
    private final Clock clock;

    @Scheduled(cron = "0 30 * * * *", zone = "Asia/Seoul")
    public void retryFailedRenewals() {
        ZonedDateTime now = ZonedDateTime.now(clock).withZoneSameInstant(KST);
        List<Subscription> failed = subscriptionRepository
                .findPaymentFailedSubscriptions(SubscriptionStatus.PAYMENT_FAILED);
        if (failed.isEmpty()) return;

        int processed = 0;
        for (Subscription sub : failed) {
            try {
                int attemptSequence = resolveAttemptSequence(sub, now);
                if (attemptSequence < 0) continue;
                subscriptionRenewalService.processRenewal(sub, attemptSequence);
                processed++;
            } catch (Exception e) {
                log.warn("재시도 처리 실패: subscriptionId={}", sub.getSubscriptionId());
            }
        }
        if (processed > 0) {
            log.info("자동결제 재시도 완료: {}건", processed);
        }
    }

    // -1: 아직 재시도 시각 미도달 또는 재시도 횟수 초과
    private int resolveAttemptSequence(Subscription sub, ZonedDateTime now) {
        if (sub.getPaymentFailedAt() == null) return -1;

        ZonedDateTime failedAt = sub.getPaymentFailedAt().withZoneSameInstant(KST);
        int retryCount = sub.getRetryCount();

        if (retryCount == 0 && !now.isBefore(failedAt.plusDays(1))) {
            return 1;
        }
        if (retryCount == 1 && !now.isBefore(failedAt.plusDays(3))) {
            return 2;
        }
        return -1;
    }
}
