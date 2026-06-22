package kr.co.carrer.user.member.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.user.member.docs.UserSocialAuthControllerDocs;
import kr.co.carrer.user.member.dto.OAuthCallbackResponse;
import kr.co.carrer.user.member.dto.UserSocialAuthDto;
import kr.co.carrer.user.member.service.UserSocialAuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Tag(name = "User Social Auth", description = "소셜 OAuth 로그인 / 회원가입 API (Kakao · Naver · Google)")
@RestController
@RequestMapping("/api/v1/user/members")
@RequiredArgsConstructor
public class UserSocialAuthController implements UserSocialAuthControllerDocs {

    private final UserSocialAuthService userSocialAuthService;

    @Value("${frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @GetMapping("/oauth/{provider}/authorize")
    public ResponseEntity<ApiResponse<UserSocialAuthDto.ResponseOAuthAuthorize>> authorize(
            @PathVariable String provider) {
        return ResponseEntity.ok(
                ApiResponse.ok("소셜 인증 URL이 생성되었습니다.", userSocialAuthService.authorize(provider)));
    }

    @GetMapping("/oauth/{provider}/callback")
    public void callback(
            @PathVariable String provider,
            @RequestParam String code,
            @RequestParam String state,
            HttpServletResponse response) throws IOException {
        OAuthCallbackResponse result = userSocialAuthService.callback(provider, code, state, response);
        String redirectUrl = switch (result) {
            case UserSocialAuthDto.ResponseOAuthCallbackLogin login -> {
                // 토큰을 URL이 아닌 단기 쿠키로 전달 (브라우저 히스토리·로그·Referer 노출 방지)
                setHandoffCookie(response, "cw_oauth_login_token", login.getAccessToken());
                yield UriComponentsBuilder.fromHttpUrl(frontendUrl + "/auth/oauth/callback")
                        .queryParam("type", "login")
                        .build().toUriString();
            }
            case UserSocialAuthDto.ResponseOAuthCallbackSignupRequired signup -> {
                setHandoffCookie(response, "cw_oauth_signup_token", signup.socialSignupToken());
                yield UriComponentsBuilder.fromHttpUrl(frontendUrl + "/auth/oauth/callback")
                        .queryParam("type", "signup")
                        .queryParam("provider", signup.provider())
                        .queryParam("email", signup.socialEmail() != null ? signup.socialEmail() : "")
                        .build().toUriString();
            }
        };
        response.sendRedirect(redirectUrl);
    }

    private void setHandoffCookie(HttpServletResponse response, String name, String value) {
        ResponseCookie cookie = ResponseCookie.from(name, value)
                .path("/")
                .maxAge(60)
                .sameSite("Strict")
                .httpOnly(false)
                .build();
        response.addHeader("Set-Cookie", cookie.toString());
    }

    @PostMapping("/register/social/complete")
    public ResponseEntity<ApiResponse<UserSocialAuthDto.ResponseSocialComplete>> complete(
            @Valid @RequestBody UserSocialAuthDto.RequestSocialComplete request,
            HttpServletResponse response) {
        return ResponseEntity.ok(
                ApiResponse.ok("소셜 회원가입이 완료되었습니다.", userSocialAuthService.complete(request, response)));
    }
}
