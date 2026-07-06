package kr.co.carrer.user.billing.demo;

import io.netty.channel.ChannelOption;
import jakarta.annotation.PostConstruct;
import kr.co.carrer.global.exception.CustomException;
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

/**
 * 데모 전용 일반결제(단건) 승인 클라이언트.
 *
 * <p>기존 자동결제(빌링) 클라이언트({@link kr.co.carrer.user.billing.client.TossBillingPaymentClient})와 달리
 * {@code toss.mock} 스위치의 영향을 받지 않는다 — 항상 실제 Toss 테스트 API를 호출해 토스페이 QR 결제창을 띄운다.
 * (이슈 #986 의 mock 게이트웨이와 완전히 독립적)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TossDemoPaymentClient {

    @Value("${toss.base-url:https://api.tosspayments.com}")
    private String baseUrl;

    // 데모 클라이언트는 무조건 로드되므로, 키 미설정 환경(예: toss.mock=true 로만 운영)에서도
    // 컨텍스트 기동이 실패하지 않도록 빈 기본값을 둔다. 키가 없으면 실제 confirm 호출만 401로 실패한다.
    @Value("${toss.secret-key:}")
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

    /** Toss 일반결제 승인. 성공 시 status=DONE 인 결제 결과를 반환한다. */
    public TossPaymentConfirmResult confirm(String paymentKey, String orderId, int amount) {
        Map<String, Object> body = Map.of(
                "paymentKey", paymentKey,
                "orderId", orderId,
                "amount", amount
        );
        try {
            TossPaymentConfirmResult result = webClient.post()
                    .uri("/v1/payments/confirm")
                    .header("Authorization", "Basic " + encodedSecretKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, resp ->
                            resp.bodyToMono(String.class).defaultIfEmpty("").map(b -> {
                                // Toss 에러 본문(code/message)은 진단에 유용하며 사용자 PII가 아니므로 함께 로깅한다.
                                log.warn("[TOSS-DEMO] confirm 실패: status={}, body={}", resp.statusCode().value(), b);
                                return new CustomException(BillingErrorCode.PAYMENT_CONFIRM_FAILED);
                            })
                    )
                    .bodyToMono(TossPaymentConfirmResult.class)
                    .block();

            if (result == null || !"DONE".equals(result.status())) {
                throw new CustomException(BillingErrorCode.PAYMENT_CONFIRM_FAILED);
            }
            log.info("[TOSS-DEMO] confirm 성공(DONE): orderId={}, amount={}, method={}",
                    orderId, result.totalAmount(), result.method());
            return result;
        } catch (CustomException e) {
            throw e;
        } catch (Exception e) {
            log.warn("[TOSS-DEMO] confirm 오류: {}", e.getClass().getSimpleName(), e);
            throw new CustomException(BillingErrorCode.PAYMENT_CONFIRM_FAILED);
        }
    }
}
