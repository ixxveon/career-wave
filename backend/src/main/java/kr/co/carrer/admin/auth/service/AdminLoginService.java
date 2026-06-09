package kr.co.carrer.admin.auth.service;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import kr.co.carrer.admin.auth.dto.AdminInfo;
import kr.co.carrer.admin.auth.dto.AdminLoginRequest;
import kr.co.carrer.admin.auth.dto.AdminLoginResponse;
import kr.co.carrer.admin.auth.entity.Admin;
import kr.co.carrer.admin.auth.repository.AdminRepository;
import kr.co.carrer.admin.auth.type.AdminStatus;
import kr.co.carrer.global.auth.jwt.AccountType;
import kr.co.carrer.global.auth.jwt.JwtProperties;
import kr.co.carrer.global.auth.jwt.JwtTokenProvider;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
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
                .orElseThrow(() -> new CustomException(ErrorCode.AUTH_INVALID_CREDENTIALS));

        if (!passwordEncoder.matches(request.password(), admin.getPasswordHash())) {
            throw new CustomException(ErrorCode.AUTH_INVALID_CREDENTIALS);
        }

        if (admin.getStatus() == AdminStatus.LOCKED) {
            throw new CustomException(ErrorCode.AUTH_ACCOUNT_LOCKED);
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
                AccountType.ADMIN
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
        Cookie cookie = new Cookie("refreshToken", refreshToken);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/api/v1/admin/auth");
        cookie.setMaxAge((int) (jwtProperties.getAdmin().getRefreshExpiration() / 1000));
        response.addCookie(cookie);
    }
}
