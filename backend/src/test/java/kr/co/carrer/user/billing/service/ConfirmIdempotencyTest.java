package kr.co.carrer.user.billing.service;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.client.OneTimePaymentClient;
import kr.co.carrer.user.billing.client.TossBillingAuthorizationClient;
import kr.co.carrer.user.billing.client.TossBillingPaymentClient;
import kr.co.carrer.user.billing.client.dto.TossBillingAuthResponse;
import kr.co.carrer.user.billing.client.dto.TossBillingPaymentResponse;
import kr.co.carrer.user.billing.dto.BillingDTO;
import kr.co.carrer.user.billing.entity.*;
import kr.co.carrer.user.billing.entity.Subscription;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import kr.co.carrer.user.billing.repository.*;
import kr.co.carrer.user.billing.service.EntitlementInitService;
import kr.co.carrer.user.billing.service.impl.PaymentReconciliationTxService;
import kr.co.carrer.user.billing.service.impl.UserPaymentConfirmServiceImpl;
import kr.co.carrer.user.billing.service.impl.UserPaymentFailureTxService;
import kr.co.carrer.user.billing.service.impl.UserPaymentSettleTxService;
import kr.co.carrer.user.billing.type.UserPaymentStatus;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ConfirmIdempotencyTest {

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
    @DisplayName("이미 PAID된 주문에 confirm 재요청 — BILLING_ORDER_NOT_READY")
    void confirm_alreadyPaid_billingOrderNotReady() {
        String orderId = "ORDER-PAID";
        String customerKey = "ck_paid";
        UserPayment payment = readyPayment(memberId, 1L, "document-coaching", orderId, customerKey);
        payment.authorize();
        payment.confirmStarted();
        payment.paid("pay_key", "카드", ZonedDateTime.now(KST));
        assertThat(payment.getPaymentStatus()).isEqualTo(UserPaymentStatus.PAID);
        assertThat(payment.getPaymentMethod()).isEqualTo("카드");

        given(userPaymentRepository.findByOrderId(orderId)).willReturn(Optional.of(payment));

        assertThatThrownBy(() ->
                service.confirm(memberId, new BillingDTO.RequestConfirmPayment("ak", customerKey, orderId)))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(BillingErrorCode.BILLING_ORDER_NOT_READY));
    }

    @Test
    @DisplayName("만료된(CANCELED) 주문 confirm — BILLING_ORDER_NOT_READY")
    void confirm_canceledOrder_billingOrderNotReady() {
        String orderId = "ORDER-CANCELED";
        String customerKey = "ck_canceled";
        UserPayment payment = readyPayment(memberId, 1L, "document-coaching", orderId, customerKey);
        payment.cancel();
        assertThat(payment.getPaymentStatus()).isEqualTo(UserPaymentStatus.CANCELED);

        given(userPaymentRepository.findByOrderId(orderId)).willReturn(Optional.of(payment));

        assertThatThrownBy(() ->
                service.confirm(memberId, new BillingDTO.RequestConfirmPayment("ak", customerKey, orderId)))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(BillingErrorCode.BILLING_ORDER_NOT_READY));
    }

    @Test
    @DisplayName("존재하지 않는 orderId — BILLING_ORDER_NOT_FOUND")
    void confirm_nonExistentOrder_notFound() {
        given(userPaymentRepository.findByOrderId("ORDER-GHOST"))
                .willReturn(Optional.empty());

        assertThatThrownBy(() ->
                service.confirm(memberId, new BillingDTO.RequestConfirmPayment("ak", "ck", "ORDER-GHOST")))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(BillingErrorCode.BILLING_ORDER_NOT_FOUND));
    }

    @Test
    @DisplayName("READY 주문 confirm 성공 후 재요청 — Toss API 추가 호출 없이 BILLING_ORDER_NOT_READY")
    void confirm_readyOrder_idempotency() {
        String orderId = "ORDER-ONCE";
        String customerKey = "ck_once";
        UUID paymentId = UUID.randomUUID();
        UserPayment payment = readyPayment(memberId, 1L, "document-coaching", orderId, customerKey);
        setField(payment, "paymentId", paymentId);
        Plan plan = plan(1L, "document-coaching", "코칭", 29000);
        MemberProductEntitlement entitlement = MemberProductEntitlement.createFree(memberId, "document-coaching");

        given(userPaymentRepository.findByOrderId(orderId)).willReturn(Optional.of(payment));
        given(planRepository.findByProductCodeAndIsActive("document-coaching", true))
                .willReturn(Optional.of(plan));
        given(tossBillingAuthClient.issue(any(), any()))
                .willReturn(new TossBillingAuthResponse("bk", customerKey, ZonedDateTime.now(KST), null));
        given(aesCipher.encrypt("bk")).willReturn("bk_enc");
        given(billingProfileRepository.save(any())).willAnswer(inv -> inv.getArgument(0));
        given(aesCipher.decrypt("bk_enc")).willReturn("bk");
        given(tossBillingPaymentClient.pay(any(), any(), any(), any(), any(), any(), anyInt()))
                .willReturn(new TossBillingPaymentResponse("pk", orderId, "카드", "DONE", 29000, "KRW",
                        ZonedDateTime.now(KST)));
        given(entitlementRepository.findByMemberIdAndProductCodeForUpdate(any(), any()))
                .willReturn(Optional.of(entitlement));
        given(subscriptionRepository.save(any())).willAnswer(inv -> {
            Subscription sub = inv.getArgument(0);
            if (sub.getSubscriptionId() == null) setField(sub, "subscriptionId", UUID.randomUUID());
            return sub;
        });
        given(subscriptionUsagePeriodRepository.save(any())).willAnswer(inv -> inv.getArgument(0));

        // 첫 번째 confirm — 성공
        service.confirm(memberId, new BillingDTO.RequestConfirmPayment("ak", customerKey, orderId));
        assertThat(payment.getPaymentStatus()).isEqualTo(UserPaymentStatus.PAID);
        assertThat(payment.getPaymentMethod()).isEqualTo("카드");
        verify(tossBillingAuthClient, times(1)).issue(any(), any());
        verify(tossBillingPaymentClient, times(1)).pay(any(), any(), any(), any(), any(), any(), anyInt());

        // 두 번째 confirm — payment가 이미 PAID 상태이므로 즉시 거부
        assertThatThrownBy(() ->
                service.confirm(memberId, new BillingDTO.RequestConfirmPayment("ak", customerKey, orderId)))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(BillingErrorCode.BILLING_ORDER_NOT_READY));

        // Toss API 추가 호출 없음 — 멱등성 보장
        verify(tossBillingAuthClient, times(1)).issue(any(), any());
        verify(tossBillingPaymentClient, times(1)).pay(any(), any(), any(), any(), any(), any(), anyInt());
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private Plan plan(Long id, String code, String name, int price) {
        Plan plan = Plan.create(code, name, price, 30, "KRW", "MONTHLY", true);
        setField(plan, "planId", id);
        return plan;
    }

    private UserPayment readyPayment(UUID memberId, Long planId, String productCode,
                                     String orderId, String customerKey) {
        ZonedDateTime expiresAt = ZonedDateTime.now(KST).plusMinutes(30);
        return UserPayment.createReady(memberId, planId, productCode, orderId,
                UUID.randomUUID().toString(), customerKey,
                "홍길동", "test@example.com", 29000, expiresAt);
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
