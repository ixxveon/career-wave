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
import io.jsonwebtoken.JwtException;
import kr.co.carrer.auth.exception.AuthErrorCode;
import kr.co.carrer.auth.store.LoginAttemptStore;
import kr.co.carrer.auth.store.RefreshTokenStore;
import kr.co.carrer.auth.store.TokenBlacklistStore;
import lombok.extern.slf4j.Slf4j;
import kr.co.carrer.global.exception.CustomException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminLoginServiceImpl implements AdminLoginService {

    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final JwtProperties jwtProperties;
    private final RefreshTokenStore refreshTokenStore;
    private final TokenBlacklistStore tokenBlacklistStore;
    private final LoginAttemptStore loginAttemptStore;

    @Transactional
    public AdminLoginDto.Response login(AdminLoginDto.Request request, HttpServletResponse response, String clientIp) {
        Admin admin = adminRepository.findByLoginId(request.getLoginId())
                .orElseThrow(() -> new CustomException(AuthErrorCode.AUTH_INVALID_CREDENTIALS));

        if (admin.getStatus() == AdminStatus.LOCKED) {
            throw new CustomException(AuthErrorCode.AUTH_ACCOUNT_LOCKED);
        }

        if (!passwordEncoder.matches(request.getPassword(), admin.getPasswordHash())) {
            long count = loginAttemptStore.increment(AccountType.ADMIN, request.getLoginId());
            if (count >= loginAttemptStore.getMaxAttempts()) {
                admin.lockAccount();
                loginAttemptStore.clear(AccountType.ADMIN, request.getLoginId());
            }
            throw new CustomException(AuthErrorCode.AUTH_INVALID_CREDENTIALS);
        }

        loginAttemptStore.clear(AccountType.ADMIN, request.getLoginId());
        admin.updateLastLoginAt(Instant.now());
        admin.updateLastLoginIp(clientIp);

        String adminId = String.valueOf(admin.getAdminId());
        String adminRole = admin.getAdminRole().name();
        Duration accessTtl = Duration.ofMillis(jwtProperties.getAdmin().getAccessExpiration());

        // 단일 세션 정책: 기존 세션의 access token을 blacklist 등록 후 전체 삭제
        refreshTokenStore.getAllSessionIds(AccountType.ADMIN, adminId)
                .forEach(existingSessionId -> {
                    String expiredJti = refreshTokenStore.getAndDeleteAccessJti(AccountType.ADMIN, adminId, existingSessionId);
                    if (expiredJti != null) tokenBlacklistStore.add(expiredJti, accessTtl);
                });
        refreshTokenStore.deleteAll(AccountType.ADMIN, adminId);

        String accessToken = jwtTokenProvider.createAccessToken(
                adminId, AccountType.ADMIN, "ADMIN", adminRole
        );

        String sessionId = UUID.randomUUID().toString();
        String refreshToken = jwtTokenProvider.createRefreshToken(
                adminId, AccountType.ADMIN, adminRole, sessionId
        );

        refreshTokenStore.save(AccountType.ADMIN, adminId, sessionId,
                refreshToken, Duration.ofMillis(jwtProperties.getAdmin().getRefreshExpiration()));

        // access token jti 저장 — 다음 로그인 시 단일 세션 정책으로 blacklist 등록에 사용
        String jti = jwtTokenProvider.extractJti(accessToken, AccountType.ADMIN);
        refreshTokenStore.saveAccessJti(AccountType.ADMIN, adminId, sessionId, jti, accessTtl);

        setRefreshTokenCookie(response, refreshToken);

        AdminLoginDto.AdminInfo adminInfo = new AdminLoginDto.AdminInfo(
                admin.getAdminId(),
                admin.getName(),
                admin.getAdminRole().name()
        );

        return new AdminLoginDto.Response(accessToken, adminInfo);
    }

    public String refresh(String refreshToken, HttpServletResponse response) {
        if (!jwtTokenProvider.validate(refreshToken, AccountType.ADMIN)) {
            throw new CustomException(AuthErrorCode.AUTH_REFRESH_INVALID);
        }

        var claims = jwtTokenProvider.parse(refreshToken, AccountType.ADMIN);
        String subject = claims.getSubject();
        String sessionId = claims.get("sessionId", String.class);
        if (sessionId == null) throw new CustomException(AuthErrorCode.AUTH_REFRESH_INVALID);

        // 재사용 탐지: hash 불일치 → 전체 세션 폐기 + 401
        if (!refreshTokenStore.matches(AccountType.ADMIN, subject, sessionId, refreshToken)) {
            refreshTokenStore.deleteAll(AccountType.ADMIN, subject);
            throw new CustomException(AuthErrorCode.AUTH_REFRESH_REUSE_DETECTED);
        }

        // admin 계정 상태 검증: ACTIVE만 재발급
        Admin admin = adminRepository.findById(Long.parseLong(subject))
                .orElseThrow(() -> new CustomException(AuthErrorCode.AUTH_REFRESH_INVALID));
        if (admin.getStatus() != AdminStatus.ACTIVE) {
            throw new CustomException(AuthErrorCode.AUTH_REFRESH_INVALID);
        }

        // adminRole은 DB 최신값 사용 — claim의 stale role 방지
        String currentAdminRole = admin.getAdminRole().name();
        String newAccessToken = jwtTokenProvider.createAccessToken(
                subject, AccountType.ADMIN, "ADMIN", currentAdminRole);
        String newRefreshToken = jwtTokenProvider.createRefreshToken(
                subject, AccountType.ADMIN, currentAdminRole, sessionId);

        refreshTokenStore.rotate(AccountType.ADMIN, subject, sessionId,
                newRefreshToken, Duration.ofMillis(jwtProperties.getAdmin().getRefreshExpiration()));
        setRefreshTokenCookie(response, newRefreshToken);
        return newAccessToken;
    }

    public void logout(String refreshToken, String accessToken) {
        try {
            if (jwtTokenProvider.validate(refreshToken, AccountType.ADMIN)) {
                var claims = jwtTokenProvider.parse(refreshToken, AccountType.ADMIN);
                String sessionId = claims.get("sessionId", String.class);
                if (sessionId != null) {
                    refreshTokenStore.delete(AccountType.ADMIN, claims.getSubject(), sessionId);
                }
            }
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("[관리자 로그아웃] refresh token 처리 실패 (이미 만료/무효) — 무시하고 계속: {}", e.getMessage());
        }

        try {
            if (jwtTokenProvider.validate(accessToken, AccountType.ADMIN)) {
                String jti = jwtTokenProvider.extractJti(accessToken, AccountType.ADMIN);
                Duration ttl = jwtTokenProvider.remainingTtl(accessToken, AccountType.ADMIN);
                tokenBlacklistStore.add(jti, ttl);
            }
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("[관리자 로그아웃] access token blacklist 등록 실패 (이미 만료/무효) — 무시하고 계속: {}", e.getMessage());
        }
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
