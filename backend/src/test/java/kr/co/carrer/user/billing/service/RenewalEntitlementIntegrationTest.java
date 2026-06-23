package kr.co.carrer.user.billing.service;

import kr.co.carrer.user.billing.entity.MemberProductEntitlement;
import kr.co.carrer.user.billing.entity.Subscription;
import kr.co.carrer.user.billing.entity.UserPayment;
import kr.co.carrer.user.billing.repository.MemberProductEntitlementRepository;
import kr.co.carrer.user.billing.repository.SubscriptionRepository;
import kr.co.carrer.user.billing.repository.UserPaymentRepository;
import kr.co.carrer.user.billing.service.impl.RenewalFailureTxService;
import kr.co.carrer.user.billing.type.PaymentFailureReason;
import kr.co.carrer.user.billing.type.PlanType;
import kr.co.carrer.user.billing.type.SubscriptionStatus;
import kr.co.carrer.user.billing.type.UserPaymentStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

// RenewalFailureTxService 의 상태 전이 통합 검증 (실제 엔티티 메서드 호출)
@ExtendWith(MockitoExtension.class)
class RenewalEntitlementIntegrationTest {

    @Mock UserPaymentRepository userPaymentRepository;
    @Mock SubscriptionRepository subscriptionRepository;
    @Mock MemberProductEntitlementRepository entitlementRepository;

