package kr.co.carrer.user.member.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
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
    public static final class ResponseOAuthCallbackLogin implements OAuthCallbackResponse {
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
    ) implements OAuthCallbackResponse {}

    // ───────────────────────────── 소셜 회원가입 추가정보 완료 ─────────────────────────────

    @Getter
    public static class RequestSocialComplete {
        // String으로 수신 — Jackson 역직렬화 실패 방지
        // 유효하지 않은 값은 service 레이어에서 SocialProvider.fromJsonValue() 변환 후
        // CustomException(UserAuthErrorCode.OAUTH_PROVIDER_INVALID) throw (spec api-schema.md §13)
        @NotBlank
        @Pattern(regexp = "^(kakao|naver|google)$", message = "지원하지 않는 소셜 provider입니다.")
        private String provider;

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
