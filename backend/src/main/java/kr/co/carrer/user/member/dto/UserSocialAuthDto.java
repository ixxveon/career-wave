package kr.co.carrer.user.member.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import kr.co.carrer.user.member.type.SocialProvider;
import lombok.Getter;

import java.util.UUID;

public class UserSocialAuthDto {

    // ───────────────────────────── OAuth authorize ─────────────────────────────

    public record ResponseOAuthAuthorize(
            String provider,
            String authorizationUrl,
            String state
    ) {}

    // ───────────────────────────── OAuth callback — 기존 소셜 계정 로그인 ─────────────────────────────

    // member 필드는 UserLoginDto.MemberInfo 재사용
    @Getter
    public static class ResponseOAuthCallbackLogin {
        private final String accessToken;
        private final UserLoginDto.MemberInfo member;
        private final String nextPath;

        public ResponseOAuthCallbackLogin(String accessToken, UserLoginDto.MemberInfo member, String nextPath) {
            this.accessToken = accessToken;
            this.member = member;
            this.nextPath = nextPath;
        }
    }

    // ───────────────────────────── OAuth callback — 최초 소셜 가입 필요 ─────────────────────────────

    public record ResponseOAuthCallbackSignupRequired(
            String provider,
            String socialEmail,   // nullable — Kakao는 email 없을 수 있음 (spec FR-022C)
            String socialSignupToken,
            String nextPath
    ) {}

    // ───────────────────────────── 소셜 회원가입 추가정보 완료 ─────────────────────────────

    @Getter
    public static class RequestSocialComplete {
        @NotNull
        private SocialProvider provider;

        // spec api-schema.md §13 계약 기준 — 프론트 타입에는 없으나 서버 검증 필요
        @NotBlank
        private String socialSignupToken;

        // nullable — provider에서 email을 제공하지 않을 수 있음
        private String socialEmail;

        @NotBlank
        private String name;

        @NotBlank
        private String carrier;

        @NotBlank
        @Pattern(regexp = "^010[0-9]{8}$",
                message = "휴대폰 번호는 010으로 시작하는 11자리 숫자로 입력해 주세요.")
        private String phone;

        @NotBlank
        private String phoneVerificationToken;

        // 소셜 회원가입 필수 약관 = 개인회원과 동일 (spec §8)
        @NotNull
        @Valid
        private UserRegisterDto.PersonalTerms terms;
    }

    public record ResponseSocialComplete(
            UUID memberId,
            String roleType,
            String memberStatus,
            String nextPath
    ) {
        public static ResponseSocialComplete of(UUID memberId, String memberStatus) {
            return new ResponseSocialComplete(memberId, "USER", memberStatus, "/auth/login?registered=social");
        }
    }
}
