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
import kr.co.carrer.user.billing.type.FreeUsageStatus;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserPaymentConfirmServiceTest {

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
    @DisplayName("document-coaching 최초 결제 성공 — PAID 상태·ACTIVE 구독·PREMIUM 이용권")
    void confirm_document_success() {
        UUID paymentId = UUID.randomUUID();
        String customerKey = "ck_test";
        String orderId = "ORDER-ABC123";
        UserPayment payment = readyPayment(memberId, 1L, "document-coaching", orderId, customerKey, paymentId);
        Plan plan = plan(1L, "document-coaching", "서류 AI 코칭", 29000);
        MemberProductEntitlement entitlement = freeEntitlement(memberId, "document-coaching");

        given(userPaymentRepository.findByOrderId(orderId)).willReturn(Optional.of(payment));
        given(planRepository.findByProductCodeAndIsActive("document-coaching", true))
                .willReturn(Optional.of(plan));
        given(tossBillingAuthClient.issue(any(), any())).willReturn(authResponse("bk_plain", customerKey));
        given(aesCipher.encrypt("bk_plain")).willReturn("bk_encrypted");
        given(billingProfileRepository.save(any())).willAnswer(inv -> inv.getArgument(0));
        given(aesCipher.decrypt("bk_encrypted")).willReturn("bk_plain");
        given(tossBillingPaymentClient.pay(any(), any(), any(), any(), any(), any(), anyInt()))
                .willReturn(payResponse("pay_key", orderId, 29000, "KRW"));
        given(entitlementRepository.findByMemberIdAndProductCodeForUpdate(memberId, "document-coaching"))
                .willReturn(Optional.of(entitlement));
        given(subscriptionRepository.save(any())).willAnswer(inv -> {
            Subscription sub = inv.getArgument(0);
            if (sub.getSubscriptionId() == null) setField(sub, "subscriptionId", UUID.randomUUID());
            return sub;
        });
        given(subscriptionUsagePeriodRepository.save(any())).willAnswer(inv -> inv.getArgument(0));

        BillingDTO.ResponseConfirmPayment response = service.confirm(
                memberId, new BillingDTO.RequestConfirmPayment("authKey1", customerKey, orderId));

        assertThat(response.paymentStatus()).isEqualTo("PAID");
        assertThat(response.subscriptionStatus()).isEqualTo("ACTIVE");
        assertThat(response.productCode()).isEqualTo("document-coaching");
        assertThat(response.amount()).isEqualTo(29000);
        assertThat(response.currency()).isEqualTo("KRW");
        assertThat(response.nextBillingAt()).isNotNull();
        verify(subscriptionRepository).save(any());
        verify(subscriptionUsagePeriodRepository).save(any());
    }

    @Test
    @DisplayName("interview 최초 결제 성공 — interview 이용권만 PREMIUM 전이")
    void confirm_interview_success_onlyInterviewPremium() {
        String orderId = "ORDER-INTERVIEW";
        String customerKey = "ck_int";
        UUID paymentId = UUID.randomUUID();
        UserPayment payment = readyPayment(memberId, 2L, "interview", orderId, customerKey, paymentId);
        Plan plan = plan(2L, "interview", "AI 모의면접", 29000);
        MemberProductEntitlement entitlement = freeEntitlement(memberId, "interview");

        given(userPaymentRepository.findByOrderId(orderId)).willReturn(Optional.of(payment));
        given(planRepository.findByProductCodeAndIsActive("interview", true))
                .willReturn(Optional.of(plan));
        given(tossBillingAuthClient.issue(any(), any())).willReturn(authResponse("bk_int", customerKey));
        given(aesCipher.encrypt("bk_int")).willReturn("bk_enc");
        given(billingProfileRepository.save(any())).willAnswer(inv -> inv.getArgument(0));
        given(aesCipher.decrypt("bk_enc")).willReturn("bk_int");
        given(tossBillingPaymentClient.pay(any(), any(), any(), any(), any(), any(), anyInt()))
                .willReturn(payResponse("pay_int", orderId, 29000, "KRW"));
        given(entitlementRepository.findByMemberIdAndProductCodeForUpdate(memberId, "interview"))
                .willReturn(Optional.of(entitlement));
        given(subscriptionRepository.save(any())).willAnswer(inv -> {
            Subscription sub = inv.getArgument(0);
            if (sub.getSubscriptionId() == null) setField(sub, "subscriptionId", UUID.randomUUID());
            return sub;
        });
        given(subscriptionUsagePeriodRepository.save(any())).willAnswer(inv -> inv.getArgument(0));

        BillingDTO.ResponseConfirmPayment response = service.confirm(
                memberId, new BillingDTO.RequestConfirmPayment("authKey2", customerKey, orderId));

        assertThat(response.productCode()).isEqualTo("interview");
        // document-coaching entitlement는 조회하지 않음 (interview만 처리)
        verify(entitlementRepository, never())
                .findByMemberIdAndProductCodeForUpdate(any(), eq("document-coaching"));
    }

    @Test
    @DisplayName("customerKey 불일치 — BILLING_CUSTOMER_KEY_MISMATCH")
    void confirm_customerKeyMismatch() {
        String orderId = "ORDER-123";
        UserPayment payment = readyPayment(memberId, 1L, "document-coaching", orderId, "real-ck", UUID.randomUUID());
        given(userPaymentRepository.findByOrderId(orderId)).willReturn(Optional.of(payment));

        assertThatThrownBy(() ->
                service.confirm(memberId, new BillingDTO.RequestConfirmPayment("authKey", "wrong-ck", orderId)))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(BillingErrorCode.BILLING_CUSTOMER_KEY_MISMATCH));
    }

    @Test
    @DisplayName("READY가 아닌 주문 confirm — BILLING_ORDER_NOT_READY")
    void confirm_notReadyOrder() {
        String orderId = "ORDER-123";
        UserPayment payment = readyPayment(memberId, 1L, "document-coaching", orderId, "ck", UUID.randomUUID());
        payment.cancel();  // CANCELED 상태로 전이
        given(userPaymentRepository.findByOrderId(orderId)).willReturn(Optional.of(payment));

        assertThatThrownBy(() ->
                service.confirm(memberId, new BillingDTO.RequestConfirmPayment("ak", "ck", orderId)))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(BillingErrorCode.BILLING_ORDER_NOT_READY));
    }

    @Test
    @DisplayName("타인 orderId 조회 (IDOR) — BILLING_ORDER_NOT_FOUND")
    void confirm_anotherMembersOrder() {
        String orderId = "ORDER-OTHER";
        UUID otherMember = UUID.randomUUID();
        UserPayment payment = readyPayment(otherMember, 1L, "document-coaching", orderId, "ck", UUID.randomUUID());
        given(userPaymentRepository.findByOrderId(orderId)).willReturn(Optional.of(payment));

        assertThatThrownBy(() ->
                service.confirm(memberId, new BillingDTO.RequestConfirmPayment("ak", "ck", orderId)))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(BillingErrorCode.BILLING_ORDER_NOT_FOUND));
    }

    @Test
    @DisplayName("Toss 응답 orderId 불일치 — PAYMENT_AMOUNT_MISMATCH")
    void confirm_orderIdMismatch() {
        String orderId = "ORDER-123";
        String customerKey = "ck_test";
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
                .willReturn(payResponse("pay_key", "ORDER-TAMPERED", 29000, "KRW"));  // orderId 불일치

        assertThatThrownBy(() ->
                service.confirm(memberId, new BillingDTO.RequestConfirmPayment("ak", customerKey, orderId)))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(BillingErrorCode.PAYMENT_AMOUNT_MISMATCH));
        verify(failureTxService).failPayment(eq(paymentId), any());
    }

    @Test
    @DisplayName("Toss 응답 금액 불일치 — PAYMENT_AMOUNT_MISMATCH")
    void confirm_amountMismatch() {
        String orderId = "ORDER-123";
        String customerKey = "ck_test";
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
                .willReturn(payResponse("pay_key", orderId, 1000, "KRW"));  // 금액 불일치

        assertThatThrownBy(() ->
                service.confirm(memberId, new BillingDTO.RequestConfirmPayment("ak", customerKey, orderId)))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(BillingErrorCode.PAYMENT_AMOUNT_MISMATCH));
        verify(failureTxService).failPayment(eq(paymentId), any());
    }

    @Test
    @DisplayName("currency != KRW — PAYMENT_AMOUNT_MISMATCH")
    void confirm_currencyNotKRW() {
        String orderId = "ORDER-USD";
        String customerKey = "ck_usd";
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
                .willReturn(payResponse("pay_key", orderId, 29000, "USD"));  // currency 불일치

        assertThatThrownBy(() ->
                service.confirm(memberId, new BillingDTO.RequestConfirmPayment("ak", customerKey, orderId)))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(BillingErrorCode.PAYMENT_AMOUNT_MISMATCH));
        verify(failureTxService).failPayment(eq(paymentId), any());
    }

    @Test
    @DisplayName("미사용 무료 이용권(AVAILABLE)은 결제 성공 시 FORFEITED 처리")
    void confirm_forfeitFreeEntitlement() {
        String orderId = "ORDER-FORFEIT";
        String customerKey = "ck_f";
        UUID paymentId = UUID.randomUUID();
        UserPayment payment = readyPayment(memberId, 1L, "document-coaching", orderId, customerKey, paymentId);
        Plan plan = plan(1L, "document-coaching", "코칭", 29000);
        MemberProductEntitlement entitlement = freeEntitlement(memberId, "document-coaching");
        assertThat(entitlement.getFreeUsageStatus()).isEqualTo(FreeUsageStatus.AVAILABLE);

        given(userPaymentRepository.findByOrderId(orderId)).willReturn(Optional.of(payment));
        given(planRepository.findByProductCodeAndIsActive("document-coaching", true))
                .willReturn(Optional.of(plan));
        given(tossBillingAuthClient.issue(any(), any())).willReturn(authResponse("bk", customerKey));
        given(aesCipher.encrypt("bk")).willReturn("bk_enc");
        given(billingProfileRepository.save(any())).willAnswer(inv -> inv.getArgument(0));
        given(aesCipher.decrypt("bk_enc")).willReturn("bk");
        given(tossBillingPaymentClient.pay(any(), any(), any(), any(), any(), any(), anyInt()))
                .willReturn(payResponse("pay_key", orderId, 29000, "KRW"));
        given(entitlementRepository.findByMemberIdAndProductCodeForUpdate(memberId, "document-coaching"))
                .willReturn(Optional.of(entitlement));
        given(subscriptionRepository.save(any())).willAnswer(inv -> {
            Subscription sub = inv.getArgument(0);
            if (sub.getSubscriptionId() == null) setField(sub, "subscriptionId", UUID.randomUUID());
            return sub;
        });
        given(subscriptionUsagePeriodRepository.save(any())).willAnswer(inv -> inv.getArgument(0));

        service.confirm(memberId, new BillingDTO.RequestConfirmPayment("ak", customerKey, orderId));

        assertThat(entitlement.getFreeUsageStatus()).isEqualTo(FreeUsageStatus.FORFEITED);
    }

    @Test
    @DisplayName("nextBillingAt = approvedAt + 30일")
    void confirm_nextBillingAtIsPlusThirtyDays() {
        String orderId = "ORDER-NEXT";
        String customerKey = "ck_n";
        UUID paymentId = UUID.randomUUID();
        ZonedDateTime approvedAt = ZonedDateTime.now(KST);
        UserPayment payment = readyPayment(memberId, 1L, "document-coaching", orderId, customerKey, paymentId);
        Plan plan = plan(1L, "document-coaching", "코칭", 29000);
        MemberProductEntitlement entitlement = freeEntitlement(memberId, "document-coaching");

        given(userPaymentRepository.findByOrderId(orderId)).willReturn(Optional.of(payment));
        given(planRepository.findByProductCodeAndIsActive("document-coaching", true))
                .willReturn(Optional.of(plan));
        given(tossBillingAuthClient.issue(any(), any())).willReturn(authResponse("bk", customerKey));
        given(aesCipher.encrypt("bk")).willReturn("bk_enc");
        given(billingProfileRepository.save(any())).willAnswer(inv -> inv.getArgument(0));
        given(aesCipher.decrypt("bk_enc")).willReturn("bk");
        given(tossBillingPaymentClient.pay(any(), any(), any(), any(), any(), any(), anyInt()))
                .willReturn(payResponseWithTime("pay_key", orderId, 29000, "KRW", approvedAt));
        given(entitlementRepository.findByMemberIdAndProductCodeForUpdate(memberId, "document-coaching"))
                .willReturn(Optional.of(entitlement));
        given(subscriptionRepository.save(any())).willAnswer(inv -> {
            Subscription sub = inv.getArgument(0);
            if (sub.getSubscriptionId() == null) setField(sub, "subscriptionId", UUID.randomUUID());
            return sub;
        });
        given(subscriptionUsagePeriodRepository.save(any())).willAnswer(inv -> inv.getArgument(0));

        BillingDTO.ResponseConfirmPayment response = service.confirm(
                memberId, new BillingDTO.RequestConfirmPayment("ak", customerKey, orderId));

        assertThat(response.nextBillingAt())
                .isEqualTo(approvedAt.withZoneSameInstant(KST).plusDays(30));
    }

    @Test
    @DisplayName("ConfirmPaymentResponse에 billingKey 필드 없음")
    void confirm_responseDoesNotContainBillingKey() {
        var fieldNames = java.util.Arrays.stream(BillingDTO.ResponseConfirmPayment.class.getRecordComponents())
                .map(java.lang.reflect.RecordComponent::getName)
                .map(String::toLowerCase)
                .toList();
        // "billingkey" 라는 단어가 필드명으로 존재하지 않아야 함 (nextBillingAt 등 허용)
        assertThat(fieldNames).noneMatch(name -> name.equals("billingkey"));
        assertThat(fieldNames).noneMatch(name -> name.equals("authkey"));
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

    private MemberProductEntitlement freeEntitlement(UUID memberId, String productCode) {
        return MemberProductEntitlement.createFree(memberId, productCode);
    }

    private TossBillingAuthResponse authResponse(String billingKey, String customerKey) {
        return new TossBillingAuthResponse(billingKey, customerKey, ZonedDateTime.now(KST), null);
    }

    private TossBillingPaymentResponse payResponse(String paymentKey, String orderId,
                                                    int amount, String currency) {
        return payResponseWithTime(paymentKey, orderId, amount, currency, ZonedDateTime.now(KST));
    }

    private TossBillingPaymentResponse payResponseWithTime(String paymentKey, String orderId,
                                                            int amount, String currency,
                                                            ZonedDateTime approvedAt) {
        return new TossBillingPaymentResponse(paymentKey, orderId, "카드", "DONE", amount, currency, approvedAt);
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
