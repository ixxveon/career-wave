package kr.co.carrer.user.member.infrastructure.sms;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.member.exception.UserAuthErrorCode;
import kr.co.carrer.user.member.service.SmsSenderPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class SolapiSmsSenderAdapter implements SmsSenderPort {

    private final WebClient.Builder webClientBuilder;

    @Value("${solapi.base-url}") private String baseUrl;
    @Value("${solapi.api-key}") private String apiKey;
    @Value("${solapi.api-secret}") private String apiSecret;
    @Value("${solapi.sender-phone}") private String senderPhone;

    @Override
    public void sendVerificationCode(String toPhone, String code) {
        WebClient webClient = webClientBuilder.baseUrl(baseUrl).build();
        String date = Instant.now().toString();
        String salt = UUID.randomUUID().toString().replace("-", "");
        String signature = buildSignature(date, salt);

        Map<String, Object> body = Map.of(
                "messages", List.of(Map.of(
                        "to", toPhone,
                        "from", senderPhone,
                        "text", "[CareerWave] 인증번호: " + code + " (5분 내 입력)"
                ))
        );

        try {
            webClient.post()
                    .uri("/messages/v4/send-many")
                    .header("Authorization", "HMAC-SHA256 apiKey=" + apiKey
                            + ", date=" + date + ", salt=" + salt + ", signature=" + signature)
                    .header("Content-Type", "application/json")
                    .bodyValue(body)
                    .retrieve()
                    .toBodilessEntity()
                    .doOnSuccess(r -> log.info("SOLAPI SMS 발송 완료: {}", toPhone))
                    .block();
        } catch (org.springframework.web.reactive.function.client.WebClientResponseException e) {
            log.error("SOLAPI SMS 발송 실패: {} — HTTP {}", toPhone, e.getStatusCode());
            throw new CustomException(UserAuthErrorCode.VERIFICATION_TARGET_INVALID);
        } catch (Exception e) {
            log.error("SOLAPI SMS 발송 실패: {} — {}", toPhone, e.getMessage());
            throw new CustomException(UserAuthErrorCode.VERIFICATION_TARGET_INVALID);
        }
    }

    private String buildSignature(String date, String salt) {
        try {
            String message = date + salt;
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(apiSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(message.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new CustomException(UserAuthErrorCode.VERIFICATION_TARGET_INVALID, "SMS 서명 생성 실패");
        }
    }
}
