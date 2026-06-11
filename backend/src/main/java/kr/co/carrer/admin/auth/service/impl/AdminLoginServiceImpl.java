package kr.co.carrer.admin.auth.service.impl;

import kr.co.carrer.admin.auth.dto.AdminLoginDto;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseCookie;

import kr.co.carrer.admin.auth.entity.Admin;
import kr.co.carrer.admin.auth.repository.AdminRepository;
import kr.co.carrer.admin.auth.type.AdminStatus;
import kr.co.carrer.admin.auth.service.AdminLoginService;
import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.auth.jwt.JwtProperties;
import kr.co.carrer.auth.jwt.JwtTokenProvider;
import kr.co.carrer.auth.exception.AuthErrorCode;
import kr.co.carrer.global.exception.CustomException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class AdminLoginServiceImpl implements AdminLoginService {

    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final JwtProperties jwtProperties;

    @Transactional
    public AdminLoginDto.Response login(AdminLoginDto.Request request, HttpServletResponse response) {
        Admin admin = adminRepository.findByLoginId(request.getLoginId())
                .orElseThrow(() -> new CustomException(AuthErrorCode.AUTH_INVALID_CREDENTIALS));

        if (admin.getStatus() == AdminStatus.LOCKED) {
            throw new CustomException(AuthErrorCode.AUTH_ACCOUNT_LOCKED);
        }

        if (!passwordEncoder.matches(request.getPassword(), admin.getPasswordHash())) {
            throw new CustomException(AuthErrorCode.AUTH_INVALID_CREDENTIALS);
        }

        admin.updateLastLoginAt(Instant.now());

        String accessToken = jwtTokenProvider.createAccessToken(
                String.valueOf(admin.getAdminId()),
                AccountType.ADMIN,
                "ADMIN",
                admin.getAdminRole().name()
        );

        String refreshToken = jwtTokenProvider.createRefreshToken(
                String.valueOf(admin.getAdminId()),
                AccountType.ADMIN,
                admin.getAdminRole().name()
        );

        setRefreshTokenCookie(response, refreshToken);

        AdminLoginDto.AdminInfo adminInfo = new AdminLoginDto.AdminInfo(
                admin.getAdminId(),
                admin.getName(),
                admin.getAdminRole().name()
        );

        return new AdminLoginDto.Response(accessToken, adminInfo);
    }

    private void setRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        ResponseCookie cookie = ResponseCookie.from("refreshToken", refreshToken)
                .httpOnly(true)
                .secure(true)
                .path("/api/v1/admin/auth")
                .maxAge(jwtProperties.getAdmin().getRefreshExpiration() / 1000)
                .sameSite("Strict")
                .build();
        response.addHeader("Set-Cookie", cookie.toString());
    }
}
