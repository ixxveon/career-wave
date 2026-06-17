package kr.co.carrer.user.member.dto;

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
        @NotNull
        private MemberType roleType;

        @NotBlank
        private String verificationToken;

        // 기업회원 전용 — roleType=COMPANY일 때 service 레이어에서 필수 검증
        private String managerName;

        @Pattern(regexp = "^[0-9]{10}$", message = "사업자등록번호는 숫자 10자리로 입력해 주세요.")
        private String businessNumber;
    }

    public record ResponseFindId(
            List<String> maskedLoginIds,
            boolean found
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
        @NotNull
        private MemberType roleType;

        @NotBlank
        private String loginId;

        @NotBlank
        private String verificationToken;

        // 기업회원 전용 선택 필드
        private String managerName;

        @Pattern(regexp = "^[0-9]{10}$", message = "사업자등록번호는 숫자 10자리로 입력해 주세요.")
        private String businessNumber;
    }

    public record ResponsePasswordToken(
            String resetToken,
            Instant expiresAt
    ) {}

    // ───────────────────────────── 비밀번호 재설정 ─────────────────────────────

    @Getter
    public static class RequestResetPassword {
        @NotBlank
        private String resetToken;

        @NotBlank
        @ValidPassword
        private String newPassword;
    }

    public record ResponseResetPassword(Instant changedAt) {}
}
