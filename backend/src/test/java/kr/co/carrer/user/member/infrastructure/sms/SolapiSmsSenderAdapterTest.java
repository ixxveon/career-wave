package kr.co.carrer.user.member.infrastructure.sms;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.member.exception.UserAuthErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.lang.reflect.Field;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@SuppressWarnings({"unchecked", "rawtypes"})
class SolapiSmsSenderAdapterTest {

    private WebClient.Builder webClientBuilder;
    private WebClient webClient;
    private WebClient.RequestBodyUriSpec postSpec;   // .post() / .uri() / .header() / .bodyValue()
    private WebClient.RequestHeadersSpec headersSpec; // after .bodyValue()
    private WebClient.ResponseSpec responseSpec;
    private SolapiSmsSenderAdapter adapter;

    @BeforeEach
    void setUp() throws Exception {
        webClientBuilder = mock(WebClient.Builder.class);
        webClient = mock(WebClient.class);
        postSpec = mock(WebClient.RequestBodyUriSpec.class);
        headersSpec = mock(WebClient.RequestHeadersSpec.class);
        responseSpec = mock(WebClient.ResponseSpec.class);

        // WebClient 체인: post() → uri() → header() ... → bodyValue() → retrieve()
        when(webClientBuilder.baseUrl(anyString())).thenReturn(webClientBuilder);
        when(webClientBuilder.build()).thenReturn(webClient);
        when(webClient.post()).thenReturn(postSpec);
        when(postSpec.uri(anyString())).thenReturn(postSpec);
        doReturn(postSpec).when(postSpec).header(anyString(), anyString()); // header는 postSpec에서 호출
        doReturn(headersSpec).when(postSpec).bodyValue(any());              // bodyValue → RequestHeadersSpec
        when(headersSpec.retrieve()).thenReturn(responseSpec);

        adapter = new SolapiSmsSenderAdapter(webClientBuilder);
        setField(adapter, "baseUrl", "https://api.solapi.com");
        setField(adapter, "apiKey", "test-api-key");
        setField(adapter, "apiSecret", "test-api-secret-12345678901234567890123456789012");
        setField(adapter, "senderPhone", "01000000000");
    }

    // ─── SMS 발송 성공 ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("SMS 발송 성공 시 SOLAPI /messages/v4/send-many 엔드포인트를 호출한다")
    void sendVerificationCode_성공_SOLAPI_엔드포인트_호출() {
        when(responseSpec.toBodilessEntity())
                .thenReturn(Mono.just(ResponseEntity.ok().build()));

        adapter.sendVerificationCode("01012345678", "123456");

        verify(postSpec, times(1)).uri("/messages/v4/send-many");
    }

    @Test
    @DisplayName("SMS 발송 성공 시 HMAC-SHA256 Authorization 헤더를 포함한다")
    void sendVerificationCode_Authorization_헤더_포함() {
        when(responseSpec.toBodilessEntity())
                .thenReturn(Mono.just(ResponseEntity.ok().build()));

        adapter.sendVerificationCode("01012345678", "654321");

        // header()는 postSpec에서 호출됨 (bodyValue 이전 단계)
        verify(postSpec, atLeastOnce()).header(eq("Authorization"), argThat((String v) ->
                v.startsWith("HMAC-SHA256 apiKey=test-api-key")
        ));
    }

    // ─── WebClientResponseException → VERIFICATION_SMS_UNAVAILABLE ──────────────

    @Test
    @DisplayName("SOLAPI HTTP 오류 시 VERIFICATION_SMS_UNAVAILABLE를 반환한다")
    void sendVerificationCode_HTTP오류_VERIFICATION_SMS_UNAVAILABLE() {
        when(responseSpec.toBodilessEntity())
                .thenReturn(Mono.error(WebClientResponseException.create(400, "Bad Request", null, null, null)));

        assertThatThrownBy(() -> adapter.sendVerificationCode("01012345678", "123456"))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.VERIFICATION_SMS_UNAVAILABLE));
    }

    @Test
    @DisplayName("SOLAPI 연결 장애 시 VERIFICATION_SMS_UNAVAILABLE를 반환한다")
    void sendVerificationCode_연결장애_VERIFICATION_SMS_UNAVAILABLE() {
        when(responseSpec.toBodilessEntity())
                .thenReturn(Mono.error(new RuntimeException("connection refused")));

        assertThatThrownBy(() -> adapter.sendVerificationCode("01012345678", "123456"))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.VERIFICATION_SMS_UNAVAILABLE));
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
