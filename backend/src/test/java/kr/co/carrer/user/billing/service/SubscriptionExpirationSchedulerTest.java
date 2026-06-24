package kr.co.carrer.user.billing.service;

import kr.co.carrer.user.billing.entity.Subscription;
import kr.co.carrer.user.billing.repository.SubscriptionRepository;
import kr.co.carrer.user.billing.scheduler.SubscriptionExpirationScheduler;
import kr.co.carrer.user.billing.type.SubscriptionStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class SubscriptionExpirationSchedulerTest {

    @Mock SubscriptionRepository subscriptionRepository;

    private SubscriptionExpirationScheduler scheduler;
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private final UUID memberId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(Instant.now(), KST);
        scheduler = new SubscriptionExpirationScheduler(subscriptionRepository, clock);
    }

    @Test
    @DisplayName("periodEnd 도달 CANCEL_SCHEDULED 구독 — EXPIRED 전이")
    void expireCancelScheduled_periodEndReached_expired() {
        ZonedDateTime now = ZonedDateTime.now(KST);
        Subscription sub = cancelScheduledSubscription(now.minusDays(1));
        given(subscriptionRepository.findExpiredCancelScheduled(any(), any())).willReturn(List.of(sub));

        scheduler.expireCancelScheduled();

        assertThat(sub.getSubscriptionStatus()).isEqualTo(SubscriptionStatus.EXPIRED);
        assertThat(sub.isAutoRenew()).isFalse();
        assertThat(sub.getNextBillingAt()).isNull();
    }

    @Test
    @DisplayName("periodEnd 미도달 — 조회 결과 없음, 상태 변경 없음")
    void expireCancelScheduled_periodEndNotReached_noChange() {
        given(subscriptionRepository.findExpiredCancelScheduled(any(), any())).willReturn(List.of());

        scheduler.expireCancelScheduled();

        verify(subscriptionRepository, never()).save(any());
    }

    @Test
    @DisplayName("여러 CANCEL_SCHEDULED 구독 — 전부 EXPIRED 전이")
    void expireCancelScheduled_multiple_allExpired() {
        ZonedDateTime now = ZonedDateTime.now(KST);
        Subscription sub1 = cancelScheduledSubscription(now.minusHours(1));
        Subscription sub2 = cancelScheduledSubscription(now.minusDays(5));
        given(subscriptionRepository.findExpiredCancelScheduled(any(), any())).willReturn(List.of(sub1, sub2));

        scheduler.expireCancelScheduled();

        assertThat(sub1.getSubscriptionStatus()).isEqualTo(SubscriptionStatus.EXPIRED);
        assertThat(sub2.getSubscriptionStatus()).isEqualTo(SubscriptionStatus.EXPIRED);
    }

    @Test
    @DisplayName("periodEnd 정확히 현재 시각 — EXPIRED 전이 (경계 포함)")
    void expireCancelScheduled_exactBoundary_expired() {
        ZonedDateTime now = ZonedDateTime.now(KST);
        Subscription sub = cancelScheduledSubscription(now);
        given(subscriptionRepository.findExpiredCancelScheduled(any(), any())).willReturn(List.of(sub));

        scheduler.expireCancelScheduled();

        assertThat(sub.getSubscriptionStatus()).isEqualTo(SubscriptionStatus.EXPIRED);
    }

    @Test
    @DisplayName("Asia/Seoul 기준 — UTC 자정이어도 KST로 판단")
    void expireCancelScheduled_kstTimezone() {
        // KST=2026-01-01T09:00 기준 Clock 고정
        ZonedDateTime kstMidnight = ZonedDateTime.of(2026, 1, 1, 0, 0, 0, 0, KST);
        Clock kstClock = Clock.fixed(kstMidnight.toInstant(), KST);
        scheduler = new SubscriptionExpirationScheduler(subscriptionRepository, kstClock);

        Subscription sub = cancelScheduledSubscription(kstMidnight.minusMinutes(1));
        given(subscriptionRepository.findExpiredCancelScheduled(any(), any())).willReturn(List.of(sub));

        scheduler.expireCancelScheduled();

        assertThat(sub.getSubscriptionStatus()).isEqualTo(SubscriptionStatus.EXPIRED);
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private Subscription cancelScheduledSubscription(ZonedDateTime periodEnd) {
        ZonedDateTime start = periodEnd.minusDays(30);
        Subscription s = Subscription.create(memberId, 1L, start, periodEnd.plusDays(1));
        setField(s, "subscriptionId", UUID.randomUUID());
        setField(s, "subscriptionStatus", SubscriptionStatus.CANCEL_SCHEDULED);
        setField(s, "currentPeriodEnd", periodEnd);
        setField(s, "autoRenew", false);
        return s;
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