    private RenewalFailureTxService failureTxService;
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private final UUID memberId = UUID.randomUUID();
    private final UUID subscriptionId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        failureTxService = new RenewalFailureTxService(
                userPaymentRepository, subscriptionRepository, entitlementRepository);
    }

    @Test
    @DisplayName("최초 실패(attemptSequence=0) — 즉시 PAYMENT_FAILED, Resume/Interview 차단")
    void fail_initialFailure_subscriptionPaymentFailed_serviceBlocked() {
        UserPayment payment = confirmingPayment(memberId, 0);
        Subscription sub = activeSubscription();

        given(userPaymentRepository.findById(payment.getPaymentId())).willReturn(Optional.of(payment));
        given(subscriptionRepository.findBySubscriptionIdForUpdate(subscriptionId))
                .willReturn(Optional.of(sub));

        failureTxService.fail(payment.getPaymentId(), subscriptionId, "document-coaching", 0);

        assertThat(payment.getPaymentStatus()).isEqualTo(UserPaymentStatus.FAILED);
        assertThat(sub.getSubscriptionStatus()).isEqualTo(SubscriptionStatus.PAYMENT_FAILED);
        assertThat(sub.getPaymentFailedAt()).isNotNull();
        assertThat(sub.getRetryCount()).isEqualTo(0);
    }

    @Test
    @DisplayName("1차 재시도 실패(attemptSequence=1) — PAYMENT_FAILED 유지, retryCount=1")
    void fail_firstRetryFailure_paymentFailedMaintained_retryCount1() {
        UserPayment payment = confirmingPayment(memberId, 1);
        Subscription sub = paymentFailedSubscription(0);

        given(userPaymentRepository.findById(payment.getPaymentId())).willReturn(Optional.of(payment));
        given(subscriptionRepository.findBySubscriptionIdForUpdate(subscriptionId))
                .willReturn(Optional.of(sub));

        failureTxService.fail(payment.getPaymentId(), subscriptionId, "document-coaching", 1);

        assertThat(payment.getPaymentStatus()).isEqualTo(UserPaymentStatus.FAILED);
        assertThat(sub.getSubscriptionStatus()).isEqualTo(SubscriptionStatus.PAYMENT_FAILED);
        assertThat(sub.getRetryCount()).isEqualTo(1);
        // paymentFailedAt 은 최초 실패 시각 유지
        assertThat(sub.getPaymentFailedAt()).isNotNull();
    }

    @Test
    @DisplayName("최종 실패(attemptSequence=2) — EXPIRED 전이, 권한 FREE 강등")
    void fail_finalFailure_expired_entitlementDeactivated() {
        UserPayment payment = confirmingPayment(memberId, 2);
        Subscription sub = paymentFailedSubscription(1);
        MemberProductEntitlement entitlement = premiumEntitlement(memberId, subscriptionId);

        given(userPaymentRepository.findById(payment.getPaymentId())).willReturn(Optional.of(payment));
        given(subscriptionRepository.findBySubscriptionIdForUpdate(subscriptionId))
                .willReturn(Optional.of(sub));
        given(entitlementRepository.findByMemberIdAndProductCodeForUpdate(memberId, "document-coaching"))
                .willReturn(Optional.of(entitlement));

        failureTxService.fail(payment.getPaymentId(), subscriptionId, "document-coaching", 2);

        assertThat(sub.getSubscriptionStatus()).isEqualTo(SubscriptionStatus.EXPIRED);
        assertThat(sub.isAutoRenew()).isFalse();
        assertThat(sub.getNextBillingAt()).isNull();
        assertThat(entitlement.getPlanType()).isEqualTo(PlanType.FREE);
        assertThat(entitlement.getActiveSubscriptionId()).isNull();
    }

    @Test
    @DisplayName("재시도 성공 이후 — ACTIVE 복구, Resume/Interview 즉시 재가용")
    void renewPeriod_afterRetrySuccess_subscriptionActiveServiceRestored() {
        Subscription sub = paymentFailedSubscription(1);
        ZonedDateTime now = ZonedDateTime.now(KST);

        sub.renewPeriod(now, now.plusDays(30));

        assertThat(sub.getSubscriptionStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
        assertThat(sub.getRetryCount()).isEqualTo(0);
        assertThat(sub.getPaymentFailedAt()).isNull();
        assertThat(sub.isAutoRenew()).isTrue();
        assertThat(sub.getNextBillingAt()).isEqualTo(now.plusDays(30));
    }

    @Test
    @DisplayName("최종 실패 이후 추가 자동결제 없음 — EXPIRED + autoRenew=false")
    void fail_afterFinalFailure_noFurtherAutoRenewal() {
        UserPayment payment = confirmingPayment(memberId, 2);
        Subscription sub = paymentFailedSubscription(1);
        MemberProductEntitlement entitlement = premiumEntitlement(memberId, subscriptionId);

        given(userPaymentRepository.findById(payment.getPaymentId())).willReturn(Optional.of(payment));
        given(subscriptionRepository.findBySubscriptionIdForUpdate(subscriptionId))
                .willReturn(Optional.of(sub));
        given(entitlementRepository.findByMemberIdAndProductCodeForUpdate(memberId, "document-coaching"))
                .willReturn(Optional.of(entitlement));

        failureTxService.fail(payment.getPaymentId(), subscriptionId, "document-coaching", 2);

        // EXPIRED + autoRenew=false → findDueBillings 쿼리 (ACTIVE 조건) + findPaymentFailedSubscriptions 쿼리 (PAYMENT_FAILED 조건) 모두 제외
        assertThat(sub.getSubscriptionStatus()).isNotEqualTo(SubscriptionStatus.ACTIVE);
        assertThat(sub.getSubscriptionStatus()).isNotEqualTo(SubscriptionStatus.PAYMENT_FAILED);
        assertThat(sub.isAutoRenew()).isFalse();
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private Subscription activeSubscription() {
        ZonedDateTime now = ZonedDateTime.now(KST);
        Subscription s = Subscription.create(memberId, 1L, now.minusDays(30), now);
        setField(s, "subscriptionId", subscriptionId);
        return s;
    }

    private Subscription paymentFailedSubscription(int retryCount) {
        Subscription s = activeSubscription();
        s.markPaymentFailed();
        for (int i = 0; i < retryCount; i++) s.incrementRetryCount();
        return s;
    }

    private UserPayment confirmingPayment(UUID memberId, int attemptSequence) {
        UserPayment p = UserPayment.createAutoRenewal(
                memberId, 1L, "document-coaching",
                "RENEWAL-ORDER", "renewal-key",
                "ck-test", "홍길동", "test@example.com",
                29000, attemptSequence);
        setField(p, "paymentId", UUID.randomUUID());
        setField(p, "subscriptionId", subscriptionId);
        return p;
    }

    private MemberProductEntitlement premiumEntitlement(UUID memberId, UUID subscriptionId) {
        MemberProductEntitlement e = MemberProductEntitlement.createFree(memberId, "document-coaching");
        e.activatePremium(subscriptionId);
        return e;
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
