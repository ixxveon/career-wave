package kr.co.carrer.user.member.service;

import jakarta.servlet.http.HttpServletResponse;
import kr.co.carrer.user.member.dto.UserSocialAuthDto;

public interface UserSocialAuthService {

    UserSocialAuthDto.ResponseOAuthAuthorize authorize(String provider);

    /**
     * @return 기존 소셜 계정 로그인 시 {@link kr.co.carrer.user.member.dto.UserSocialAuthDto.ResponseOAuthCallbackLogin},
     *         최초 가입 필요 시 {@link kr.co.carrer.user.member.dto.UserSocialAuthDto.ResponseOAuthCallbackSignupRequired}.
     *         Phase 5 Controller에서 instanceof 분기로 응답 처리.
     */
    Object callback(String provider, String code, String state, HttpServletResponse response);

    UserSocialAuthDto.ResponseSocialComplete complete(
            UserSocialAuthDto.RequestSocialComplete request, HttpServletResponse response);
}
