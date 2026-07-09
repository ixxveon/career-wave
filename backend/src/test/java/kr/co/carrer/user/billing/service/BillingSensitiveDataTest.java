package kr.co.carrer.user.billing.service;

import kr.co.carrer.user.billing.client.OneTimePaymentClient;
import kr.co.carrer.user.billing.client.TossBillingAuthorizationClient;
import kr.co.carrer.user.billing.client.TossBillingPaymentClient;
import kr.co.carrer.user.billing.dto.BillingDTO;
import kr.co.carrer.user.billing.entity.UserPayment;
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
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.RecordComponent;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

/**
 * 결제 응답 DTO에 민감정보(billingKey, authKey, paymentKey) 필드가 없음을 검증한다.
 */
@ExtendWith(MockitoExtension.class)
class BillingSensitiveDataTest {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

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

    private UserPaymentConfirmServiceImpl confirmService;

    @BeforeEach
    void setUp() {
        UserPaymentSettleTxService settleTxService = new UserPaymentSettleTxService(
                subscriptionRepository, entitlementRepository, subscriptionUsagePeriodRepository,
                entitlementInitService);
        confirmService = new UserPaymentConfirmServiceImpl(
                userPaymentRepository, billingProfileRepository, planRepository,
                tossBillingAuthClient, tossBillingPaymentClient, oneTimePaymentClient, aesCipher,
                failureTxService, settleTxService, reconciliationTxService);
    }

    @Test
    @DisplayName("ResponseConfirmPayment — billingKey 필드 없음")
    void confirmPaymentResponse_noBillingKey() {
        List<String> fields = componentNames(BillingDTO.ResponseConfirmPayment.class);
        assertThat(fields).noneMatch(name -> name.equalsIgnoreCase("billingKey"));
        assertThat(fields).noneMatch(name -> name.equalsIgnoreCase("encryptedBillingKey"));
    }

    @Test
    @DisplayName("ResponseConfirmPayment — authKey 필드 없음")
    void confirmPaymentResponse_noAuthKey() {
        List<String> fields = componentNames(BillingDTO.ResponseConfirmPayment.class);
        assertThat(fields).noneMatch(name -> name.equalsIgnoreCase("authKey"));
    }

    @Test
    @DisplayName("ResponseCreateOrder — billingKey 필드 없음")
    void createOrderResponse_noBillingKey() {
        List<String> fields = componentNames(BillingDTO.ResponseCreateOrder.class);
        assertThat(fields).noneMatch(name -> name.equalsIgnoreCase("billingKey"));
    }

    @Test
    @DisplayName("ResponsePaymentStatus — billingKey·authKey 필드 없음")
    void paymentStatusResponse_noSensitiveFields() {
        List<String> fields = componentNames(BillingDTO.ResponsePaymentStatus.class);
        assertThat(fields).noneMatch(name -> name.equalsIgnoreCase("billingKey"));
        assertThat(fields).noneMatch(name -> name.equalsIgnoreCase("authKey"));
    }

    @Test
    @DisplayName("ResponseConfirmPayment 직렬화 시 billingKey 포함 여부 — 필드 없으므로 미포함")
    void confirmPaymentResponse_serializationDoesNotLeakBillingKey() throws Exception {
        ZonedDateTime now = ZonedDateTime.now(KST);
        BillingDTO.ResponseConfirmPayment response = new BillingDTO.ResponseConfirmPayment(
                UUID.randomUUID(), "ORDER-TEST", "document-coaching", "서류 AI 코칭",
                29000, "KRW", "PAID", "ACTIVE", now, now.plusDays(30));

        com.fasterxml.jackson.databind.ObjectMapper mapper =
                new com.fasterxml.jackson.databind.ObjectMapper();
        mapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
        String json = mapper.writeValueAsString(response);

        assertThat(json).doesNotContain("billingKey");
        assertThat(json).doesNotContain("authKey");
        assertThat(json).contains("paymentId");
        assertThat(json).contains("PAID");
    }

    @Test
    @DisplayName("ResponseRecordPaymentFail — billingKey 없음, orderId·paymentStatus·retryable 포함")
    void recordPaymentFailResponse_contract() {
        List<String> fields = componentNames(BillingDTO.ResponseRecordPaymentFail.class);
        assertThat(fields).noneMatch(name -> name.equalsIgnoreCase("billingKey"));
        assertThat(fields).contains("orderId", "paymentStatus", "retryable");
    }

    @Test
    @DisplayName("USER_CANCELED·CARD_DECLINED·TIMEOUT — recordFail() 통해 retryable=true")
    void recordFail_retryableReasons() {
        for (String reasonCode : List.of("USER_CANCELED", "CARD_DECLINED", "TIMEOUT")) {
            UserPayment payment = authorizedPayment();
            given(userPaymentRepository.findByOrderIdAndMemberId(any(), any()))
                    .willReturn(Optional.of(payment));

            BillingDTO.ResponseRecordPaymentFail response = confirmService.recordFail(
                    UUID.randomUUID(),
                    new BillingDTO.RequestRecordPaymentFail("ORDER-X", "document-coaching", reasonCode, null));

            assertThat(response.retryable())
                    .as("reasonCode=%s should be retryable", reasonCode)
                    .isTrue();
        }
    }

    @Test
    @DisplayName("CONFIRM_FAILED·FORBIDDEN·UNKNOWN — recordFail() 통해 retryable=false")
    void recordFail_nonRetryableReasons() {
        for (String reasonCode : List.of("CONFIRM_FAILED", "FORBIDDEN", "UNKNOWN")) {
            UserPayment payment = authorizedPayment();
            given(userPaymentRepository.findByOrderIdAndMemberId(any(), any()))
                    .willReturn(Optional.of(payment));

            BillingDTO.ResponseRecordPaymentFail response = confirmService.recordFail(
                    UUID.randomUUID(),
                    new BillingDTO.RequestRecordPaymentFail("ORDER-X", "document-coaching", reasonCode, null));

            assertThat(response.retryable())
                    .as("reasonCode=%s should NOT be retryable", reasonCode)
                    .isFalse();
        }
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private UserPayment authorizedPayment() {
        ZonedDateTime now = ZonedDateTime.now(KST);
        UserPayment p = UserPayment.createReady(
                UUID.randomUUID(), 1L, "document-coaching",
                "ORDER-" + UUID.randomUUID(), UUID.randomUUID().toString(),
                UUID.randomUUID().toString(), "테스트", "test@example.com", 29000,
                now.plusMinutes(30));
        p.authorize();
        return p;
    }

    private List<String> componentNames(Class<?> recordClass) {
        return Arrays.stream(recordClass.getRecordComponents())
                .map(RecordComponent::getName)
                .toList();
    }
}
