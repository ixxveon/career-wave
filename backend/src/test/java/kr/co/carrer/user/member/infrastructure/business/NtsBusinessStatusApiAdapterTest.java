package kr.co.carrer.user.member.infrastructure.business;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.member.dto.UserRegisterDto;
import kr.co.carrer.user.member.exception.UserAuthErrorCode;
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

class NtsBusinessStatusApiAdapterTest {

    private MockWebServer server;
    private NtsBusinessStatusApiAdapter adapter;

    @BeforeEach
    void setUp() throws Exception {
        server = new MockWebServer();
        server.start();

        adapter = new NtsBusinessStatusApiAdapter(WebClient.builder());
        setField(adapter, "baseUrl", server.url("/").toString().replaceAll("/$", ""));
        setField(adapter, "serviceKey", "test-key");
        // @PostConstruct init()을 수동 호출
        adapter.getClass().getDeclaredMethod("init").invoke(adapter);
    }

    @AfterEach
    void tearDown() throws IOException {
        server.shutdown();
    }

    // ─── 요청 형식 검증 ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("verify() 는 POST /status 를 호출하고 serviceKey를 쿼리 파라미터로 전달한다")
    void verify_요청URL_serviceKey_확인() throws Exception {
        server.enqueue(new MockResponse()
                .setBody("{\"status_code\":\"OK\",\"data\":[{\"b_no\":\"1234567890\",\"b_stt\":\"계속사업자\",\"b_stt_cd\":\"01\",\"tax_type\":\"부가가치세 일반과세자\"}]}")
                .addHeader("Content-Type", "application/json"));

        adapter.verify("1234567890");

        RecordedRequest request = server.takeRequest();
        assertThat(request.getMethod()).isEqualTo("POST");
        assertThat(request.getPath()).startsWith("/status");
        assertThat(request.getPath()).contains("serviceKey=test-key");
    }

    @Test
    @DisplayName("verify() 요청 body는 {\"b_no\":[\"1234567890\"]} 형식이다")
    void verify_요청_body_형식() throws Exception {
        server.enqueue(new MockResponse()
                .setBody("{\"status_code\":\"OK\",\"data\":[{\"b_no\":\"1234567890\",\"b_stt\":\"계속사업자\",\"b_stt_cd\":\"01\",\"tax_type\":\"\"}]}")
                .addHeader("Content-Type", "application/json"));

        adapter.verify("1234567890");

        RecordedRequest request = server.takeRequest();
        String body = request.getBody().readUtf8();
        assertThat(body).contains("\"b_no\"");
        assertThat(body).contains("\"1234567890\"");
    }

    // ─── 상태 코드 매핑 — verify() ────────────────────────────────────────────────

    @Test
    @DisplayName("b_stt_cd=01(계속사업자)이면 verify()는 true를 반환한다")
    void verify_계속사업자_true() {
        server.enqueue(new MockResponse()
                .setBody("{\"status_code\":\"OK\",\"data\":[{\"b_no\":\"1234567890\",\"b_stt\":\"계속사업자\",\"b_stt_cd\":\"01\",\"tax_type\":\"\"}]}")
                .addHeader("Content-Type", "application/json"));

        assertThat(adapter.verify("1234567890")).isTrue();
    }

    @Test
    @DisplayName("b_stt_cd=02(휴업자)이면 verify()는 false를 반환한다")
    void verify_휴업자_false() {
        server.enqueue(new MockResponse()
                .setBody("{\"status_code\":\"OK\",\"data\":[{\"b_no\":\"9876543210\",\"b_stt\":\"휴업자\",\"b_stt_cd\":\"02\",\"tax_type\":\"\"}]}")
                .addHeader("Content-Type", "application/json"));

        assertThat(adapter.verify("9876543210")).isFalse();
    }

    @Test
    @DisplayName("b_stt_cd=03(폐업자)이면 verify()는 false를 반환한다")
    void verify_폐업자_false() {
        server.enqueue(new MockResponse()
                .setBody("{\"status_code\":\"OK\",\"data\":[{\"b_no\":\"1111111111\",\"b_stt\":\"폐업자\",\"b_stt_cd\":\"03\",\"tax_type\":\"\"}]}")
                .addHeader("Content-Type", "application/json"));

        assertThat(adapter.verify("1111111111")).isFalse();
    }

