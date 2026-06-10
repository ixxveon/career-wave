package kr.co.carrer.admin.auth.service;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseCookie;
import kr.co.carrer.admin.auth.dto.AdminInfo;
import kr.co.carrer.admin.auth.dto.AdminLoginRequest;
import kr.co.carrer.admin.auth.dto.AdminLoginResponse;
import kr.co.carrer.admin.auth.entity.Admin;
import kr.co.carrer.admin.auth.repository.AdminRepository;
import kr.co.carrer.admin.auth.dto.AdminStatus;
import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.auth.jwt.JwtProperties;
import kr.co.carrer.auth.jwt.JwtTokenProvider;
import kr.co.carrer.auth.exception.AuthErrorCode;
import kr.co.carrer.global.exception.CustomException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class AdminLoginService {

    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final JwtProperties jwtProperties;

    public AdminLoginService(AdminRepository adminRepository,
                              PasswordEncoder passwordEncoder,
                              JwtTokenProvider jwtTokenProvider,
                              JwtProperties jwtProperties) {
        this.adminRepository = adminRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.jwtProperties = jwtProperties;
    }

    @Transactional
    public AdminLoginResponse login(AdminLoginRequest request, HttpServletResponse response) {
        Admin admin = adminRepository.findByLoginId(request.loginId())
                .orElseThrow(() -> new CustomException(AuthErrorCode.AUTH_INVALID_CREDENTIALS));

        // 계정 상태 먼저 체크 — 비밀번호 검증 전에 수행해야
        // 응답 코드 차이로 잠긴 계정의 비밀번호 일치 여부가 노출되지 않음
        if (admin.getStatus() == AdminStatus.LOCKED) {
            throw new CustomException(AuthErrorCode.AUTH_ACCOUNT_LOCKED);
        }

        if (!passwordEncoder.matches(request.password(), admin.getPasswordHash())) {
            throw new CustomException(AuthErrorCode.AUTH_INVALID_CREDENTIALS);
        }

        admin.updateLastLoginAt(Instant.now());

        String accessToken = jwtTokenProvider.createAccessToken(
                String.valueOf(admin.getAdminId()),
                AccountType.ADMIN,
                "ROLE_ADMIN",
                admin.getAdminRole().name()
        );

        String refreshToken = jwtTokenProvider.createRefreshToken(
                String.valueOf(admin.getAdminId()),
                AccountType.ADMIN,
                admin.getAdminRole().name()
        );

        setRefreshTokenCookie(response, refreshToken);

        AdminInfo adminInfo = new AdminInfo(
                admin.getAdminId(),
                admin.getName(),
                admin.getAdminRole().name()
        );

        return new AdminLoginResponse(accessToken, adminInfo);
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
