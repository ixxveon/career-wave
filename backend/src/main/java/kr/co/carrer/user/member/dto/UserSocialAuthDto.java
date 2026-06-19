package kr.co.carrer.user.member.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;

import java.util.UUID;

public class UserSocialAuthDto {

    // ───────────────────────────── OAuth authorize ─────────────────────────────

    public record ResponseOAuthAuthorize(
            @Schema(description = "소셜 provider", allowableValues = {"kakao", "naver", "google"}) String provider,
            @Schema(description = "프론트가 이동해야 할 OAuth 인증 URL") String authorizationUrl,
            @Schema(description = "CSRF 방지용 state (callback 검증에 사용)") String state
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
        @Schema(description = "소셜 provider", allowableValues = {"kakao", "naver", "google"}, example = "kakao")
        @NotBlank
        @Pattern(regexp = "^(kakao|naver|google)$", message = "지원하지 않는 소셜 provider입니다.")
        private String provider;

        @Schema(description = "OAuth callback 응답에서 받은 1회용 socialSignupToken")
        @NotBlank
        private String socialSignupToken;

        @Schema(description = "provider에서 받은 이메일 (nullable — Kakao는 없을 수 있음)", example = "social@example.com")
        private String socialEmail;

        @Schema(description = "이름", example = "홍길동")
        @NotBlank
        private String name;

        @Schema(description = "통신사", example = "SKT")
        @NotBlank
        private String carrier;

        @Schema(description = "휴대폰 번호 (010 시작 11자리)", example = "01012345678")
        @NotBlank
        @Pattern(regexp = "^010[0-9]{8}$",
                message = "휴대폰 번호는 010으로 시작하는 11자리 숫자로 입력해 주세요.")
        private String phone;

        @Schema(description = "휴대폰 인증 token (purpose=REGISTER)")
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
