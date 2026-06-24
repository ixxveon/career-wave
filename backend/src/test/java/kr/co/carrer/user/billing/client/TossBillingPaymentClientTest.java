package kr.co.carrer.user.billing.client;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.client.dto.TossBillingPaymentResponse;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.IOException;
import java.lang.reflect.Field;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TossBillingPaymentClientTest {

    private MockWebServer server;
    private TossBillingPaymentClient client;

    @BeforeEach
    void setUp() throws Exception {
        server = new MockWebServer();
        server.start();

        client = new TossBillingPaymentClient(WebClient.builder());
        setField(client, "baseUrl", server.url("").toString().replaceAll("/$", ""));
        setField(client, "secretKey", "test-secret-key");
        client.init();
    }

    @AfterEach
    void tearDown() throws IOException {
        server.shutdown();
    }

    @Test
    @DisplayName("성공 응답 — DONE 상태, paymentKey·amount·currency 파싱")
    void pay_success() throws Exception {
        server.enqueue(new MockResponse()
                .setBody("{\"paymentKey\":\"pay_abc\",\"orderId\":\"ORDER-123\"," +
                         "\"status\":\"DONE\",\"totalAmount\":29000,\"currency\":\"KRW\"," +
                         "\"approvedAt\":\"2026-06-23T10:00:00+09:00\"}")
                .addHeader("Content-Type", "application/json"));

        TossBillingPaymentResponse response = client.pay(
                "billing-key-plain", "ck_test", "user@example.com", "홍길동",
                "ORDER-123", "서류 AI 코칭", 29000);

        assertThat(response.paymentKey()).isEqualTo("pay_abc");
        assertThat(response.orderId()).isEqualTo("ORDER-123");
        assertThat(response.status()).isEqualTo("DONE");
        assertThat(response.totalAmount()).isEqualTo(29000);
        assertThat(response.currency()).isEqualTo("KRW");
        assertThat(response.approvedAt()).isNotNull();

        RecordedRequest request = server.takeRequest();
        assertThat(request.getMethod()).isEqualTo("POST");
        assertThat(request.getPath()).isEqualTo("/v1/billing/billing-key-plain");
        assertThat(request.getHeader("Authorization")).startsWith("Basic ");
    }

    @Test
    @DisplayName("status != DONE — PAYMENT_CONFIRM_FAILED")
    void pay_statusNotDone_confirmFailed() {
        server.enqueue(new MockResponse()
                .setBody("{\"paymentKey\":\"pay_abc\",\"orderId\":\"ORDER-123\"," +
                         "\"status\":\"ABORTED\",\"totalAmount\":29000,\"currency\":\"KRW\"}")
                .addHeader("Content-Type", "application/json"));

        assertThatThrownBy(() ->
                client.pay("bk", "ck", "e@e.com", "홍길동", "ORDER-123", "코칭", 29000))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(BillingErrorCode.PAYMENT_CONFIRM_FAILED));
    }

    @Test
    @DisplayName("카드 거절 400 — PAYMENT_CONFIRM_FAILED")
    void pay_cardDeclined_400() {
        server.enqueue(new MockResponse()
                .setResponseCode(400)
                .setBody("{\"code\":\"CARD_DECLINED\",\"message\":\"카드 승인 실패\"}")
                .addHeader("Content-Type", "application/json"));

        assertThatThrownBy(() ->
                client.pay("bk", "ck", "e@e.com", "홍길동", "ORDER-123", "코칭", 29000))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(BillingErrorCode.PAYMENT_CONFIRM_FAILED));
    }

    @Test
    @DisplayName("잔액 부족 400 — PAYMENT_CONFIRM_FAILED")
    void pay_insufficientBalance_400() {
        server.enqueue(new MockResponse()
                .setResponseCode(400)
                .setBody("{\"code\":\"EXCEED_MAX_ONE_DAY_WITHDRAW_AMOUNT\"}")
                .addHeader("Content-Type", "application/json"));

        assertThatThrownBy(() ->
                client.pay("bk", "ck", "e@e.com", "홍길동", "ORDER-123", "코칭", 29000))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(BillingErrorCode.PAYMENT_CONFIRM_FAILED));
    }

    @Test
    @DisplayName("500 서버 오류 — PAYMENT_RECONCILIATION_REQUIRED (결제 결과 미확정)")
    void pay_serverError_500() {
        server.enqueue(new MockResponse().setResponseCode(500));

        assertThatThrownBy(() ->
                client.pay("bk", "ck", "e@e.com", "홍길동", "ORDER-123", "코칭", 29000))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(BillingErrorCode.PAYMENT_RECONCILIATION_REQUIRED));
    }

    @Test
    @DisplayName("응답 지연(timeout) — PAYMENT_RECONCILIATION_REQUIRED (결제 결과 미확정)")
    void pay_timeout_reconciliationRequired() {
        server.enqueue(new MockResponse()
                .setBody("{\"status\":\"DONE\"}")
                .addHeader("Content-Type", "application/json")
                .setBodyDelay(12, java.util.concurrent.TimeUnit.SECONDS));

        assertThatThrownBy(() ->
                client.pay("bk", "ck", "e@e.com", "홍길동", "ORDER-123", "코칭", 29000))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(BillingErrorCode.PAYMENT_RECONCILIATION_REQUIRED));
    }

    private void setField(Object target, String name, Object value) throws Exception {
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
    }
}
