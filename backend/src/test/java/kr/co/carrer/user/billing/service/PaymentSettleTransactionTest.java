package kr.co.carrer.user.billing.service;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.dto.BillingDTO;
import kr.co.carrer.user.billing.client.OneTimePaymentClient;
import kr.co.carrer.user.billing.client.TossBillingAuthorizationClient;
import kr.co.carrer.user.billing.client.TossBillingPaymentClient;
import kr.co.carrer.user.billing.client.dto.TossBillingAuthResponse;
import kr.co.carrer.user.billing.client.dto.TossBillingPaymentResponse;
import kr.co.carrer.user.billing.entity.*;
import kr.co.carrer.user.billing.entity.Subscription;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import kr.co.carrer.user.billing.repository.*;
import kr.co.carrer.user.billing.service.EntitlementInitService;
import kr.co.carrer.user.billing.service.impl.PaymentReconciliationTxService;
import kr.co.carrer.user.billing.service.impl.UserPaymentConfirmServiceImpl;
import kr.co.carrer.user.billing.service.impl.UserPaymentFailureTxService;
import kr.co.carrer.user.billing.service.impl.UserPaymentSettleTxService;
import kr.co.carrer.user.billing.util.AesCipher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

/**
 * settle() 원자성 검증:
 * 각 단계에서 예외 발생 시 이후 단계가 실행되지 않음을 검증한다.
 */
@ExtendWith(MockitoExtension.class)
class PaymentSettleTransactionTest {

    @Mock UserPaymentRepository userPaymentRepository;
    @Mock BillingProfileRepository billingProfileRepository;
    @Mock SubscriptionRepository subscriptionRepository;
    @Mock MemberProductEntitlementRepository entitlementRepository;
    @Mock SubscriptionUsagePeriodRepository subscriptionUsagePeriodRepository;
    @Mock PlanRepository planRepository;
    @Mock TossBillingAuthorizationClient tossBillingAuthClient;
    @Mock TossBillingPaymentClient tossBillingPaymentClient;
    @Mock OneTimePaymentClient oneTimePaymentClient;
    @Mock AesCipher aesCipher;
    @Mock UserPaymentFailureTxService failureTxService;
    @Mock PaymentReconciliationTxService reconciliationTxService;
    @Mock EntitlementInitService entitlementInitService;

