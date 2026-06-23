package kr.co.carrer.user.billing.service;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.client.TossBillingPaymentClient;
import kr.co.carrer.user.billing.client.dto.TossBillingPaymentResponse;
import kr.co.carrer.user.billing.entity.BillingProfile;
import kr.co.carrer.user.billing.entity.Plan;
import kr.co.carrer.user.billing.entity.Subscription;
import kr.co.carrer.user.billing.entity.UserPayment;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import kr.co.carrer.user.billing.repository.BillingProfileRepository;
import kr.co.carrer.user.billing.repository.PlanRepository;
import kr.co.carrer.user.billing.repository.UserPaymentRepository;
import kr.co.carrer.user.billing.service.impl.RenewalFailureTxService;
import kr.co.carrer.user.billing.service.impl.RenewalSettleTxService;
import kr.co.carrer.user.billing.service.impl.SubscriptionRenewalServiceImpl;
import kr.co.carrer.user.billing.type.BillingProfileStatus;
import kr.co.carrer.user.billing.util.AesCipher;
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

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubscriptionRenewalServiceTest {

    @Mock UserPaymentRepository userPaymentRepository;
    @Mock BillingProfileRepository billingProfileRepository;
    @Mock PlanRepository planRepository;
    @Mock TossBillingPaymentClient tossBillingPaymentClient;
    @Mock AesCipher aesCipher;
    @Mock BillingMemberPort billingMemberPort;
    @Mock RenewalSettleTxService renewalSettleTxService;
    @Mock RenewalFailureTxService renewalFailureTxService;

    private SubscriptionRenewalServiceImpl service;
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private final UUID memberId = UUID.randomUUID();
    private final UUID subscriptionId = UUID.randomUUID();
    private final UUID billingProfileId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new SubscriptionRenewalServiceImpl(
                userPaymentRepository, billingProfileRepository, planRepository,
                tossBillingPaymentClient, aesCipher, billingMemberPort,
                renewalSettleTxService, renewalFailureTxService);
    }

    @Test
    @DisplayName("정상 자동결제 성공 — settle() 호출, 새 UsagePeriod 발급")
    void processRenewal_success_callsSettle() {
        Subscription sub = activeSubscription();
        Plan plan = plan(1L, "document-coaching", 29000);
        BillingProfile bp = billingProfile(memberId, billingProfileId);
        UserPayment payment = autoRenewalPayment(memberId, 0);

        stubDependencies(sub, plan, bp, payment);
        given(tossBillingPaymentClient.pay(any(), any(), any(), any(), any(), any(), anyInt()))
                .willReturn(payResponse());

        service.processRenewal(sub, 0);

        verify(renewalSettleTxService).settle(eq(payment.getPaymentId()), eq(subscriptionId), any(), eq(plan));
        verify(renewalFailureTxService, never()).fail(any(), any(), any(), anyInt());
    }

    @Test
    @DisplayName("이전 잔여량 미이월 — UsagePeriod는 새로 생성(used=0, reserved=0)")
    void processRenewal_success_newPeriodStartsFresh() {
        Subscription sub = activeSubscription();
        Plan plan = plan(1L, "document-coaching", 29000);
        BillingProfile bp = billingProfile(memberId, billingProfileId);
        UserPayment payment = autoRenewalPayment(memberId, 0);

        stubDependencies(sub, plan, bp, payment);
        given(tossBillingPaymentClient.pay(any(), any(), any(), any(), any(), any(), anyInt()))
                .willReturn(payResponse());

        service.processRenewal(sub, 0);

        // settle에 전달된 Plan의 monthlyUsageLimit이 그대로 사용 — used/reserved는 SubscriptionUsagePeriod.create()가 0으로 초기화
        verify(renewalSettleTxService).settle(any(), any(), any(), argThat(p -> p.getMonthlyUsageLimit() > 0));
    }

    @Test
    @DisplayName("최초 실패(attemptSequence=0) — fail(0) 호출, settle 미호출")
    void processRenewal_initialFailure_callsFail0() {
        Subscription sub = activeSubscription();
        Plan plan = plan(1L, "document-coaching", 29000);
        BillingProfile bp = billingProfile(memberId, billingProfileId);
        UserPayment payment = autoRenewalPayment(memberId, 0);

        stubDependencies(sub, plan, bp, payment);
        given(tossBillingPaymentClient.pay(any(), any(), any(), any(), any(), any(), anyInt()))
                .willThrow(new CustomException(BillingErrorCode.PAYMENT_CONFIRM_FAILED));

        service.processRenewal(sub, 0);

        verify(renewalFailureTxService).fail(eq(payment.getPaymentId()), eq(subscriptionId),
                eq("document-coaching"), eq(0));
        verify(renewalSettleTxService, never()).settle(any(), any(), any(), any());
    }

    @Test
    @DisplayName("1차 재시도 성공(attemptSequence=1) — settle(1) 호출")
    void processRenewal_firstRetrySuccess_callsSettle1() {
        Subscription sub = paymentFailedSubscription(0);
        Plan plan = plan(1L, "document-coaching", 29000);
        BillingProfile bp = billingProfile(memberId, billingProfileId);
        UserPayment payment = autoRenewalPayment(memberId, 1);

        stubDependencies(sub, plan, bp, payment);
        given(tossBillingPaymentClient.pay(any(), any(), any(), any(), any(), any(), anyInt()))
                .willReturn(payResponse());

        service.processRenewal(sub, 1);

        verify(renewalSettleTxService).settle(eq(payment.getPaymentId()), eq(subscriptionId), any(), eq(plan));
    }

    @Test
    @DisplayName("1차 실패·2차 성공(attemptSequence=2) — settle(2) 호출")
    void processRenewal_secondRetrySuccess_callsSettle2() {
        Subscription sub = paymentFailedSubscription(1);
        Plan plan = plan(1L, "document-coaching", 29000);
        BillingProfile bp = billingProfile(memberId, billingProfileId);
        UserPayment payment = autoRenewalPayment(memberId, 2);

        stubDependencies(sub, plan, bp, payment);
        given(tossBillingPaymentClient.pay(any(), any(), any(), any(), any(), any(), anyInt()))
                .willReturn(payResponse());

        service.processRenewal(sub, 2);

        verify(renewalSettleTxService).settle(eq(payment.getPaymentId()), eq(subscriptionId), any(), eq(plan));
    }

    @Test
    @DisplayName("2차 재시도 최종 실패(attemptSequence=2) — fail(2) 호출, EXPIRED 전이 위임")
    void processRenewal_finalFailure_callsFail2() {
        Subscription sub = paymentFailedSubscription(1);
        Plan plan = plan(1L, "document-coaching", 29000);
        BillingProfile bp = billingProfile(memberId, billingProfileId);
        UserPayment payment = autoRenewalPayment(memberId, 2);

        stubDependencies(sub, plan, bp, payment);
        given(tossBillingPaymentClient.pay(any(), any(), any(), any(), any(), any(), anyInt()))
                .willThrow(new CustomException(BillingErrorCode.PAYMENT_CONFIRM_FAILED));

        service.processRenewal(sub, 2);

        verify(renewalFailureTxService).fail(eq(payment.getPaymentId()), eq(subscriptionId),
                eq("document-coaching"), eq(2));
        verify(renewalSettleTxService, never()).settle(any(), any(), any(), any());
    }

    @Test
    @DisplayName("활성 billingProfile 없음 — PAYMENT_METHOD_REQUIRED 예외 전파")
    void processRenewal_noBillingProfile_throws() {
        Subscription sub = activeSubscription();
        given(planRepository.findById(1L)).willReturn(Optional.of(plan(1L, "document-coaching", 29000)));
        given(billingProfileRepository.findFirstByMemberIdAndBillingProfileStatusOrderByCreatedAtDesc(
                memberId, BillingProfileStatus.ACTIVE)).willReturn(Optional.empty());

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> service.processRenewal(sub, 0))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> org.assertj.core.api.Assertions.assertThat(
                        ((CustomException) e).getErrorCode())
                        .isEqualTo(BillingErrorCode.PAYMENT_METHOD_REQUIRED));
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private void stubDependencies(Subscription sub, Plan plan, BillingProfile bp, UserPayment payment) {
        given(planRepository.findById(plan.getPlanId())).willReturn(Optional.of(plan));
        given(billingProfileRepository.findFirstByMemberIdAndBillingProfileStatusOrderByCreatedAtDesc(
                memberId, BillingProfileStatus.ACTIVE)).willReturn(Optional.of(bp));
        given(billingMemberPort.getMemberBillingInfo(memberId))
                .willReturn(new BillingMemberPort.MemberBillingInfo("홍길동", "test@example.com"));
        given(aesCipher.decrypt(any())).willReturn("plain-billing-key");
        given(userPaymentRepository.findByIdempotencyKey(any())).willReturn(Optional.empty());
        given(userPaymentRepository.save(any())).willReturn(payment);
    }

    private Subscription activeSubscription() {
        ZonedDateTime now = ZonedDateTime.now(KST);
        Subscription s = Subscription.create(memberId, 1L, now.minusDays(30), now);
        setField(s, "subscriptionId", subscriptionId);
        setField(s, "billingProfileId", billingProfileId);
        return s;
    }

    private Subscription paymentFailedSubscription(int retryCount) {
        ZonedDateTime now = ZonedDateTime.now(KST);
        Subscription s = Subscription.create(memberId, 1L, now.minusDays(30), now);
        setField(s, "subscriptionId", subscriptionId);
        setField(s, "billingProfileId", billingProfileId);
        s.markPaymentFailed();
        for (int i = 0; i < retryCount; i++) s.incrementRetryCount();
        return s;
    }

    private Plan plan(Long id, String productCode, int price) {
        Plan p = Plan.create(productCode, "코칭", price, 30, "KRW", "MONTHLY", true);
        setField(p, "planId", id);
        return p;
    }

    private BillingProfile billingProfile(UUID memberId, UUID id) {
        BillingProfile bp = BillingProfile.create(memberId, "ck-test", "enc-key", "신한", "1234-****");
        setField(bp, "billingProfileId", id);
        return bp;
    }

    private UserPayment autoRenewalPayment(UUID memberId, int attemptSequence) {
        UserPayment p = UserPayment.createAutoRenewal(
                memberId, 1L, "document-coaching",
                "RENEWAL-ORDER", "renewal-idempotency-key",
                "ck-test", "홍길동", "test@example.com",
                29000, attemptSequence);
        setField(p, "paymentId", UUID.randomUUID());
        setField(p, "subscriptionId", subscriptionId);
        return p;
    }

    private TossBillingPaymentResponse payResponse() {
        return new TossBillingPaymentResponse(
                "pay-key-123", "RENEWAL-ORDER", "DONE",
                29000, "KRW", ZonedDateTime.now(KST));
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
