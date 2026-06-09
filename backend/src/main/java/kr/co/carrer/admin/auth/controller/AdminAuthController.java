package kr.co.carrer.admin.auth.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseCookie;
import jakarta.validation.Valid;
import kr.co.carrer.admin.auth.dto.AdminLoginRequest;
import kr.co.carrer.admin.auth.dto.AdminLoginResponse;
import kr.co.carrer.admin.auth.service.AdminLoginService;
import kr.co.carrer.global.auth.jwt.AccountType;
import kr.co.carrer.global.auth.jwt.JwtProperties;
import kr.co.carrer.global.auth.jwt.JwtTokenProvider;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import kr.co.carrer.global.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/auth")
public class AdminAuthController {

    private final AdminLoginService adminLoginService;
    private final JwtTokenProvider jwtTokenProvider;
    private final JwtProperties jwtProperties;

    public AdminAuthController(AdminLoginService adminLoginService,
                                JwtTokenProvider jwtTokenProvider,
                                JwtProperties jwtProperties) {
        this.adminLoginService = adminLoginService;
        this.jwtTokenProvider = jwtTokenProvider;
        this.jwtProperties = jwtProperties;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AdminLoginResponse>> login(
            @Valid @RequestBody AdminLoginRequest request,
            HttpServletResponse response) {
        AdminLoginResponse result = adminLoginService.login(request, response);
        return ResponseEntity.ok(ApiResponse.success("로그인되었습니다.", result));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<Map<String, String>>> refresh(
            HttpServletRequest request,
            HttpServletResponse response) {

        String refreshToken = extractRefreshTokenCookie(request);
        if (refreshToken == null) {
            throw new CustomException(ErrorCode.AUTH_REFRESH_INVALID);
        }

        if (!jwtTokenProvider.validate(refreshToken, AccountType.ADMIN)) {
            throw new CustomException(ErrorCode.AUTH_REFRESH_INVALID);
        }

        var claims = jwtTokenProvider.parse(refreshToken, AccountType.ADMIN);
        String subject = claims.getSubject();
        String adminRole = claims.get("adminRole", String.class);

        String newAccessToken = jwtTokenProvider.createAccessToken(
                subject, AccountType.ADMIN, "ROLE_ADMIN", adminRole);
        String newRefreshToken = jwtTokenProvider.createRefreshToken(subject, AccountType.ADMIN);

        ResponseCookie cookie = ResponseCookie.from("refreshToken", newRefreshToken)
                .httpOnly(true)
                .secure(true)
                .path("/api/v1/admin/auth")
                .maxAge(jwtProperties.getAdmin().getRefreshExpiration() / 1000)
                .sameSite("Strict")
                .build();
        response.addHeader("Set-Cookie", cookie.toString());

        return ResponseEntity.ok(ApiResponse.success("토큰이 갱신되었습니다.", Map.of("accessToken", newAccessToken)));
    }

    private String extractRefreshTokenCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
                .filter(c -> "refreshToken".equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }
}
