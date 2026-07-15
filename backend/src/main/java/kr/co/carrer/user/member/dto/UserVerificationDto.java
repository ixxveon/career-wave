package kr.co.carrer.user.member.dto;

import io.swagger.v3.oas.annotations.media.Schema;
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
        @Schema(description = "인증 채널", allowableValues = {"EMAIL", "PHONE"}, example = "EMAIL")
        @NotNull
        private VerificationChannel channel;

        @Schema(description = "인증 대상 (EMAIL이면 이메일, PHONE이면 010 시작 11자리)", example = "user@example.com")
        @NotBlank
        private String target;

        @Schema(description = "인증 목적", allowableValues = {"REGISTER", "FIND_ID", "RESET_PASSWORD", "SOCIAL_SIGNUP", "EMAIL_CHANGE", "PHONE_CHANGE"}, example = "REGISTER")
        @NotNull
        private VerificationPurpose purpose;
    }

    public record ResponseSendVerification(
            @Schema(description = "인증 세션 UUID (confirm 요청 시 사용)") UUID verificationId,
            @Schema(description = "인증번호 만료 시각 (발송 후 5분)") Instant expiresAt,
            @Schema(description = "재발송 가능 시각 (발송 후 60초)") Instant resendAvailableAt,
            @Schema(description = "남은 시도 가능 횟수 (최대 5회)") int remainingAttempts
    ) {}

    // ───────────────────────────── 인증번호 확인 ─────────────────────────────

    @Getter
    public static class RequestConfirmVerification {
        @Schema(description = "인증 세션 UUID (send 응답의 verificationId)")
        @NotNull
        private UUID verificationId;

        @Schema(description = "발송된 6자리 인증번호", example = "123456")
        @NotBlank
        @Pattern(regexp = "^[0-9]{6}$", message = "인증번호는 6자리 숫자로 입력해 주세요.")
        private String code;
    }

    public record ResponseConfirmVerification(
            @Schema(description = "인증 완료 token (회원가입/아이디 찾기/비밀번호 재설정 시 서버 검증용)") String verificationToken,
            @Schema(description = "인증 완료 시각") Instant verifiedAt
    ) {}
}
