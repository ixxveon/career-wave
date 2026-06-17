package kr.co.carrer.user.member.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import kr.co.carrer.user.member.type.VerificationChannel;
import kr.co.carrer.user.member.type.VerificationPurpose;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

public class UserVerificationDto {

    // ───────────────────────────── 인증번호 발송 ─────────────────────────────

    @Getter
    public static class RequestSendVerification {
        @NotNull
        private VerificationChannel channel;

        // channel=EMAIL이면 이메일 형식, channel=PHONE이면 휴대폰 형식 — service 레이어에서 channel에 따라 검증
        @NotBlank
        private String target;

        @NotNull
        private VerificationPurpose purpose;
    }

    public record ResponseSendVerification(
            UUID verificationId,
            Instant expiresAt,
            Instant resendAvailableAt,
            int remainingAttempts
    ) {}

    // ───────────────────────────── 인증번호 확인 ─────────────────────────────

    @Getter
    public static class RequestConfirmVerification {
        @NotNull
        private UUID verificationId;

        @NotBlank
        @Pattern(regexp = "^[0-9]{6}$", message = "인증번호는 6자리 숫자로 입력해 주세요.")
        private String code;
    }

    public record ResponseConfirmVerification(
            String verificationToken,
            Instant verifiedAt
    ) {}
}
