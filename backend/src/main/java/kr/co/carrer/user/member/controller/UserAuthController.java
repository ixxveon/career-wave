package kr.co.carrer.user.member.controller;

import kr.co.carrer.user.member.dto.UserLoginDto;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseCookie;
import jakarta.validation.Valid;
import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.auth.jwt.JwtProperties;
import kr.co.carrer.auth.jwt.JwtTokenProvider;
import kr.co.carrer.auth.exception.AuthErrorCode;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.user.member.docs.UserAuthControllerDocs;
import io.swagger.v3.oas.annotations.tags.Tag;

import kr.co.carrer.user.member.service.UserLoginService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.Map;

@Tag(name = "User Auth", description = "사용자 로그인 / 토큰 재발급 API")
@RestController
@RequestMapping("/api/v1/user/members")
public class UserAuthController implements UserAuthControllerDocs {

    private final UserLoginService userLoginService;
    private final JwtTokenProvider jwtTokenProvider;
    private final JwtProperties jwtProperties;

    public UserAuthController(UserLoginService userLoginService,
                               JwtTokenProvider jwtTokenProvider,
                               JwtProperties jwtProperties) {
        this.userLoginService = userLoginService;
        this.jwtTokenProvider = jwtTokenProvider;
        this.jwtProperties = jwtProperties;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<UserLoginDto.Response>> login(
            @Valid @RequestBody UserLoginDto.Request request,
            HttpServletResponse response) {
        UserLoginDto.Response result = userLoginService.login(request, response);
        return ResponseEntity.ok(ApiResponse.success("로그인되었습니다.", result));
    }

    @PostMapping("/token/refresh")
    public ResponseEntity<ApiResponse<Map<String, String>>> refreshToken(
            HttpServletRequest request,
            HttpServletResponse response) {

        String refreshToken = extractRefreshTokenCookie(request);
        if (refreshToken == null) {
            throw new CustomException(AuthErrorCode.AUTH_REFRESH_INVALID);
        }

        AccountType accountType;
        try {
            accountType = jwtTokenProvider.extractAccountType(refreshToken);
        } catch (IllegalArgumentException e) {
            throw new CustomException(AuthErrorCode.AUTH_REFRESH_INVALID);
        }

        // user 엔드포인트에서 ADMIN 토큰 재발급 차단
        if (accountType == AccountType.ADMIN) {
            throw new CustomException(AuthErrorCode.AUTH_REFRESH_INVALID);
        }

        if (!jwtTokenProvider.validate(refreshToken, accountType)) {
            throw new CustomException(AuthErrorCode.AUTH_REFRESH_INVALID);
        }

        var claims = jwtTokenProvider.parse(refreshToken, accountType);
        String subject = claims.getSubject();
        String roleType = accountType == AccountType.ADMIN ? "ROLE_ADMIN"
                : accountType == AccountType.COMPANY ? "ROLE_COMPANY" : "ROLE_USER";

        String newAccessToken = jwtTokenProvider.createAccessToken(subject, accountType, roleType, null);
        String newRefreshToken = jwtTokenProvider.createRefreshToken(subject, accountType, null);

        ResponseCookie cookie = ResponseCookie.from("refreshToken", newRefreshToken)
                .httpOnly(true)
                .secure(true)
                .path("/api/v1/user/members")
                .maxAge(jwtProperties.getUser().getRefreshExpiration() / 1000)
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