    @Test
    @DisplayName("data가 빈 배열이면 미등록 사업자 — verify()는 COMPANY_BUSINESS_VERIFICATION_UNAVAILABLE을 throw한다")
    void verify_미등록_data_빈배열_예외() {
        server.enqueue(new MockResponse()
                .setBody("{\"status_code\":\"OK\",\"data\":[]}")
                .addHeader("Content-Type", "application/json"));

        assertThatThrownBy(() -> adapter.verify("0000000000"))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(UserAuthErrorCode.COMPANY_BUSINESS_VERIFICATION_UNAVAILABLE));
    }

    // ─── 상태 코드 매핑 — check() ────────────────────────────────────────────────

    @Test
    @DisplayName("check() — b_stt_cd=01이면 valid=true, businessStatus=CONTINUING")
    void check_계속사업자_CONTINUING() {
        server.enqueue(new MockResponse()
                .setBody("{\"status_code\":\"OK\",\"data\":[{\"b_no\":\"1234567890\",\"b_stt\":\"계속사업자\",\"b_stt_cd\":\"01\",\"tax_type\":\"\"}]}")
                .addHeader("Content-Type", "application/json"));

        UserRegisterDto.ResponseCheckBusinessNumber result = adapter.check("1234567890");
        assertThat(result.valid()).isTrue();
        assertThat(result.businessStatus()).isEqualTo("CONTINUING");
    }

    @Test
    @DisplayName("check() — b_stt_cd=02이면 valid=false, businessStatus=SUSPENDED")
    void check_휴업자_SUSPENDED() {
        server.enqueue(new MockResponse()
                .setBody("{\"status_code\":\"OK\",\"data\":[{\"b_no\":\"9876543210\",\"b_stt\":\"휴업자\",\"b_stt_cd\":\"02\",\"tax_type\":\"\"}]}")
                .addHeader("Content-Type", "application/json"));

        UserRegisterDto.ResponseCheckBusinessNumber result = adapter.check("9876543210");
        assertThat(result.valid()).isFalse();
        assertThat(result.businessStatus()).isEqualTo("SUSPENDED");
    }

    @Test
    @DisplayName("check() — b_stt_cd=03이면 valid=false, businessStatus=CLOSED")
    void check_폐업자_CLOSED() {
        server.enqueue(new MockResponse()
                .setBody("{\"status_code\":\"OK\",\"data\":[{\"b_no\":\"1111111111\",\"b_stt\":\"폐업자\",\"b_stt_cd\":\"03\",\"tax_type\":\"\"}]}")
                .addHeader("Content-Type", "application/json"));

        UserRegisterDto.ResponseCheckBusinessNumber result = adapter.check("1111111111");
        assertThat(result.valid()).isFalse();
        assertThat(result.businessStatus()).isEqualTo("CLOSED");
    }

    @Test
    @DisplayName("check() — data 빈배열(미등록)이면 valid=false, businessStatus=NOT_REGISTERED")
    void check_미등록_NOT_REGISTERED() {
        server.enqueue(new MockResponse()
                .setBody("{\"status_code\":\"OK\",\"data\":[]}")
                .addHeader("Content-Type", "application/json"));

        UserRegisterDto.ResponseCheckBusinessNumber result = adapter.check("0000000000");
        assertThat(result.valid()).isFalse();
        assertThat(result.businessStatus()).isEqualTo("NOT_REGISTERED");
    }

    // ─── 오류 응답 처리 ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("4xx 응답은 COMPANY_BUSINESS_VERIFICATION_UNAVAILABLE을 throw한다")
    void verify_4xx_UNAVAILABLE() {
        server.enqueue(new MockResponse().setResponseCode(400));

        assertThatThrownBy(() -> adapter.verify("1234567890"))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(UserAuthErrorCode.COMPANY_BUSINESS_VERIFICATION_UNAVAILABLE));
    }

    @Test
    @DisplayName("5xx 응답은 COMPANY_BUSINESS_VERIFICATION_UNAVAILABLE을 throw한다")
    void verify_5xx_UNAVAILABLE() {
        server.enqueue(new MockResponse().setResponseCode(500));

        assertThatThrownBy(() -> adapter.verify("1234567890"))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(UserAuthErrorCode.COMPANY_BUSINESS_VERIFICATION_UNAVAILABLE));
    }

    @Test
    @DisplayName("응답 지연(타임아웃)은 COMPANY_BUSINESS_VERIFICATION_UNAVAILABLE을 throw한다")
    void verify_타임아웃_UNAVAILABLE() {
        // 응답을 보내지 않고 연결을 닫아 타임아웃을 유발
        server.enqueue(new MockResponse()
                .setBody("{\"status_code\":\"OK\",\"data\":[{\"b_stt_cd\":\"01\"}]}")
                .addHeader("Content-Type", "application/json")
                .setBodyDelay(6, java.util.concurrent.TimeUnit.SECONDS));

        assertThatThrownBy(() -> adapter.verify("1234567890"))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(UserAuthErrorCode.COMPANY_BUSINESS_VERIFICATION_UNAVAILABLE));
    }

    // ─── 내부 유틸 ───────────────────────────────────────────────────────────────

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
