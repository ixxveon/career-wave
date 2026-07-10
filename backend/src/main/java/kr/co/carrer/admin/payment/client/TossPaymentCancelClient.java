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
// 4xx → TOSS_REFUND_FAILED (Toss가 요청을 명시적으로 거부함 — 이미 취소된 건, 취소 기간 초과 등. 확정 실패로 간주해도 안전)
// 5xx/timeout/네트워크 예외 → TOSS_REFUND_AMBIGUOUS (Toss 쪽에서 실제로는 취소가 처리됐을 수도 있는 불확실한 상태.
//   확정 실패로 기록하면 안 되고, 호출자가 대시보드 확인/수동 재처리를 유도해야 한다)
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
                                return new CustomException(AdminPaymentErrorCode.TOSS_REFUND_AMBIGUOUS);
                            })
                    )
                    .bodyToMono(TossCancelResponse.class)
                    .block();

            if (response == null || !"CANCELED".equals(response.status())) {
                throw new CustomException(AdminPaymentErrorCode.TOSS_REFUND_AMBIGUOUS);
            }
            return response;
        } catch (CustomException e) {
            throw e;
        } catch (Exception e) {
            // 타임아웃/연결 예외 등 — Toss 응답을 아예 못 받은 경우라 실제 취소 여부를 알 수 없다.
            log.warn("Toss payment cancel ambiguous error: paymentKey={}, type={}", paymentKey, e.getClass().getSimpleName());
            throw new CustomException(AdminPaymentErrorCode.TOSS_REFUND_AMBIGUOUS);
        }
    }
}
