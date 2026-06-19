package kr.co.carrer.user.member.dto;

/**
 * OAuth callback 응답 sealed interface.
 * - {@link UserSocialAuthDto.ResponseOAuthCallbackLogin}: 기존 소셜 계정 로그인 성공
 * - {@link UserSocialAuthDto.ResponseOAuthCallbackSignupRequired}: 최초 가입 필요
 * Phase 5 Controller에서 switch pattern matching으로 안전하게 분기.
 */
public sealed interface OAuthCallbackResponse
        permits UserSocialAuthDto.ResponseOAuthCallbackLogin,
                UserSocialAuthDto.ResponseOAuthCallbackSignupRequired {
}
