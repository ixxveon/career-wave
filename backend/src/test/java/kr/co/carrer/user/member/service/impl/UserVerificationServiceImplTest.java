package kr.co.carrer.user.member.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.member.dto.UserVerificationDto;
import kr.co.carrer.user.member.entity.MemberVerification;
import kr.co.carrer.user.member.exception.UserAuthErrorCode;
import kr.co.carrer.user.member.repository.MemberVerificationRepository;
import kr.co.carrer.user.member.service.EmailSenderPort;
import kr.co.carrer.user.member.service.SmsSenderPort;
import kr.co.carrer.user.member.type.VerificationChannel;
import kr.co.carrer.user.member.type.VerificationPurpose;
import kr.co.carrer.user.member.type.VerificationStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserVerificationServiceImplTest {

    @Mock MemberVerificationRepository verificationRepository;
    @Mock EmailSenderPort emailSenderPort;
    @Mock SmsSenderPort smsSenderPort;

    private UserVerificationServiceImpl service;

    @BeforeEach
    void setUp() throws Exception {
        service = new UserVerificationServiceImpl(verificationRepository, emailSenderPort, smsSenderPort);
    }

    // ─── 인증번호 확인 실패 시 decrementAttempts() 호출 검증 ───────────────────────

    @Test
    void confirm_코드불일치_시_decrementAttempts_호출() throws Exception {
        MemberVerification verification = createVerification(3, VerificationStatus.SENT, "correcthash");
        when(verificationRepository.findByVerificationId(any(UUID.class)))
                .thenReturn(Optional.of(verification));

        UserVerificationDto.RequestConfirmVerification request = new UserVerificationDto.RequestConfirmVerification();
        setField(request, "verificationId", UUID.randomUUID());
        setField(request, "code", "000000"); // 틀린 코드 — hash 불일치

        assertThatThrownBy(() -> service.confirm(request))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> {
                    UserAuthErrorCode code = ((CustomException) e).getErrorCode() instanceof UserAuthErrorCode ec ? ec : null;
                    assertThat(code).isEqualTo(UserAuthErrorCode.INVALID_VERIFICATION_CODE);
                });

        // decrementAttempts()가 호출됐는지 간접 확인 — remainingAttempts 감소
        assertThat(verification.getRemainingAttempts()).isLessThan(3);
    }

    @Test
    void confirm_마지막_실패_remainingAttempts_0_VERIFICATION_RATE_LIMITED() throws Exception {
        // remainingAttempts=1 → 오입력 1회 → 0이 되면 VERIFICATION_RATE_LIMITED
        MemberVerification verification = createVerification(1, VerificationStatus.SENT, "correcthash");
        when(verificationRepository.findByVerificationId(any(UUID.class)))
                .thenReturn(Optional.of(verification));

        UserVerificationDto.RequestConfirmVerification request = new UserVerificationDto.RequestConfirmVerification();
        setField(request, "verificationId", UUID.randomUUID());
        setField(request, "code", "000000"); // 틀린 코드

        assertThatThrownBy(() -> service.confirm(request))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> {
                    assertThat(((CustomException) e).getErrorCode())
                            .isEqualTo(UserAuthErrorCode.VERIFICATION_RATE_LIMITED);
                });

        assertThat(verification.getRemainingAttempts()).isEqualTo(0);
    }

    @Test
    void confirm_만료된_인증번호_VERIFICATION_EXPIRED() throws Exception {
        MemberVerification verification = createVerification(5, VerificationStatus.SENT, "hash");
        setField(verification, "expiresAt", Instant.now().minusSeconds(60)); // 만료

        when(verificationRepository.findByVerificationId(any(UUID.class)))
                .thenReturn(Optional.of(verification));

        UserVerificationDto.RequestConfirmVerification request = new UserVerificationDto.RequestConfirmVerification();
        setField(request, "verificationId", UUID.randomUUID());
        setField(request, "code", "123456");

        assertThatThrownBy(() -> service.confirm(request))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> {
                    CustomException ce = (CustomException) e;
                    assertThat(ce.getErrorCode()).isEqualTo(UserAuthErrorCode.VERIFICATION_EXPIRED);
                });
    }

    @Test
    void send_channel_null_VERIFICATION_TARGET_INVALID() throws Exception {
        UserVerificationDto.RequestSendVerification request =
                new UserVerificationDto.RequestSendVerification();
        setField(request, "channel", null);
        setField(request, "target", "test@example.com");
        setField(request, "purpose", VerificationPurpose.REGISTER);

        assertThatThrownBy(() -> service.send(request))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.VERIFICATION_TARGET_INVALID));
    }

    @Test
    void send_target_null_VERIFICATION_TARGET_INVALID() throws Exception {
        UserVerificationDto.RequestSendVerification request =
                new UserVerificationDto.RequestSendVerification();
        setField(request, "channel", VerificationChannel.EMAIL);
        setField(request, "target", null);
        setField(request, "purpose", VerificationPurpose.REGISTER);

        assertThatThrownBy(() -> service.send(request))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.VERIFICATION_TARGET_INVALID));
    }

    // ─── 인증번호 발송 성공 ────────────────────────────────────────────────────────

    @Test
    void send_EMAIL_성공_emailSenderPort_호출() throws Exception {
        when(verificationRepository.findTopByTargetAndPurposeOrderByCreatedAtDesc(anyString(), any()))
                .thenReturn(java.util.Optional.empty());

        MemberVerification saved = createVerification(5, VerificationStatus.SENT, "anyhash");
        when(verificationRepository.save(any())).thenReturn(saved);

        UserVerificationDto.RequestSendVerification req = new UserVerificationDto.RequestSendVerification();
        setField(req, "channel", VerificationChannel.EMAIL);
        setField(req, "target", "user@example.com");
        setField(req, "purpose", VerificationPurpose.REGISTER);

        UserVerificationDto.ResponseSendVerification resp = service.send(req);

        assertThat(resp).isNotNull();
        assertThat(resp.expiresAt()).isAfter(Instant.now());
        assertThat(resp.resendAvailableAt()).isAfter(Instant.now());
        verify(emailSenderPort, times(1)).sendVerificationCode(eq("user@example.com"), anyString());
        verify(smsSenderPort, never()).sendVerificationCode(any(), any());
    }

    @Test
    void send_PHONE_성공_smsSenderPort_호출() throws Exception {
        when(verificationRepository.findTopByTargetAndPurposeOrderByCreatedAtDesc(anyString(), any()))
                .thenReturn(java.util.Optional.empty());

        MemberVerification saved = createVerification(5, VerificationStatus.SENT, "anyhash");
        when(verificationRepository.save(any())).thenReturn(saved);

        UserVerificationDto.RequestSendVerification req = new UserVerificationDto.RequestSendVerification();
        setField(req, "channel", VerificationChannel.PHONE);
        setField(req, "target", "01012345678");
        setField(req, "purpose", VerificationPurpose.REGISTER);

        service.send(req);

        verify(smsSenderPort, times(1)).sendVerificationCode(eq("01012345678"), anyString());
        verify(emailSenderPort, never()).sendVerificationCode(any(), any());
    }

    // ─── 인증번호 재발송 60초 제한 ─────────────────────────────────────────────────

    @Test
    void send_재발송_60초_제한_VERIFICATION_RATE_LIMITED() throws Exception {
        MemberVerification prev = createVerification(5, VerificationStatus.SENT, "hash");
        // resendAvailableAt을 60초 후로 설정 → 아직 재발송 불가
        setField(prev, "resendAvailableAt", Instant.now().plusSeconds(60));

        when(verificationRepository.findTopByTargetAndPurposeOrderByCreatedAtDesc(anyString(), any()))
                .thenReturn(java.util.Optional.of(prev));

        UserVerificationDto.RequestSendVerification req = new UserVerificationDto.RequestSendVerification();
        setField(req, "channel", VerificationChannel.EMAIL);
        setField(req, "target", "user@example.com");
        setField(req, "purpose", VerificationPurpose.REGISTER);

        assertThatThrownBy(() -> service.send(req))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.VERIFICATION_RATE_LIMITED));

        verify(emailSenderPort, never()).sendVerificationCode(any(), any());
    }

    // ─── 인증번호 확인 성공 — verificationToken 반환 ─────────────────────────────────

    @Test
    void confirm_성공_verificationToken_반환() throws Exception {
        // SHA-256("123456") 계산
        java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
        String codeHash = java.util.HexFormat.of().formatHex(
                md.digest("123456".getBytes(java.nio.charset.StandardCharsets.UTF_8)));

        MemberVerification verification = createVerification(5, VerificationStatus.SENT, codeHash);
        when(verificationRepository.findByVerificationId(any(UUID.class)))
                .thenReturn(java.util.Optional.of(verification));

        UserVerificationDto.RequestConfirmVerification req = new UserVerificationDto.RequestConfirmVerification();
        setField(req, "verificationId", UUID.randomUUID());
        setField(req, "code", "123456");

        UserVerificationDto.ResponseConfirmVerification resp = service.confirm(req);

        assertThat(resp).isNotNull();
        assertThat(resp.verificationToken()).isNotBlank();
        assertThat(resp.verifiedAt()).isNotNull();
        assertThat(verification.getVerificationStatus()).isEqualTo(VerificationStatus.VERIFIED);
    }

    // ─── 내부 유틸 ───────────────────────────────────────────────────────────────

    private MemberVerification createVerification(int attempts, VerificationStatus status,
                                                   String codeHash) throws Exception {
        MemberVerification v = new MemberVerification() {};
        setField(v, "verificationId", UUID.randomUUID());
        setField(v, "channel", VerificationChannel.EMAIL);
        setField(v, "target", "test@example.com");
        setField(v, "purpose", VerificationPurpose.REGISTER);
        setField(v, "codeHash", codeHash);
        setField(v, "verificationStatus", status);
        setField(v, "remainingAttempts", attempts);
        setField(v, "expiresAt", Instant.now().plusSeconds(300));
        setField(v, "resendAvailableAt", Instant.now().plusSeconds(60));
        return v;
    }

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
