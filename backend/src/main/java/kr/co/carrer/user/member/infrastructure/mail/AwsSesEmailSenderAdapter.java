package kr.co.carrer.user.member.infrastructure.mail;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.member.exception.UserAuthErrorCode;
import kr.co.carrer.user.member.service.EmailSenderPort;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sesv2.SesV2Client;
import software.amazon.awssdk.services.sesv2.model.*;

@Slf4j
@Component
public class AwsSesEmailSenderAdapter implements EmailSenderPort {

    private final SesV2Client sesClient;
    private final String fromEmail;

    public AwsSesEmailSenderAdapter(
            @Value("${aws.ses.access-key}") String accessKey,
            @Value("${aws.ses.secret-key}") String secretKey,
            @Value("${aws.ses.region}") String region,
            @Value("${aws.ses.from-email}") String fromEmail) {
        this.fromEmail = fromEmail;
        this.sesClient = SesV2Client.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)))
                .build();
    }

    @Override
    public void sendVerificationCode(String toEmail, String code) {
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
            log.info("SES 이메일 발송 완료: {}", toEmail);
        } catch (SesV2Exception e) {
            log.error("SES 이메일 발송 실패: {} — {}", toEmail, e.getMessage());
            throw new CustomException(UserAuthErrorCode.VERIFICATION_TARGET_INVALID);
        }
    }
}
