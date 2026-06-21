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
            case UserSocialAuthDto.ResponseOAuthCallbackLogin login ->
                    UriComponentsBuilder.fromHttpUrl(frontendUrl + "/auth/oauth/callback")
                            .queryParam("type", "login")
                            .queryParam("accessToken", login.getAccessToken())
                            .build().toUriString();
            case UserSocialAuthDto.ResponseOAuthCallbackSignupRequired signup ->
                    UriComponentsBuilder.fromHttpUrl(frontendUrl + "/auth/oauth/callback")
                            .queryParam("type", "signup")
                            .queryParam("provider", signup.provider())
                            .queryParam("email", signup.socialEmail() != null ? signup.socialEmail() : "")
                            .queryParam("token", signup.socialSignupToken())
                            .build().toUriString();
        };
        response.sendRedirect(redirectUrl);
    }

    @PostMapping("/register/social/complete")
    public ResponseEntity<ApiResponse<UserSocialAuthDto.ResponseSocialComplete>> complete(
            @Valid @RequestBody UserSocialAuthDto.RequestSocialComplete request,
            HttpServletResponse response) {
        return ResponseEntity.ok(
                ApiResponse.ok("소셜 회원가입이 완료되었습니다.", userSocialAuthService.complete(request, response)));
    }
}
