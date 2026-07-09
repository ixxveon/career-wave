package kr.co.carrer.admin.payment.client;

import io.netty.channel.ChannelOption;
import jakarta.annotation.PostConstruct;
import kr.co.carrer.admin.payment.client.dto.TossCancelResponse;
import kr.co.carrer.admin.payment.exception.AdminPaymentErrorCode;
import kr.co.carrer.global.exception.CustomException;
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

// 관리자 환불 확정 시 실제 Toss 결제를 취소하는 클라이언트.
// POST /v1/payments/{paymentKey}/cancel
// 4xx → TOSS_REFUND_FAILED (이미 취소된 건, 취소 기간 초과 등 — 재시도 무의미)
// 5xx/timeout → TOSS_REFUND_FAILED (호출자가 REQUIRES_NEW 트랜잭션으로 실패 이력만 별도 커밋 후 재시도 유도)
@Slf4j
@Component
@ConditionalOnProperty(name = "toss.mock", havingValue = "false", matchIfMissing = true)
@RequiredArgsConstructor
public class TossPaymentCancelClient implements PaymentCancelClient {

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
    public TossCancelResponse cancel(String paymentKey, String cancelReason, int cancelAmount) {
        Map<String, Object> body = Map.of(
                "cancelReason", cancelReason,
                "cancelAmount", cancelAmount
        );
        try {
            TossCancelResponse response = webClient.post()
                    .uri("/v1/payments/" + paymentKey + "/cancel")
                    .header("Authorization", "Basic " + encodedSecretKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, resp ->
                            resp.bodyToMono(String.class).defaultIfEmpty("").map(b -> {
                                log.warn("Toss payment cancel 4xx: paymentKey={}, status={}, body={}",
                                        paymentKey, resp.statusCode().value(), b);
                                return new CustomException(AdminPaymentErrorCode.TOSS_REFUND_FAILED);
                            })
                    )
                    .onStatus(HttpStatusCode::is5xxServerError, resp ->
                            resp.bodyToMono(String.class).defaultIfEmpty("").map(b -> {
                                log.warn("Toss payment cancel 5xx: paymentKey={}, status={}", paymentKey, resp.statusCode().value());
                                return new CustomException(AdminPaymentErrorCode.TOSS_REFUND_FAILED);
                            })
                    )
                    .bodyToMono(TossCancelResponse.class)
                    .block();

            if (response == null || !"CANCELED".equals(response.status())) {
                throw new CustomException(AdminPaymentErrorCode.TOSS_REFUND_FAILED);
            }
            return response;
        } catch (CustomException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Toss payment cancel error: paymentKey={}, type={}", paymentKey, e.getClass().getSimpleName());
            throw new CustomException(AdminPaymentErrorCode.TOSS_REFUND_FAILED);
        }
    }
}
