package kr.co.carrer.user.billing.service;

import kr.co.carrer.user.billing.entity.BillingProfile;
import kr.co.carrer.user.billing.entity.Plan;
import kr.co.carrer.user.billing.entity.Subscription;
import kr.co.carrer.user.billing.entity.UserPayment;
import kr.co.carrer.user.billing.repository.BillingProfileRepository;
import kr.co.carrer.user.billing.repository.PlanRepository;
import kr.co.carrer.user.billing.service.impl.RenewalFailureTxService;
import kr.co.carrer.user.billing.service.impl.RenewalPaymentCreateTxService;
import kr.co.carrer.user.billing.service.impl.RenewalSettleTxService;
import kr.co.carrer.user.billing.service.impl.SubscriptionRenewalServiceImpl;
import kr.co.carrer.user.billing.client.TossBillingPaymentClient;
import kr.co.carrer.user.billing.client.dto.TossBillingPaymentResponse;
import kr.co.carrer.user.billing.util.AesCipher;
import kr.co.carrer.user.billing.type.BillingProfileStatus;
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
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RenewalSchedulerConcurrencyTest {

    @Mock BillingProfileRepository billingProfileRepository;
    @Mock PlanRepository planRepository;
    @Mock TossBillingPaymentClient tossBillingPaymentClient;
    @Mock AesCipher aesCipher;
    @Mock BillingMemberPort billingMemberPort;
    @Mock RenewalPaymentCreateTxService renewalPaymentCreateTxService;
    @Mock RenewalSettleTxService renewalSettleTxService;
    @Mock RenewalFailureTxService renewalFailureTxService;

    private SubscriptionRenewalServiceImpl service;
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private final UUID memberId = UUID.randomUUID();
    private final UUID subscriptionId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new SubscriptionRenewalServiceImpl(
                billingProfileRepository, planRepository,
                tossBillingPaymentClient, aesCipher, billingMemberPort,
                renewalPaymentCreateTxService,
                renewalSettleTxService, renewalFailureTxService);
    }

    @Test
    @DisplayName("동일 idempotencyKey CONFIRMING 상태 — createIfAbsent 2회, Toss 재시도 2회")
    void processRenewal_sameIdempotencyKey_confirmingPaymentRetried() {
        Subscription sub = activeSubscription();
        Plan plan = plan(1L, "document-coaching", 29000);
        BillingProfile bp = billingProfile(memberId);
        UserPayment existingPayment = autoRenewalPayment(memberId, 0);

        given(planRepository.findById(1L)).willReturn(Optional.of(plan));
        given(billingProfileRepository.findFirstByMemberIdAndBillingProfileStatusOrderByCreatedAtDesc(
                memberId, BillingProfileStatus.ACTIVE)).willReturn(Optional.of(bp));
        given(billingMemberPort.getMemberBillingInfo(memberId))
                .willReturn(new BillingMemberPort.MemberBillingInfo("홍길동", "test@example.com"));
        given(aesCipher.decrypt(any())).willReturn("plain-key");
        // CONFIRMING 상태 — RenewalPaymentCreateTxService가 결제 객체 중복 생성을 막음
        given(renewalPaymentCreateTxService.createIfAbsent(any(), any(), any(), any(), any(), anyInt(), any()))
                .willReturn(existingPayment);
        given(tossBillingPaymentClient.pay(any(), any(), any(), any(), any(), any(), anyInt()))
                .willReturn(payResponse());

        service.processRenewal(sub, 0);
        service.processRenewal(sub, 0);

        // 결제 객체 중복 생성 방지는 RenewalPaymentCreateTxService 책임 — service는 createIfAbsent만 호출
        verify(renewalPaymentCreateTxService, times(2))
                .createIfAbsent(any(), any(), any(), any(), any(), anyInt(), any());
        verify(tossBillingPaymentClient, times(2)).pay(any(), any(), any(), any(), any(), any(), anyInt());
    }

    @Test
    @DisplayName("기존 PAID payment 반환 — Toss 중복 호출 없이 즉시 skip (멱등성 보장)")
    void processRenewal_existingPaidPayment_tossSkipped() {
        Subscription sub = activeSubscription();
        Plan plan = plan(1L, "document-coaching", 29000);
        BillingProfile bp = billingProfile(memberId);
        UserPayment paidPayment = autoRenewalPayment(memberId, 0);
        setField(paidPayment, "paymentStatus", UserPaymentStatus.PAID);

        given(planRepository.findById(1L)).willReturn(Optional.of(plan));
        given(billingProfileRepository.findFirstByMemberIdAndBillingProfileStatusOrderByCreatedAtDesc(
                memberId, BillingProfileStatus.ACTIVE)).willReturn(Optional.of(bp));
        given(billingMemberPort.getMemberBillingInfo(memberId))
                .willReturn(new BillingMemberPort.MemberBillingInfo("홍길동", "test@example.com"));
        given(renewalPaymentCreateTxService.createIfAbsent(any(), any(), any(), any(), any(), anyInt(), any()))
                .willReturn(paidPayment);

        service.processRenewal(sub, 0);

        verify(tossBillingPaymentClient, never()).pay(any(), any(), any(), any(), any(), any(), anyInt());
        verify(renewalSettleTxService, never()).settle(any(), any(), any(), any());
    }

    @Test
    @DisplayName("동일 subscription 2개 스케줄러 동시 실행 — settle은 각각 독립적으로 호출")
    void processRenewal_twoSchedulerInstances_settleCalledForEach() throws InterruptedException {
        Subscription sub1 = activeSubscription();
        Subscription sub2 = activeSubscription();
        Plan plan = plan(1L, "document-coaching", 29000);
        BillingProfile bp = billingProfile(memberId);
        UserPayment p1 = autoRenewalPayment(memberId, 0);
        UserPayment p2 = autoRenewalPayment(memberId, 0);

        given(planRepository.findById(1L)).willReturn(Optional.of(plan));
        given(billingProfileRepository.findFirstByMemberIdAndBillingProfileStatusOrderByCreatedAtDesc(
                memberId, BillingProfileStatus.ACTIVE)).willReturn(Optional.of(bp));
        given(billingMemberPort.getMemberBillingInfo(memberId))
                .willReturn(new BillingMemberPort.MemberBillingInfo("홍길동", "test@example.com"));
        given(aesCipher.decrypt(any())).willReturn("plain-key");
        given(renewalPaymentCreateTxService.createIfAbsent(any(), any(), any(), any(), any(), anyInt(), any()))
                .willReturn(p1, p2);
        given(tossBillingPaymentClient.pay(any(), any(), any(), any(), any(), any(), anyInt()))
                .willReturn(payResponse());

        AtomicInteger settleCount = new AtomicInteger();
        doAnswer(inv -> { settleCount.incrementAndGet(); return null; })
                .when(renewalSettleTxService).settle(any(), any(), any(), any());

        Thread t1 = new Thread(() -> service.processRenewal(sub1, 0));
        Thread t2 = new Thread(() -> service.processRenewal(sub2, 0));
        t1.start(); t2.start();
        t1.join(); t2.join();

        assertThat(settleCount.get()).isEqualTo(2);
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private Subscription activeSubscription() {
        ZonedDateTime now = ZonedDateTime.now(KST);
        Subscription s = Subscription.create(memberId, 1L, now.minusDays(30), now);
        setField(s, "subscriptionId", subscriptionId);
        setField(s, "billingProfileId", UUID.randomUUID());
        return s;
    }

    private Plan plan(Long id, String productCode, int price) {
        Plan p = Plan.create(productCode, "코칭", price, 30, "KRW", "MONTHLY", true);
        setField(p, "planId", id);
        return p;
    }

    private BillingProfile billingProfile(UUID memberId) {
        BillingProfile bp = BillingProfile.create(memberId, "ck-test", "enc-key", "신한", "1234-****");
        setField(bp, "billingProfileId", UUID.randomUUID());
        return bp;
    }

    private UserPayment autoRenewalPayment(UUID memberId, int attemptSequence) {
        UserPayment p = UserPayment.createAutoRenewal(
                memberId, 1L, "document-coaching",
                "RENEWAL-" + UUID.randomUUID(), "renewal-key-" + UUID.randomUUID(),
                "ck-test", "홍길동", "test@example.com", 29000, attemptSequence);
        setField(p, "paymentId", UUID.randomUUID());
        setField(p, "subscriptionId", subscriptionId);
        return p;
    }

    private TossBillingPaymentResponse payResponse() {
        return new TossBillingPaymentResponse(
                "pay-key", "RENEWAL-ORDER", "DONE", 29000, "KRW", ZonedDateTime.now(KST));
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
