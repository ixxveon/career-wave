package kr.co.carrer.user.member.infrastructure.mail;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.member.exception.UserAuthErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.services.sesv2.SesV2Client;
import software.amazon.awssdk.services.sesv2.model.SendEmailRequest;
import software.amazon.awssdk.services.sesv2.model.SendEmailResponse;

import org.springframework.core.env.Environment;

import java.lang.reflect.Field;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AwsSesEmailSenderAdapterTest {

    private SesV2Client sesClient;
    private AwsSesEmailSenderAdapter adapter;

    @BeforeEach
    void setUp() throws Exception {
        sesClient = mock(SesV2Client.class);
        Environment env = mock(Environment.class);
        when(env.getActiveProfiles()).thenReturn(new String[]{"test"});
        adapter = new AwsSesEmailSenderAdapter(env);
        setField(adapter, "fromEmail", "noreply@careerwave.co.kr");
        setField(adapter, "sesClient", sesClient);
    }

    // ─── 이메일 발송 성공 — SES sendEmail 호출 검증 ─────────────────────────────────

    @Test
    @DisplayName("이메일 발송 성공 시 SES sendEmail을 대상 이메일과 인증번호로 호출한다")
    void sendVerificationCode_성공_SES_sendEmail_호출() {
        when(sesClient.sendEmail(any(SendEmailRequest.class)))
                .thenReturn(SendEmailResponse.builder().messageId("msg-id-123").build());

        adapter.sendVerificationCode("user@example.com", "123456");

        verify(sesClient, times(1)).sendEmail(argThat((SendEmailRequest req) ->
                req.destination().toAddresses().contains("user@example.com")
                        && req.content().simple().body().text().data().contains("123456")
        ));
    }

    @Test
    @DisplayName("이메일 제목에 CareerWave와 인증번호 안내가 포함된다")
    void sendVerificationCode_제목_검증() {
        when(sesClient.sendEmail(any(SendEmailRequest.class)))
                .thenReturn(SendEmailResponse.builder().messageId("msg-id").build());

        adapter.sendVerificationCode("user@example.com", "654321");

        verify(sesClient).sendEmail(argThat((SendEmailRequest req) ->
                req.content().simple().subject().data().contains("CareerWave")
                        && req.content().simple().body().text().data().contains("654321")
        ));
    }

    // ─── SdkException → VERIFICATION_EMAIL_UNAVAILABLE ───────────────────────────

    @Test
    @DisplayName("SES SDK 예외 발생 시 VERIFICATION_EMAIL_UNAVAILABLE를 반환한다")
    void sendVerificationCode_SdkException_VERIFICATION_EMAIL_UNAVAILABLE() {
        when(sesClient.sendEmail(any(SendEmailRequest.class)))
                .thenThrow(SdkException.create("SES 연결 실패", new RuntimeException()));

        assertThatThrownBy(() -> adapter.sendVerificationCode("user@example.com", "123456"))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.VERIFICATION_EMAIL_UNAVAILABLE));
    }

    // ─── 발신자 이메일 사용 검증 ───────────────────────────────────────────────────

    @Test
    @DisplayName("발신자 이메일이 환경변수로 주입된 fromEmail을 사용한다")
    void sendVerificationCode_발신자_이메일_검증() {
        when(sesClient.sendEmail(any(SendEmailRequest.class)))
                .thenReturn(SendEmailResponse.builder().messageId("msg-id").build());

        adapter.sendVerificationCode("user@example.com", "000000");

        verify(sesClient).sendEmail(argThat((SendEmailRequest req) ->
                "noreply@careerwave.co.kr".equals(req.fromEmailAddress())
        ));
    }

    // ─── 내부 유틸 ───────────────────────────────────────────────────────────────

    private void setField(Object target, String name, Object value) throws Exception {
        Class<?> clazz = target.getClass();
        while (clazz != null) {
            try {
                Field field = clazz.getDeclaredField(name);
                field.setAccessible(true);
                field.set(target, value);
                return;
            } catch (NoSuchFieldException e) {
                clazz = clazz.getSuperclass();
            }
        }
        throw new NoSuchFieldException(name);
    }
}
