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
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;
import java.util.Base64;
import java.util.Optional;

// RECONCILING 대사용 — Toss 결제 상태 조회 전용 클라이언트
// GET /v1/payments/orders/{orderId}
// 결과: Optional.empty() → timeout/오류 → RECONCILING 유지
//       DONE → 결제 완료 → settle
//       그 외 → 실패 확정
@Slf4j
@Component
@ConditionalOnProperty(name = "toss.mock", havingValue = "false", matchIfMissing = true)
@RequiredArgsConstructor
public class TossPaymentQueryClient implements PaymentQueryClient {

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

    // Optional.empty() → Toss 오류 또는 timeout → RECONCILING 유지
    @Override
    public Optional<TossBillingPaymentResponse> queryByOrderId(String orderId) {
        try {
            TossBillingPaymentResponse response = webClient.get()
                    .uri("/v1/payments/orders/" + orderId)
                    .header("Authorization", "Basic " + encodedSecretKey)
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, resp ->
                            resp.bodyToMono(String.class).defaultIfEmpty("").map(b -> {
                                log.warn("Toss payment query 4xx: orderId={}, status={}", orderId, resp.statusCode().value());
                                return new CustomException(BillingErrorCode.BILLING_ORDER_NOT_FOUND);
                            })
                    )
                    .onStatus(HttpStatusCode::is5xxServerError, resp ->
                            resp.bodyToMono(String.class).defaultIfEmpty("").map(b -> {
                                log.warn("Toss payment query 5xx: orderId={}, status={}", orderId, resp.statusCode().value());
                                return new CustomException(BillingErrorCode.PAYMENT_RECONCILIATION_REQUIRED);
                            })
                    )
                    .bodyToMono(TossBillingPaymentResponse.class)
                    .block();
            return Optional.ofNullable(response);
        } catch (CustomException e) {
            log.warn("Toss payment query failed: orderId={}, error={}", orderId, e.getErrorCode());
            if (e.getErrorCode() == BillingErrorCode.PAYMENT_RECONCILIATION_REQUIRED) {
                return Optional.empty(); // 5xx 일시 오류 → RECONCILING 유지
            }
            throw e; // 4xx 영구 실패 → 호출자에서 FAILED 확정
        } catch (Exception e) {
            log.warn("Toss payment query error: orderId={}, type={}", orderId, e.getClass().getSimpleName());
            return Optional.empty();
        }
    }
}
