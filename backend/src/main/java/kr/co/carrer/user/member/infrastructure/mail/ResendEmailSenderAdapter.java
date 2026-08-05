package kr.co.carrer.user.member.infrastructure.mail;

import io.netty.channel.ChannelOption;
import jakarta.annotation.PostConstruct;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.member.exception.UserAuthErrorCode;
import kr.co.carrer.user.member.service.EmailSenderPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

// Resend HTTP API 기반 이메일 인증번호 발송 어댑터 — https://resend.com
// AWS SES가 sandbox 제한으로 임의 수신자 발송이 불가능하여 대체 도입.
// email.provider=resend 일 때만 활성화 (기본값). ses로 전환하면 AwsSesEmailSenderAdapter 사용.
// from-email은 Resend에서 검증한 도메인 주소여야 임의 수신자에게 발송 가능
// (미검증 시 onboarding@resend.dev는 Resend 계정 본인 메일로만 발송됨)
@Slf4j
@Component
@ConditionalOnProperty(name = "email.provider", havingValue = "resend", matchIfMissing = true)
@RequiredArgsConstructor
public class ResendEmailSenderAdapter implements EmailSenderPort {

    private static final String RESEND_API_URL = "https://api.resend.com";

    @Value("${resend.api-key:}") private String apiKey;
    @Value("${resend.from-email}") private String fromEmail;

    private final Environment environment;
    private final WebClient.Builder webClientBuilder;

    private WebClient webClient;

    @PostConstruct
    void init() {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("[Resend] API 키 미설정 — 이메일 발송 비활성화 (로컬 기동은 정상)");
            return;
        }
        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 3_000)
                .responseTimeout(Duration.ofSeconds(10));
        this.webClient = webClientBuilder
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .baseUrl(RESEND_API_URL)
                .build();
    }

    @Override
    public void sendVerificationCode(String toEmail, String code) {
        if (webClient == null) {
            if (isLocalOrTest()) {
                // local/test: 키 없어도 기동 가능 — 발송 skip (인증번호는 로그에 미노출, NFR-002)
                log.warn("[Resend] 이메일 발송 스킵 — API 키 미설정 (local/test)");
                return;
            }
            // 운영/스테이징: 키 미설정은 설정 오류 — fail-fast
            log.error("[Resend] API 키 미설정 — 운영 환경에서는 반드시 설정 필요");
            throw new CustomException(UserAuthErrorCode.VERIFICATION_EMAIL_UNAVAILABLE);
        }

        Map<String, Object> body = Map.of(
                "from", fromEmail,
                "to", List.of(toEmail),
                "subject", "[CareerWave] 이메일 인증번호",
                "text", "인증번호: " + code + "\n\n5분 내에 입력해 주세요.",
                "html", "<p>인증번호: <strong>" + code + "</strong></p><p>5분 내에 입력해 주세요.</p>"
        );

        try {
            webClient.post()
                    .uri("/emails")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, resp ->
                            resp.bodyToMono(String.class).defaultIfEmpty("").map(b -> {
                                log.error("[Resend] 이메일 발송 실패 — status={} body={}",
                                        resp.statusCode().value(), b);
                                return new CustomException(UserAuthErrorCode.VERIFICATION_EMAIL_UNAVAILABLE);
                            })
                    )
                    .toBodilessEntity()
                    .block();
            log.info("[Resend] 이메일 발송 완료");
        } catch (CustomException e) {
            throw e;
        } catch (Exception e) {
            log.error("[Resend] 이메일 발송 실패 — {}", e.getClass().getSimpleName());
            throw new CustomException(UserAuthErrorCode.VERIFICATION_EMAIL_UNAVAILABLE);
        }
    }

    private boolean isLocalOrTest() {
        return Arrays.stream(environment.getActiveProfiles())
                .anyMatch(p -> p.equals("local") || p.equals("test"));
    }
}
