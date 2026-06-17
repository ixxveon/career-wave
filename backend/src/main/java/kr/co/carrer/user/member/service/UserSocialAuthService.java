package kr.co.carrer.user.member.service;

import jakarta.servlet.http.HttpServletResponse;
import kr.co.carrer.user.member.dto.UserSocialAuthDto;

public interface UserSocialAuthService {

    UserSocialAuthDto.ResponseOAuthAuthorize authorize(String provider);

    Object callback(String provider, String code, String state, HttpServletResponse response);

    UserSocialAuthDto.ResponseSocialComplete complete(
            UserSocialAuthDto.RequestSocialComplete request, HttpServletResponse response);
}
