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

    /**
     * 소셜 가입 추가정보 단계에서 휴대폰 인증 성공 직후 호출.
     * 인증한 번호가 기존 회원이면 소셜 계정을 연동하고 로그인(LINKED),
     * 신규 번호면 이후 {@link #complete}로 신규 가입을 진행하도록 NEW_MEMBER를 반환한다.
     */
    UserSocialAuthDto.ResponseSocialResolve resolve(
            UserSocialAuthDto.RequestSocialResolve request, HttpServletResponse response);
}