    private UserPaymentConfirmServiceImpl service;
    private UserPaymentSettleTxService settleTxService;
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private final UUID memberId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        settleTxService = new UserPaymentSettleTxService(
                subscriptionRepository, entitlementRepository, subscriptionUsagePeriodRepository,
                entitlementInitService);
        service = new UserPaymentConfirmServiceImpl(
                userPaymentRepository, billingProfileRepository, planRepository,
                tossBillingAuthClient, tossBillingPaymentClient, oneTimePaymentClient, aesCipher,
                failureTxService, settleTxService, reconciliationTxService);
    }

    @Test
    @DisplayName("Toss auth 실패 — failPayment 호출 후 Subscription·Entitlement 저장 없음")
    void settle_authFail_noSubscriptionCreated() {
        String orderId = "ORDER-AUTH-FAIL";
        String customerKey = "ck_af";
        UUID paymentId = UUID.randomUUID();
        UserPayment payment = readyPayment(memberId, 1L, "document-coaching", orderId, customerKey, paymentId);
        Plan plan = plan(1L, "document-coaching", "코칭", 29000);

        given(userPaymentRepository.findByOrderId(orderId)).willReturn(Optional.of(payment));
        given(planRepository.findByProductCodeAndIsActive("document-coaching", true))
                .willReturn(Optional.of(plan));
        given(tossBillingAuthClient.issue(any(), any()))
                .willThrow(new CustomException(BillingErrorCode.BILLING_AUTHORIZATION_FAILED));

        assertThatThrownBy(() ->
                service.confirm(memberId, new BillingDTO.RequestConfirmPayment("ak", customerKey, orderId)))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(BillingErrorCode.BILLING_AUTHORIZATION_FAILED));

        verify(failureTxService).failPayment(eq(paymentId), any());
        verify(subscriptionRepository, never()).save(any());
        verify(entitlementRepository, never()).findByMemberIdAndProductCodeForUpdate(any(), any());
        verify(subscriptionUsagePeriodRepository, never()).save(any());
    }

    @Test
    @DisplayName("Toss payment 실패 — failPayment 호출 후 Subscription·Entitlement 저장 없음")
    void settle_paymentFail_noSubscriptionCreated() {
        String orderId = "ORDER-PAY-FAIL";
        String customerKey = "ck_pf";
        UUID paymentId = UUID.randomUUID();
        UserPayment payment = readyPayment(memberId, 1L, "document-coaching", orderId, customerKey, paymentId);
        Plan plan = plan(1L, "document-coaching", "코칭", 29000);

        given(userPaymentRepository.findByOrderId(orderId)).willReturn(Optional.of(payment));
        given(planRepository.findByProductCodeAndIsActive("document-coaching", true))
                .willReturn(Optional.of(plan));
        given(tossBillingAuthClient.issue(any(), any())).willReturn(authResponse("bk", customerKey));
        given(aesCipher.encrypt("bk")).willReturn("bk_enc");
        given(billingProfileRepository.save(any())).willAnswer(inv -> inv.getArgument(0));
        given(aesCipher.decrypt("bk_enc")).willReturn("bk");
        given(tossBillingPaymentClient.pay(any(), any(), any(), any(), any(), any(), anyInt()))
                .willThrow(new CustomException(BillingErrorCode.PAYMENT_CONFIRM_FAILED));

        assertThatThrownBy(() ->
                service.confirm(memberId, new BillingDTO.RequestConfirmPayment("ak", customerKey, orderId)))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(BillingErrorCode.PAYMENT_CONFIRM_FAILED));

        verify(failureTxService).failPayment(eq(paymentId), any());
        verify(subscriptionRepository, never()).save(any());
        verify(entitlementRepository, never()).findByMemberIdAndProductCodeForUpdate(any(), any());
    }

    @Test
    @DisplayName("Entitlement 없음 — 결산 시 생성 후 프리미엄 활성화 및 UsagePeriod 저장")
    void settle_entitlementMissing_createsAndActivates() {
        String orderId = "ORDER-ENT-NEW";
        String customerKey = "ck_ef";
        UUID paymentId = UUID.randomUUID();
        UserPayment payment = readyPayment(memberId, 1L, "document-coaching", orderId, customerKey, paymentId);
        Plan plan = plan(1L, "document-coaching", "코칭", 29000);

        given(userPaymentRepository.findByOrderId(orderId)).willReturn(Optional.of(payment));
        given(planRepository.findByProductCodeAndIsActive("document-coaching", true))
                .willReturn(Optional.of(plan));
        given(tossBillingAuthClient.issue(any(), any())).willReturn(authResponse("bk", customerKey));
        given(aesCipher.encrypt("bk")).willReturn("bk_enc");
        given(billingProfileRepository.save(any())).willAnswer(inv -> inv.getArgument(0));
        given(aesCipher.decrypt("bk_enc")).willReturn("bk");
        given(tossBillingPaymentClient.pay(any(), any(), any(), any(), any(), any(), anyInt()))
                .willReturn(payResponse("pay_key", orderId, 29000, "KRW"));
        given(subscriptionRepository.save(any())).willAnswer(inv -> {
            Subscription sub = inv.getArgument(0);
            if (sub.getSubscriptionId() == null) setField(sub, "subscriptionId", UUID.randomUUID());
            return sub;
        });
        // ensureFreeEntitlement(REQUIRES_NEW) 가 없던 이용권을 생성한 뒤, 잠금 조회로 다시 읽는다.
        given(entitlementRepository.findByMemberIdAndProductCodeForUpdate(any(), any()))
                .willReturn(Optional.of(MemberProductEntitlement.createFree(memberId, "document-coaching")));

        BillingDTO.ResponseConfirmPayment response =
                service.confirm(memberId, new BillingDTO.RequestConfirmPayment("ak", customerKey, orderId));

        // 이용권이 없으면 발급을 막지 않고 생성해 프리미엄 활성화까지 진행하고, 사용기간도 기록한다.
        assertThat(response.paymentStatus()).isEqualTo("PAID");
        verify(entitlementInitService).ensureFreeEntitlement(memberId, "document-coaching");
        verify(subscriptionUsagePeriodRepository).save(any());
    }

    @Test
    @DisplayName("결제 승인 순서: READY→AUTHORIZED→CONFIRMING 상태 전이 순서 검증")
    void settle_stateTransitionOrder() {
        String orderId = "ORDER-STATE";
        String customerKey = "ck_st";
        UUID paymentId = UUID.randomUUID();
        UserPayment payment = spy(readyPayment(memberId, 1L, "document-coaching", orderId, customerKey, paymentId));
        Plan plan = plan(1L, "document-coaching", "코칭", 29000);
        MemberProductEntitlement entitlement = MemberProductEntitlement.createFree(memberId, "document-coaching");

        given(userPaymentRepository.findByOrderId(orderId)).willReturn(Optional.of(payment));
        given(planRepository.findByProductCodeAndIsActive("document-coaching", true))
                .willReturn(Optional.of(plan));
        given(tossBillingAuthClient.issue(any(), any())).willReturn(authResponse("bk", customerKey));
        given(aesCipher.encrypt("bk")).willReturn("bk_enc");
        given(billingProfileRepository.save(any())).willAnswer(inv -> inv.getArgument(0));
        given(aesCipher.decrypt("bk_enc")).willReturn("bk");
        given(tossBillingPaymentClient.pay(any(), any(), any(), any(), any(), any(), anyInt()))
                .willReturn(payResponse("pay_key", orderId, 29000, "KRW"));
        given(entitlementRepository.findByMemberIdAndProductCodeForUpdate(any(), any()))
                .willReturn(Optional.of(entitlement));
        UUID subId = UUID.randomUUID();
        given(subscriptionRepository.save(any())).willAnswer(inv -> {
            Subscription sub = inv.getArgument(0);
            setField(sub, "subscriptionId", subId);
            return sub;
        });
        given(subscriptionUsagePeriodRepository.save(any())).willAnswer(inv -> inv.getArgument(0));

        service.confirm(memberId, new BillingDTO.RequestConfirmPayment("ak", customerKey, orderId));

        InOrder inOrder = inOrder(payment);
        inOrder.verify(payment).authorize();
        inOrder.verify(payment).confirmStarted();
        inOrder.verify(payment).paid(any(), any(), any());

        assertThat(payment.getPaymentMethod()).isEqualTo("카드");
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private Plan plan(Long id, String code, String name, int price) {
        Plan plan = Plan.create(code, name, price, 30, "KRW", "MONTHLY", true);
        setField(plan, "planId", id);
        return plan;
    }

    private UserPayment readyPayment(UUID memberId, Long planId, String productCode,
                                     String orderId, String customerKey, UUID paymentId) {
        ZonedDateTime expiresAt = ZonedDateTime.now(KST).plusMinutes(30);
        UserPayment payment = UserPayment.createReady(
                memberId, planId, productCode, orderId,
                UUID.randomUUID().toString(), customerKey,
                "홍길동", "test@example.com", 29000, expiresAt);
        setField(payment, "paymentId", paymentId);
        return payment;
    }

    private TossBillingAuthResponse authResponse(String billingKey, String customerKey) {
        return new TossBillingAuthResponse(billingKey, customerKey, ZonedDateTime.now(KST), null);
    }

    private TossBillingPaymentResponse payResponse(String paymentKey, String orderId,
                                                    int amount, String currency) {
        return new TossBillingPaymentResponse(paymentKey, orderId, "카드", "DONE", amount, currency,
                ZonedDateTime.now(KST));
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
