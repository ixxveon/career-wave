package kr.co.carrer.user.billing.service;

import kr.co.carrer.user.billing.entity.Subscription;
import kr.co.carrer.user.billing.repository.SubscriptionRepository;
import kr.co.carrer.user.billing.scheduler.RenewalRetryScheduler;
import kr.co.carrer.user.billing.type.SubscriptionStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.time.Clock;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RenewalRetryScheduleTest {

    @Mock SubscriptionRepository subscriptionRepository;
    @Mock SubscriptionRenewalService subscriptionRenewalService;

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private RenewalRetryScheduler scheduler(Clock clock) {
        return new RenewalRetryScheduler(subscriptionRepository, subscriptionRenewalService, clock);
    }

    // ── 1차 재시도 (retryCount=0, paymentFailedAt + 1일) ───────────────────

    @Test
    @DisplayName("실패 당일(retryCount=0) — 1차 재시도 미실행")
    void retry_sameDay_noRetry() {
        ZonedDateTime failedAt = ZonedDateTime.of(2026, 6, 20, 10, 0, 0, 0, KST);
        ZonedDateTime now = failedAt;
        Subscription sub = failedSub(0, failedAt);
        given(subscriptionRepository.findPaymentFailedSubscriptions(SubscriptionStatus.PAYMENT_FAILED))
                .willReturn(List.of(sub));

        scheduler(fixedClock(now)).retryFailedRenewals();

        verify(subscriptionRenewalService, never()).processRenewal(any(), anyInt());
    }

    @Test
    @DisplayName("+1일 직전(retryCount=0) — 1차 재시도 미실행")
    void retry_beforeFirstRetryTime_noRetry() {
        ZonedDateTime failedAt = ZonedDateTime.of(2026, 6, 20, 10, 0, 0, 0, KST);
        ZonedDateTime now = failedAt.plusDays(1).minusSeconds(1);
        Subscription sub = failedSub(0, failedAt);
        given(subscriptionRepository.findPaymentFailedSubscriptions(SubscriptionStatus.PAYMENT_FAILED))
                .willReturn(List.of(sub));

        scheduler(fixedClock(now)).retryFailedRenewals();

        verify(subscriptionRenewalService, never()).processRenewal(any(), anyInt());
    }

    @Test
    @DisplayName("정확히 +1일(retryCount=0) — 1차 재시도(attemptSequence=1) 실행")
    void retry_exactlyPlusOneDay_firstRetry() {
        ZonedDateTime failedAt = ZonedDateTime.of(2026, 6, 20, 10, 0, 0, 0, KST);
        ZonedDateTime now = failedAt.plusDays(1);
        Subscription sub = failedSub(0, failedAt);
        given(subscriptionRepository.findPaymentFailedSubscriptions(SubscriptionStatus.PAYMENT_FAILED))
                .willReturn(List.of(sub));

        scheduler(fixedClock(now)).retryFailedRenewals();

        verify(subscriptionRenewalService).processRenewal(sub, 1);
    }

    // ── 2차 재시도 (retryCount=1, paymentFailedAt + 3일) ───────────────────

    @Test
    @DisplayName("+3일 직전(retryCount=1) — 2차 재시도 미실행")
    void retry_beforeSecondRetryTime_noRetry() {
        ZonedDateTime failedAt = ZonedDateTime.of(2026, 6, 20, 10, 0, 0, 0, KST);
        ZonedDateTime now = failedAt.plusDays(3).minusSeconds(1);
        Subscription sub = failedSub(1, failedAt);
        given(subscriptionRepository.findPaymentFailedSubscriptions(SubscriptionStatus.PAYMENT_FAILED))
                .willReturn(List.of(sub));

        scheduler(fixedClock(now)).retryFailedRenewals();

        verify(subscriptionRenewalService, never()).processRenewal(any(), anyInt());
    }

    @Test
    @DisplayName("정확히 +3일(retryCount=1) — 2차 재시도(attemptSequence=2) 실행")
    void retry_exactlyPlusThreeDays_secondRetry() {
        ZonedDateTime failedAt = ZonedDateTime.of(2026, 6, 20, 10, 0, 0, 0, KST);
        ZonedDateTime now = failedAt.plusDays(3);
        Subscription sub = failedSub(1, failedAt);
        given(subscriptionRepository.findPaymentFailedSubscriptions(SubscriptionStatus.PAYMENT_FAILED))
                .willReturn(List.of(sub));

        scheduler(fixedClock(now)).retryFailedRenewals();

        verify(subscriptionRenewalService).processRenewal(sub, 2);
    }

    @Test
    @DisplayName("retryCount=0, +1일 경과 — 1차 시도(attemptSequence=1), 3일 기준 미적용")
    void retry_retryCount0_afterOneDay_onlyFirstRetry() {
        ZonedDateTime failedAt = ZonedDateTime.of(2026, 6, 20, 10, 0, 0, 0, KST);
        ZonedDateTime now = failedAt.plusDays(2);
        Subscription sub = failedSub(0, failedAt);
        given(subscriptionRepository.findPaymentFailedSubscriptions(SubscriptionStatus.PAYMENT_FAILED))
                .willReturn(List.of(sub));

        scheduler(fixedClock(now)).retryFailedRenewals();

        verify(subscriptionRenewalService).processRenewal(sub, 1);
    }

    // ── Asia/Seoul 기준 검증 ────────────────────────────────────────────────

    @Test
    @DisplayName("Asia/Seoul 기준 — UTC +1일 도달이어도 KST 미도달이면 재시도 없음")
    void retry_utcPlusOneDay_butKstNotReached_noRetry() {
        // failedAt: KST 2026-06-20 23:30 = UTC 2026-06-20 14:30
        ZonedDateTime failedAt = ZonedDateTime.of(2026, 6, 20, 23, 30, 0, 0, KST);
        // now: UTC +1일 지났지만 KST 기준으로는 아직 failedAt+1d 미도달
        // KST 2026-06-21 23:29 = failedAt + 23h59m
        ZonedDateTime now = failedAt.plusHours(23).plusMinutes(59);
        Subscription sub = failedSub(0, failedAt);
        given(subscriptionRepository.findPaymentFailedSubscriptions(SubscriptionStatus.PAYMENT_FAILED))
                .willReturn(List.of(sub));

        scheduler(fixedClock(now)).retryFailedRenewals();

        verify(subscriptionRenewalService, never()).processRenewal(any(), anyInt());
    }

    // ── 월말·윤년 경계 ──────────────────────────────────────────────────────

    @Test
    @DisplayName("월말 경계 — 1월 31일 실패 후 2월 1일 1차 재시도")
    void retry_monthBoundary_jan31FailedFeb1Retry() {
        ZonedDateTime failedAt = ZonedDateTime.of(2026, 1, 31, 12, 0, 0, 0, KST);
        ZonedDateTime now = ZonedDateTime.of(2026, 2, 1, 12, 0, 0, 0, KST);
        Subscription sub = failedSub(0, failedAt);
        given(subscriptionRepository.findPaymentFailedSubscriptions(SubscriptionStatus.PAYMENT_FAILED))
                .willReturn(List.of(sub));

        scheduler(fixedClock(now)).retryFailedRenewals();

        verify(subscriptionRenewalService).processRenewal(sub, 1);
    }

    @Test
    @DisplayName("윤년 경계 — 2월 28일 실패 후 3월 1일 1차 재시도 (2026년 평년)")
    void retry_leapYearBoundary_feb28FailedMar1Retry() {
        ZonedDateTime failedAt = ZonedDateTime.of(2026, 2, 28, 12, 0, 0, 0, KST);
        ZonedDateTime now = ZonedDateTime.of(2026, 3, 1, 12, 0, 0, 0, KST);
        Subscription sub = failedSub(0, failedAt);
        given(subscriptionRepository.findPaymentFailedSubscriptions(SubscriptionStatus.PAYMENT_FAILED))
                .willReturn(List.of(sub));

        scheduler(fixedClock(now)).retryFailedRenewals();

        verify(subscriptionRenewalService).processRenewal(sub, 1);
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private Subscription failedSub(int retryCount, ZonedDateTime failedAt) {
        ZonedDateTime now = failedAt;
        Subscription s = Subscription.create(UUID.randomUUID(), 1L, now.minusDays(30), now);
        setField(s, "subscriptionId", UUID.randomUUID());
        s.markPaymentFailed();
        setField(s, "paymentFailedAt", failedAt);
        for (int i = 0; i < retryCount; i++) s.incrementRetryCount();
        return s;
    }

    private Clock fixedClock(ZonedDateTime time) {
        return Clock.fixed(time.toInstant(), time.getZone());
    }

    private void setField(Object target, String name, Object value) {
        try {
            Class<?> clazz = target.getClass();
            while (clazz != null) {
                try {
                    Field field = clazz.getDeclaredField(name);
                    field.setAccessible(true);
                    field.set(target, value);
                    return;
                } catch (NoSuchFieldException e) {
                    clazz = clazz.getSuperclass();
                }
            }
            throw new NoSuchFieldException(name);
        } catch (ReflectiveOperationException e) {
            throw new AssertionError(e);
        }
    }
}
