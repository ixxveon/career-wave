package kr.co.carrer.user.member.infrastructure.mail;

import jakarta.annotation.PostConstruct;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.member.exception.UserAuthErrorCode;
import kr.co.carrer.user.member.service.EmailSenderPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sesv2.SesV2Client;
import software.amazon.awssdk.services.sesv2.model.*;

import java.util.Arrays;

@Slf4j
@Component
@ConditionalOnProperty(name = "email.provider", havingValue = "ses")
@RequiredArgsConstructor
public class AwsSesEmailSenderAdapter implements EmailSenderPort {

    @Value("${aws.ses.access-key}") private String accessKey;
    @Value("${aws.ses.secret-key}") private String secretKey;
    @Value("${aws.ses.region}") private String region;
    @Value("${aws.ses.from-email}") private String fromEmail;

    private final Environment environment;
    private SesV2Client sesClient;

    @PostConstruct
    void init() {
        if (accessKey == null || accessKey.isBlank() || secretKey == null || secretKey.isBlank()) {
            log.warn("[SES] AWS 자격증명 미설정 — 이메일 발송 비활성화 (로컬 기동은 정상)");
            return;
        }
        this.sesClient = SesV2Client.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)))
                .build();
    }

    @Override
    public void sendVerificationCode(String toEmail, String code) {
        if (sesClient == null) {
            if (isLocalOrTest()) {
                // local/test: 자격증명 없어도 기동 가능 — 발송 skip
                log.warn("[SES] 이메일 발송 스킵 — AWS 자격증명 미설정 (local/test 환경)");
                return;
            }
            // 운영/스테이징: 자격증명 미설정은 설정 오류 — fail-fast
            log.error("[SES] AWS 자격증명 미설정 — 운영 환경에서는 반드시 설정 필요");
            throw new CustomException(UserAuthErrorCode.VERIFICATION_EMAIL_UNAVAILABLE);
        }

        SendEmailRequest request = SendEmailRequest.builder()
                .fromEmailAddress(fromEmail)
                .destination(Destination.builder().toAddresses(toEmail).build())
                .content(EmailContent.builder()
                        .simple(Message.builder()
                                .subject(Content.builder()
                                        .data("[CareerWave] 이메일 인증번호")
                                        .charset("UTF-8")
                                        .build())
                                .body(Body.builder()
                                        .text(Content.builder()
                                                .data("인증번호: " + code + "\n\n5분 내에 입력해 주세요.")
                                                .charset("UTF-8")
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();

        try {
            sesClient.sendEmail(request);
            log.info("SES 이메일 발송 완료");
        } catch (SdkException e) {
            log.error("SES 이메일 발송 실패 — {}", e.getMessage());
            throw new CustomException(UserAuthErrorCode.VERIFICATION_EMAIL_UNAVAILABLE);
        }
    }

    private boolean isLocalOrTest() {
        return Arrays.stream(environment.getActiveProfiles())
                .anyMatch(p -> p.equals("local") || p.equals("test"));
    }
}
