package kr.co.carrer.user.billing.client;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.client.dto.TossBillingAuthResponse;
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

class TossBillingAuthorizationClientTest {

    private MockWebServer server;
    private TossBillingAuthorizationClient client;

    @BeforeEach
    void setUp() throws Exception {
        server = new MockWebServer();
        server.start();

        client = new TossBillingAuthorizationClient(WebClient.builder());
        setField(client, "baseUrl", server.url("").toString().replaceAll("/$", ""));
        setField(client, "secretKey", "test-secret-key");
        client.init();
    }

    @AfterEach
    void tearDown() throws IOException {
        server.shutdown();
    }

    @Test
    @DisplayName("성공 응답 — billingKey·card 파싱 완료")
    void issue_success() throws Exception {
        server.enqueue(new MockResponse()
                .setBody("{\"billingKey\":\"bk_abc123\",\"customerKey\":\"ck_test\"," +
                         "\"authenticatedAt\":\"2026-06-23T10:00:00+09:00\"," +
                         "\"card\":{\"company\":\"현대\",\"number\":\"12**-****-****-3456\"}}")
                .addHeader("Content-Type", "application/json"));

        TossBillingAuthResponse response = client.issue("authKey1", "ck_test");

        assertThat(response.billingKey()).isEqualTo("bk_abc123");
        assertThat(response.customerKey()).isEqualTo("ck_test");
        assertThat(response.card()).isNotNull();
        assertThat(response.card().company()).isEqualTo("현대");
        assertThat(response.card().number()).isEqualTo("12**-****-****-3456");
        assertThat(response.authenticatedAt()).isNotNull();

        RecordedRequest request = server.takeRequest();
        assertThat(request.getMethod()).isEqualTo("POST");
        assertThat(request.getPath()).isEqualTo("/v1/billing/authorizations/issue");
        assertThat(request.getHeader("Authorization")).startsWith("Basic ");
    }

    @Test
    @DisplayName("400 응답 — BILLING_AUTHORIZATION_FAILED")
    void issue_400_authorizationFailed() {
        server.enqueue(new MockResponse()
                .setResponseCode(400)
                .setBody("{\"code\":\"INVALID_REQUEST\",\"message\":\"잘못된 요청\"}")
                .addHeader("Content-Type", "application/json"));

        assertThatThrownBy(() -> client.issue("bad-key", "ck_test"))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(BillingErrorCode.BILLING_AUTHORIZATION_FAILED));
    }

    @Test
    @DisplayName("401 응답 — BILLING_AUTHORIZATION_FAILED")
    void issue_401_authorizationFailed() {
        server.enqueue(new MockResponse()
                .setResponseCode(401)
                .setBody("{\"code\":\"UNAUTHORIZED_KEY\"}")
                .addHeader("Content-Type", "application/json"));

        assertThatThrownBy(() -> client.issue("authKey1", "ck_test"))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(BillingErrorCode.BILLING_AUTHORIZATION_FAILED));
    }

    @Test
    @DisplayName("500 응답 — BILLING_AUTHORIZATION_FAILED")
    void issue_500_authorizationFailed() {
        server.enqueue(new MockResponse().setResponseCode(500));

        assertThatThrownBy(() -> client.issue("authKey1", "ck_test"))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(BillingErrorCode.BILLING_AUTHORIZATION_FAILED));
    }

    @Test
    @DisplayName("응답 지연 — BILLING_AUTHORIZATION_FAILED")
    void issue_timeout_authorizationFailed() {
        server.enqueue(new MockResponse()
                .setBody("{\"billingKey\":\"bk_abc123\"}")
                .addHeader("Content-Type", "application/json")
                .setBodyDelay(12, java.util.concurrent.TimeUnit.SECONDS));

        assertThatThrownBy(() -> client.issue("authKey1", "ck_test"))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(BillingErrorCode.BILLING_AUTHORIZATION_FAILED));
    }

    @Test
    @DisplayName("malformed JSON — BILLING_AUTHORIZATION_FAILED")
    void issue_malformedJson_authorizationFailed() {
        server.enqueue(new MockResponse()
                .setBody("not-json{{")
                .addHeader("Content-Type", "application/json"));

        assertThatThrownBy(() -> client.issue("authKey1", "ck_test"))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(BillingErrorCode.BILLING_AUTHORIZATION_FAILED));
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
