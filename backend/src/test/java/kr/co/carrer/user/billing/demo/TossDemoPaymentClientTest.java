package kr.co.carrer.user.billing.demo;

import kr.co.carrer.global.exception.CustomException;
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

class TossDemoPaymentClientTest {

    private MockWebServer server;
    private TossDemoPaymentClient client;

    @BeforeEach
    void setUp() throws Exception {
        server = new MockWebServer();
        server.start();

        client = new TossDemoPaymentClient(WebClient.builder());
        setField(client, "baseUrl", server.url("").toString().replaceAll("/$", ""));
        setField(client, "secretKey", "test-secret-key");
        client.init();
    }

    @AfterEach
    void tearDown() throws IOException {
        server.shutdown();
    }

    @Test
    @DisplayName("성공 응답 — DONE 상태 및 토스페이 간편결제 정보 파싱")
    void confirm_success() throws Exception {
        server.enqueue(new MockResponse()
                .setBody("{\"paymentKey\":\"pay_demo\",\"orderId\":\"demo_1\",\"orderName\":\"커리어웨이브 데모 결제\"," +
                         "\"status\":\"DONE\",\"totalAmount\":1000,\"currency\":\"KRW\",\"method\":\"간편결제\"," +
                         "\"approvedAt\":\"2026-07-06T10:00:00+09:00\"," +
                         "\"easyPay\":{\"provider\":\"토스페이\",\"amount\":1000,\"discountAmount\":0}}")
                .addHeader("Content-Type", "application/json"));

        TossPaymentConfirmResult result = client.confirm("pay_demo", "demo_1", 1000);

        assertThat(result.status()).isEqualTo("DONE");
        assertThat(result.totalAmount()).isEqualTo(1000);
        assertThat(result.method()).isEqualTo("간편결제");
        assertThat(result.easyPay()).isNotNull();
        assertThat(result.easyPay().provider()).isEqualTo("토스페이");

        // 요청 본문에 paymentKey/orderId/amount 가 그대로 전달되는지 확인
        RecordedRequest recorded = server.takeRequest();
        assertThat(recorded.getPath()).isEqualTo("/v1/payments/confirm");
        assertThat(recorded.getBody().readUtf8()).contains("\"paymentKey\":\"pay_demo\"", "\"amount\":1000");
    }

    @Test
    @DisplayName("4xx 응답 — PAYMENT_CONFIRM_FAILED 예외")
    void confirm_clientError() {
        server.enqueue(new MockResponse().setResponseCode(400)
                .setBody("{\"code\":\"NOT_FOUND_PAYMENT\"}")
                .addHeader("Content-Type", "application/json"));

        assertThatThrownBy(() -> client.confirm("bad", "demo_1", 1000))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(BillingErrorCode.PAYMENT_CONFIRM_FAILED));
    }

    @Test
    @DisplayName("DONE 이 아닌 상태 — PAYMENT_CONFIRM_FAILED 예외")
    void confirm_notDone() {
        server.enqueue(new MockResponse()
                .setBody("{\"paymentKey\":\"pay_demo\",\"orderId\":\"demo_1\",\"status\":\"ABORTED\",\"totalAmount\":1000}")
                .addHeader("Content-Type", "application/json"));

        assertThatThrownBy(() -> client.confirm("pay_demo", "demo_1", 1000))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(BillingErrorCode.PAYMENT_CONFIRM_FAILED));
    }

    private static void setField(Object target, String name, Object value) throws Exception {
        Field field = target.getClass().getDeclaredField(name);
        field.setAccessible(true);
        field.set(target, value);
    }
}
