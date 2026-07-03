package kr.co.carrer.user.billing.client;

import io.netty.channel.ChannelOption;
import jakarta.annotation.PostConstruct;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.client.dto.TossBillingAuthResponse;
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

// billingKey 발행 전용 — 응답의 billingKey 필드를 로그에 절대 출력하지 않음
// 4xx: 잘못된 authKey 등 클라이언트 오류 → BILLING_AUTHORIZATION_FAILED
// 5xx: Toss 서버 오류 → BILLING_AUTHORIZATION_FAILED (billingKey 미발급 확실 — RECONCILING 불필요)
@Slf4j
@Component
@ConditionalOnProperty(name = "toss.mock", havingValue = "false", matchIfMissing = true)
@RequiredArgsConstructor
public class TossBillingAuthorizationClient implements BillingAuthorizationClient {

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

    @Override
    public TossBillingAuthResponse issue(String authKey, String customerKey) {
        try {
            return webClient.post()
                    .uri("/v1/billing/authorizations/issue")
                    .header("Authorization", "Basic " + encodedSecretKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(Map.of("authKey", authKey, "customerKey", customerKey))
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, response ->
                            response.bodyToMono(String.class).defaultIfEmpty("").map(body -> {
                                log.warn("Toss billing auth 4xx: status={}", response.statusCode().value());
                                return new CustomException(BillingErrorCode.BILLING_AUTHORIZATION_FAILED);
                            })
                    )
                    .onStatus(HttpStatusCode::is5xxServerError, response ->
                            response.bodyToMono(String.class).defaultIfEmpty("").map(body -> {
                                log.warn("Toss billing auth 5xx: status={}", response.statusCode().value());
                                return new CustomException(BillingErrorCode.BILLING_AUTHORIZATION_FAILED);
                            })
                    )
                    .bodyToMono(TossBillingAuthResponse.class)
                    .block();
        } catch (CustomException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Toss billing auth error: {}", e.getMessage());
            throw new CustomException(BillingErrorCode.BILLING_AUTHORIZATION_FAILED);
        }
    }
}
