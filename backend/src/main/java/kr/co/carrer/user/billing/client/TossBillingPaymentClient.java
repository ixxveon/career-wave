package kr.co.carrer.user.billing.client;

import io.netty.channel.ChannelOption;
import jakarta.annotation.PostConstruct;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.client.dto.TossBillingPaymentResponse;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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
@Slf4j
@Component
@RequiredArgsConstructor
public class TossBillingPaymentClient {

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
                    .onStatus(HttpStatusCode::isError, resp ->
                            resp.bodyToMono(String.class).defaultIfEmpty("").map(b -> {
                                log.warn("Toss billing payment failed: status={}", resp.statusCode().value());
                                return new CustomException(BillingErrorCode.PAYMENT_CONFIRM_FAILED);
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
            log.warn("Toss billing payment error: {}", e.getMessage());
            throw new CustomException(BillingErrorCode.PAYMENT_CONFIRM_FAILED);
        }
    }
}
