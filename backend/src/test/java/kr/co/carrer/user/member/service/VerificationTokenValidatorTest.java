package kr.co.carrer.user.member.service;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.member.entity.MemberVerification;
import kr.co.carrer.user.member.exception.UserAuthErrorCode;
import kr.co.carrer.user.member.type.VerificationChannel;
import kr.co.carrer.user.member.type.VerificationPurpose;
import kr.co.carrer.user.member.type.VerificationStatus;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class VerificationTokenValidatorTest {

    // ─── status 미인증 ───────────────────────────────────────────────────────────

    @Test
    void validate_status_SENT_VERIFICATION_TOKEN_INVALID() throws Exception {
        MemberVerification v = createVerification(VerificationStatus.SENT, "h");
        assertThatThrownBy(() ->
                VerificationTokenValidator.validate(
                        v, VerificationChannel.EMAIL, "test@example.com", VerificationPurpose.REGISTER))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(UserAuthErrorCode.VERIFICATION_TOKEN_INVALID));
    }

    // ─── 만료 ───────────────────────────────────────────────────────────────────

    @Test
    void validate_만료_VERIFICATION_TOKEN_INVALID() throws Exception {
        MemberVerification v = createVerification(VerificationStatus.VERIFIED, "h");
        setField(v, "expiresAt", Instant.now().minusSeconds(60));
        assertThatThrownBy(() ->
                VerificationTokenValidator.validate(
                        v, VerificationChannel.EMAIL, "test@example.com", VerificationPurpose.REGISTER))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(UserAuthErrorCode.VERIFICATION_TOKEN_INVALID));
    }

    // ─── purpose 불일치 ─────────────────────────────────────────────────────────

    @Test
    void validate_purpose_불일치_VERIFICATION_TOKEN_INVALID() throws Exception {
        MemberVerification v = createVerification(VerificationStatus.VERIFIED, "h");
        // purpose는 FIND_ID지만 REGISTER를 기대 → 불일치
        setField(v, "purpose", VerificationPurpose.FIND_ID);
        assertThatThrownBy(() ->
                VerificationTokenValidator.validate(
                        v, VerificationChannel.EMAIL, "test@example.com", VerificationPurpose.REGISTER))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(UserAuthErrorCode.VERIFICATION_TOKEN_INVALID));
    }

    // ─── 유효한 토큰 — 통과 ──────────────────────────────────────────────────────

    @Test
    void validate_유효한_토큰_통과() throws Exception {
        MemberVerification v = createVerification(VerificationStatus.VERIFIED, "h");
        VerificationTokenValidator.validate(
                v, VerificationChannel.EMAIL, "test@example.com", VerificationPurpose.REGISTER);
        // 예외 없이 통과하면 성공
    }

    // ─── 내부 유틸 ───────────────────────────────────────────────────────────────

    private MemberVerification createVerification(VerificationStatus status, String codeHash) throws Exception {
        MemberVerification v = new MemberVerification() {};
        setField(v, "verificationId", UUID.randomUUID());
        setField(v, "channel", VerificationChannel.EMAIL);
        setField(v, "target", "test@example.com");
        setField(v, "purpose", VerificationPurpose.REGISTER);
        setField(v, "codeHash", codeHash);
        setField(v, "verificationStatus", status);
        setField(v, "remainingAttempts", 5);
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
