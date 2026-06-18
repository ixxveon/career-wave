package kr.co.carrer.user.member.service;

import jakarta.servlet.http.HttpServletResponse;
import kr.co.carrer.user.member.dto.OAuthCallbackResponse;
import kr.co.carrer.user.member.dto.UserSocialAuthDto;

public interface UserSocialAuthService {

    UserSocialAuthDto.ResponseOAuthAuthorize authorize(String provider);

    /**
     * @return {@link kr.co.carrer.user.member.dto.UserSocialAuthDto.ResponseOAuthCallbackLogin} (기존 계정 로그인)
     *      또는 {@link kr.co.carrer.user.member.dto.UserSocialAuthDto.ResponseOAuthCallbackSignupRequired} (최초 가입 필요).
     *      Phase 5 Controller에서 switch pattern matching으로 분기.
     */
    OAuthCallbackResponse callback(String provider, String code, String state, HttpServletResponse response);

    UserSocialAuthDto.ResponseSocialComplete complete(
            UserSocialAuthDto.RequestSocialComplete request, HttpServletResponse response);
}
