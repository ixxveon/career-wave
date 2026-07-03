package kr.co.carrer.user.billing.client;

import io.netty.channel.ChannelOption;
import jakarta.annotation.PostConstruct;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.client.dto.TossBillingPaymentResponse;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;
import java.util.Base64;
import java.util.Map;

// billingKey 기반 자동결제 실행 클라이언트
// billingKey는 URL 경로에 포함되지만 로그 레벨이 WARN으로 제한되어 평문 노출 없음 (application.yml 참고)
// 4xx → PAYMENT_CONFIRM_FAILED (클라이언트 오류, 즉시 실패)
// 5xx/timeout → PAYMENT_RECONCILIATION_REQUIRED (Toss 서버 측 문제 — 결제가 처리됐을 수 있음)
@Slf4j
@Component
@ConditionalOnProperty(name = "toss.mock", havingValue = "false", matchIfMissing = true)
@RequiredArgsConstructor
public class TossBillingPaymentClient implements BillingPaymentClient {

    @Value("${toss.base-url:https://api.tosspayments.com}")
    private String baseUrl;

    @Value("${toss.secret-key}")
    private String secretKey;

    private final WebClient.Builder webClientBuilder;

    private WebClient webClient;
    private String encodedSecretKey;

    @PostConstruct
    public void init() {
        this.encodedSecretKey = Base64.getEncoder().encodeToString((secretKey + ":").getBytes());
        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 3_000)
                .responseTimeout(Duration.ofSeconds(10));
        this.webClient = webClientBuilder
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .baseUrl(baseUrl)
                .build();
    }

    // plainBillingKey: AesCipher.decrypt() 결과 — 이 메서드 밖으로 유출 금지
    @Override
    public TossBillingPaymentResponse pay(String plainBillingKey,
                                           String customerKey, String customerEmail, String customerName,
                                           String orderId, String orderName, int amount) {
        Map<String, Object> body = Map.of(
                "customerKey", customerKey,
                "amount", amount,
                "orderId", orderId,
                "orderName", orderName,
                "customerEmail", customerEmail,
                "customerName", customerName
        );
        try {
            TossBillingPaymentResponse response = webClient.post()
                    .uri("/v1/billing/" + plainBillingKey)
                    .header("Authorization", "Basic " + encodedSecretKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, resp ->
                            resp.bodyToMono(String.class).defaultIfEmpty("").map(b -> {
                                log.warn("Toss billing payment 4xx: status={}", resp.statusCode().value());
                                return new CustomException(BillingErrorCode.PAYMENT_CONFIRM_FAILED);
                            })
                    )
                    .onStatus(HttpStatusCode::is5xxServerError, resp ->
                            resp.bodyToMono(String.class).defaultIfEmpty("").map(b -> {
                                // 5xx: Toss 서버 측 오류 — 결제가 처리됐을 가능성 있음 → RECONCILING 전이
                                log.warn("Toss billing payment 5xx: status={} — RECONCILING 필요", resp.statusCode().value());
                                return new CustomException(BillingErrorCode.PAYMENT_RECONCILIATION_REQUIRED);
                            })
                    )
                    .bodyToMono(TossBillingPaymentResponse.class)
                    .block();

            if (response == null || !"DONE".equals(response.status())) {
                throw new CustomException(BillingErrorCode.PAYMENT_CONFIRM_FAILED);
            }
            return response;
        } catch (CustomException e) {
            throw e;
        } catch (Exception e) {
            if (isTimeoutException(e)) {
                // timeout: 요청이 Toss에 도달했을 수 있음 → RECONCILING 전이
                log.warn("Toss billing payment timeout: {} — RECONCILING 필요", e.getClass().getSimpleName());
                throw new CustomException(BillingErrorCode.PAYMENT_RECONCILIATION_REQUIRED);
            }
            log.warn("Toss billing payment error: {}", e.getClass().getSimpleName());
            throw new CustomException(BillingErrorCode.PAYMENT_CONFIRM_FAILED);
        }
    }

    // 429 rate limit: 무한 재시도 방지 — caller가 재시도하지 않도록 4xx 경로로 처리됨
    // (is4xxClientError가 429를 포함하므로 별도 처리 없이 PAYMENT_CONFIRM_FAILED로 즉시 실패)

    private boolean isTimeoutException(Exception e) {
        Throwable cause = e;
        while (cause != null) {
            String name = cause.getClass().getSimpleName();
            if (name.contains("TimeoutException") || name.contains("ReadTimeout") || name.contains("ConnectTimeout")) {
                return true;
            }
            cause = cause.getCause();
        }
        return false;
    }
}
