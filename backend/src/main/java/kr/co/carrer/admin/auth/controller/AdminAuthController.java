package kr.co.carrer.admin.auth.controller;

import kr.co.carrer.admin.auth.dto.AdminLoginDto;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import kr.co.carrer.admin.auth.docs.AdminAuthControllerDocs;
import kr.co.carrer.admin.auth.service.AdminLoginService;
import kr.co.carrer.auth.exception.AuthErrorCode;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;

@RestController
@RequestMapping("/api/v1/admin/auth")
@RequiredArgsConstructor
public class AdminAuthController implements AdminAuthControllerDocs {

    private final AdminLoginService adminLoginService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AdminLoginDto.Response>> login(
            @Valid @RequestBody AdminLoginDto.Request request,
            HttpServletRequest httpRequest,
            HttpServletResponse response) {
        String clientIp = extractClientIp(httpRequest);
        return ResponseEntity.ok(ApiResponse.ok("로그인되었습니다.", adminLoginService.login(request, response, clientIp)));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AdminLoginDto.TokenRefreshResponse>> refresh(
            HttpServletRequest request,
            HttpServletResponse response) {
        String refreshToken = extractRefreshTokenCookie(request);
        if (refreshToken == null) throw new CustomException(AuthErrorCode.AUTH_REFRESH_INVALID);
        String newAccessToken = adminLoginService.refresh(refreshToken, response);
        return ResponseEntity.ok(ApiResponse.ok("토큰이 갱신되었습니다.", new AdminLoginDto.TokenRefreshResponse(newAccessToken)));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(HttpServletRequest request,
                                                     HttpServletResponse response) {
        String refreshToken = extractRefreshTokenCookie(request);
        String accessToken = extractBearerToken(request);
        adminLoginService.logout(
                refreshToken != null ? refreshToken : "",
                accessToken  != null ? accessToken  : ""
        );
        clearRefreshTokenCookie(response);
        return ResponseEntity.ok(ApiResponse.ok("로그아웃 되었습니다."));
    }

    private String extractClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private void clearRefreshTokenCookie(HttpServletResponse response) {
        response.addHeader("Set-Cookie",
                "refreshToken=; Path=/api/v1/admin/auth; Max-Age=0; HttpOnly; Secure; SameSite=Strict");
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
