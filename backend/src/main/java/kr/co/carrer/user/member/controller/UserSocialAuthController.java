package kr.co.carrer.user.member.controller;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.user.member.docs.UserSocialAuthControllerDocs;
import kr.co.carrer.user.member.dto.OAuthCallbackResponse;
import kr.co.carrer.user.member.dto.UserSocialAuthDto;
import kr.co.carrer.user.member.service.UserSocialAuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/user/members")
@RequiredArgsConstructor
public class UserSocialAuthController implements UserSocialAuthControllerDocs {

    private final UserSocialAuthService userSocialAuthService;

    @GetMapping("/oauth/{provider}/authorize")
    public ResponseEntity<ApiResponse<UserSocialAuthDto.ResponseOAuthAuthorize>> authorize(
            @PathVariable String provider) {
        return ResponseEntity.ok(
                ApiResponse.ok("소셜 인증 URL이 생성되었습니다.", userSocialAuthService.authorize(provider)));
    }

    @GetMapping("/oauth/{provider}/callback")
    public ResponseEntity<ApiResponse<?>> callback(
            @PathVariable String provider,
            @RequestParam String code,
            @RequestParam String state,
            HttpServletResponse response) {
        OAuthCallbackResponse result = userSocialAuthService.callback(provider, code, state, response);
        return switch (result) {
            case UserSocialAuthDto.ResponseOAuthCallbackLogin login ->
                    ResponseEntity.ok(ApiResponse.ok("로그인되었습니다.", login));
            case UserSocialAuthDto.ResponseOAuthCallbackSignupRequired signup ->
                    ResponseEntity.ok(ApiResponse.ok("추가정보 입력이 필요합니다.", signup));
        };
    }

    @PostMapping("/register/social/complete")
    public ResponseEntity<ApiResponse<UserSocialAuthDto.ResponseSocialComplete>> complete(
            @Valid @RequestBody UserSocialAuthDto.RequestSocialComplete request,
            HttpServletResponse response) {
        return ResponseEntity.ok(
                ApiResponse.ok("소셜 회원가입이 완료되었습니다.", userSocialAuthService.complete(request, response)));
    }
}
