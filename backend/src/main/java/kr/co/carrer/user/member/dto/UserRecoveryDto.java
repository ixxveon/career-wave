package kr.co.carrer.user.member.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import kr.co.carrer.user.member.type.MemberType;
import kr.co.carrer.user.member.validation.ValidPassword;
import lombok.Getter;

import java.time.Instant;
import java.util.List;

public class UserRecoveryDto {

    // ───────────────────────────── 아이디 찾기 ─────────────────────────────

    @Getter
    public static class RequestFindId {
        @Schema(description = "회원 유형", allowableValues = {"USER", "COMPANY"}, example = "USER")
        @NotNull
        private MemberType roleType;

        @Schema(description = "/verifications/confirm 에서 발급된 인증 token (purpose=FIND_ID)")
        @NotBlank
        private String verificationToken;

        @Schema(description = "기업회원 전용 — HR 담당자 이름 (roleType=COMPANY 필수)", example = "김담당")
        private String managerName;

        @Schema(description = "기업회원 전용 — 사업자등록번호 숫자 10자리 (roleType=COMPANY 필수)", example = "1234567890")
        @Pattern(regexp = "^[0-9]{10}$", message = "사업자등록번호는 숫자 10자리로 입력해 주세요.")
        private String businessNumber;
    }

    public record ResponseFindId(
            @Schema(description = "마스킹된 loginId 목록 (앞 3자 유지, 나머지 *)", example = "[\"car**********\"]") List<String> maskedLoginIds,
            @Schema(description = "조회 결과 존재 여부 (false면 maskedLoginIds 빈 배열)") boolean found
    ) {
        // 계정 존재 여부 노출 금지 — 결과 없을 때도 동일 메시지, found=false + 빈 배열 (spec FR-011)
        public static ResponseFindId notFound() {
            return new ResponseFindId(List.of(), false);
        }
    }

    // ───────────────────────────── 비밀번호 재설정 권한 발급 ─────────────────────────────

    // 프론트 union type(USER/COMPANY)을 단일 DTO로 처리
    // roleType=COMPANY일 때 managerName·businessNumber 필수 검증은 service 레이어에서 처리
    @Getter
    public static class RequestPasswordToken {
        @Schema(description = "회원 유형", allowableValues = {"USER", "COMPANY"}, example = "USER")
        @NotNull
        private MemberType roleType;

        @Schema(description = "로그인 아이디", example = "career_user01")
        @NotBlank
        private String loginId;

        @Schema(description = "/verifications/confirm 에서 발급된 인증 token (purpose=RESET_PASSWORD)")
        @NotBlank
        private String verificationToken;

        @Schema(description = "기업회원 전용 — HR 담당자 이름 (roleType=COMPANY 필수)", example = "김담당")
        private String managerName;

        @Schema(description = "기업회원 전용 — 사업자등록번호 숫자 10자리 (roleType=COMPANY 필수)", example = "1234567890")
        @Pattern(regexp = "^[0-9]{10}$", message = "사업자등록번호는 숫자 10자리로 입력해 주세요.")
        private String businessNumber;
    }

    public record ResponsePasswordToken(
            @Schema(description = "비밀번호 재설정 token (reset-password 요청 시 사용, 1회용)") String resetToken,
            @Schema(description = "token 만료 시각 (발급 후 10분)") Instant expiresAt
    ) {}

    // ───────────────────────────── 비밀번호 재설정 ─────────────────────────────

    @Getter
    public static class RequestResetPassword {
        @Schema(description = "/recovery/password-token 에서 발급된 1회용 resetToken")
        @NotBlank
        private String resetToken;

        @Schema(description = "새 비밀번호 (8~64자, 영문/숫자/특수문자 포함, loginId 포함 금지)", example = "NewPassword123!")
        @NotBlank
        @ValidPassword
        private String newPassword;
    }

    public record ResponseResetPassword(
            @Schema(description = "비밀번호 변경 시각") Instant changedAt
    ) {}
}
