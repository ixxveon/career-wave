package kr.co.carrer.user.member.controller;

import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.user.member.dto.MemberStatusDto;
import kr.co.carrer.user.member.dto.UserLoginDto;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import kr.co.carrer.auth.exception.AuthErrorCode;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.user.member.docs.UserAuthControllerDocs;
import kr.co.carrer.user.member.service.UserLoginService;
import kr.co.carrer.user.member.service.UserMemberStatusService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;

@RestController
@RequestMapping("/api/v1/user/members")
@RequiredArgsConstructor
public class UserAuthController implements UserAuthControllerDocs {

    private final UserLoginService userLoginService;
    private final UserMemberStatusService memberStatusService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<UserLoginDto.Response>> login(
            @Valid @RequestBody UserLoginDto.Request request,
            HttpServletResponse response) {
        return ResponseEntity.ok(ApiResponse.ok("로그인되었습니다.", userLoginService.login(request, response)));
    }

    @PostMapping("/token/refresh")
    public ResponseEntity<ApiResponse<UserLoginDto.TokenRefreshResponse>> refreshToken(
            HttpServletRequest request,
            HttpServletResponse response) {
        String refreshToken = extractRefreshTokenCookie(request);
        if (refreshToken == null) throw new CustomException(AuthErrorCode.AUTH_REFRESH_INVALID);
        String newAccessToken = userLoginService.refresh(refreshToken, response);
        return ResponseEntity.ok(ApiResponse.ok("토큰이 갱신되었습니다.", new UserLoginDto.TokenRefreshResponse(newAccessToken)));
    }

    @GetMapping("/me/status")
    public ResponseEntity<ApiResponse<MemberStatusDto.Response>> getMemberStatus(
            @AuthenticationPrincipal AuthPrincipal principal) {
        if (principal == null) throw new CustomException(AuthErrorCode.AUTH_UNAUTHENTICATED);
        java.util.UUID memberId;
        try {
            memberId = java.util.UUID.fromString(principal.getId());
        } catch (IllegalArgumentException e) {
            throw new CustomException(AuthErrorCode.AUTH_UNAUTHENTICATED);
        }
        return ResponseEntity.ok(ApiResponse.ok(
                "요청이 성공적으로 처리되었습니다.",
                memberStatusService.getMemberStatus(memberId)
        ));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(HttpServletRequest request,
                                                     HttpServletResponse response) {
        String refreshToken = extractRefreshTokenCookie(request);
        String accessToken = extractBearerToken(request);
        userLoginService.logout(
                refreshToken != null ? refreshToken : "",
                accessToken  != null ? accessToken  : ""
        );
        clearRefreshTokenCookie(response);
        return ResponseEntity.ok(ApiResponse.ok("로그아웃 되었습니다."));
    }

    private void clearRefreshTokenCookie(HttpServletResponse response) {
        response.addHeader("Set-Cookie",
                "refreshToken=; Path=/api/v1/user/members; Max-Age=0; HttpOnly; Secure; SameSite=Strict");
    }

    private String extractRefreshTokenCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
                .filter(c -> "refreshToken".equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }

    private String extractBearerToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) return header.substring(7);
        return null;
    }
}
