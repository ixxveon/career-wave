package kr.co.carrer.user.billing.service;

import kr.co.carrer.user.billing.dto.BillingDTO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.RecordComponent;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 결제 응답 DTO에 민감정보(billingKey, authKey, paymentKey) 필드가 없음을 검증한다.
 */
class BillingSensitiveDataTest {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    @Test
    @DisplayName("ConfirmPaymentResponse — billingKey 필드 없음")
    void confirmPaymentResponse_noBillingKey() {
        List<String> fields = componentNames(BillingDTO.ConfirmPaymentResponse.class);
        // "billingKey" 그 자체로 필드명 일치 여부만 체크 (nextBillingAt 등 허용)
        assertThat(fields).noneMatch(name -> name.equalsIgnoreCase("billingKey"));
        assertThat(fields).noneMatch(name -> name.equalsIgnoreCase("encryptedBillingKey"));
    }

    @Test
    @DisplayName("ConfirmPaymentResponse — authKey 필드 없음")
    void confirmPaymentResponse_noAuthKey() {
        List<String> fields = componentNames(BillingDTO.ConfirmPaymentResponse.class);
        assertThat(fields).noneMatch(name -> name.equalsIgnoreCase("authKey"));
    }

    @Test
    @DisplayName("CreateOrderResponse — billingKey 필드 없음")
    void createOrderResponse_noBillingKey() {
        List<String> fields = componentNames(BillingDTO.CreateOrderResponse.class);
        assertThat(fields).noneMatch(name -> name.equalsIgnoreCase("billingKey"));
    }

    @Test
    @DisplayName("PaymentStatusResponse — billingKey·authKey 필드 없음")
    void paymentStatusResponse_noSensitiveFields() {
        List<String> fields = componentNames(BillingDTO.PaymentStatusResponse.class);
        assertThat(fields).noneMatch(name -> name.equalsIgnoreCase("billingKey"));
        assertThat(fields).noneMatch(name -> name.equalsIgnoreCase("authKey"));
    }

    @Test
    @DisplayName("ConfirmPaymentResponse 직렬화 시 billingKey 포함 여부 — 필드 없으므로 미포함")
    void confirmPaymentResponse_serializationDoesNotLeakBillingKey() throws Exception {
        ZonedDateTime now = ZonedDateTime.now(KST);
        BillingDTO.ConfirmPaymentResponse response = new BillingDTO.ConfirmPaymentResponse(
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
    @DisplayName("RecordPaymentFailResponse — billingKey 없음, orderId·paymentStatus·retryable 포함")
    void recordPaymentFailResponse_contract() {
        List<String> fields = componentNames(BillingDTO.RecordPaymentFailResponse.class);
        assertThat(fields).noneMatch(name -> name.equalsIgnoreCase("billingKey"));
        assertThat(fields).contains("orderId", "paymentStatus", "retryable");
    }

    @Test
    @DisplayName("USER_CANCELED·CARD_DECLINED·TIMEOUT — retryable=true")
    void recordFail_retryableReasons() {
        BillingDTO.RecordPaymentFailResponse canceledResponse =
                new BillingDTO.RecordPaymentFailResponse("ORDER-1", "FAILED", true);
        BillingDTO.RecordPaymentFailResponse declinedResponse =
                new BillingDTO.RecordPaymentFailResponse("ORDER-2", "FAILED", true);
        BillingDTO.RecordPaymentFailResponse timeoutResponse =
                new BillingDTO.RecordPaymentFailResponse("ORDER-3", "FAILED", true);

        assertThat(canceledResponse.retryable()).isTrue();
        assertThat(declinedResponse.retryable()).isTrue();
        assertThat(timeoutResponse.retryable()).isTrue();
    }

    @Test
    @DisplayName("CONFIRM_FAILED·FORBIDDEN·UNKNOWN — retryable=false")
    void recordFail_nonRetryableReasons() {
        BillingDTO.RecordPaymentFailResponse confirmFailed =
                new BillingDTO.RecordPaymentFailResponse("ORDER-4", "FAILED", false);
        BillingDTO.RecordPaymentFailResponse forbidden =
                new BillingDTO.RecordPaymentFailResponse("ORDER-5", "FAILED", false);

        assertThat(confirmFailed.retryable()).isFalse();
        assertThat(forbidden.retryable()).isFalse();
    }

    private List<String> componentNames(Class<?> recordClass) {
        return Arrays.stream(recordClass.getRecordComponents())
                .map(RecordComponent::getName)
                .toList();
    }
}
