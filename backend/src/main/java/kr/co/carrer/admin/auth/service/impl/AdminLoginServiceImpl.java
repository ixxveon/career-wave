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
import kr.co.carrer.auth.jwt.SessionProperties;
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
import java.util.List;
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
    private final SessionProperties sessionProperties;

    @Transactional
    public AdminLoginDto.Response login(AdminLoginDto.Request request, HttpServletResponse response, String clientIp) {
        // login_id/email 각각 독립 unique 제약만 있어(교차 중복은 생성 시 별도 검증으로 방지),
        // 이론상 2건이 매칭되는 모호한 경우가 있을 수 있다 — 그 경우도 동일하게 로그인 실패로 처리한다.
        List<Admin> candidates = adminRepository.findByLoginIdOrEmail(request.getLoginId(), request.getLoginId());
        if (candidates.size() != 1) {
            throw new CustomException(AuthErrorCode.AUTH_INVALID_CREDENTIALS);
        }
        Admin admin = candidates.get(0);

        if (admin.getStatus() == AdminStatus.LOCKED) {
            throw new CustomException(AuthErrorCode.AUTH_ACCOUNT_LOCKED);
        }

        if (!passwordEncoder.matches(request.getPassword(), admin.getPasswordHash())) {
            // 실패 카운터 key는 사용자가 입력한 값(loginId 또는 email)이 아니라 계정의 canonical
            // loginId로 고정한다. 입력값 기준으로 두면 같은 계정을 아이디/이메일 번갈아 입력해
            // 잠금 기준(maxAttempts)을 사실상 우회할 수 있기 때문이다.
            long count = loginAttemptStore.increment(AccountType.ADMIN, admin.getLoginId());
            if (count >= loginAttemptStore.getMaxAttempts()) {
                admin.lockAccount();
                loginAttemptStore.clear(AccountType.ADMIN, admin.getLoginId());
                throw new CustomException(AuthErrorCode.AUTH_ACCOUNT_LOCKED);
            }
            throw new CustomException(AuthErrorCode.AUTH_INVALID_CREDENTIALS);
        }

        loginAttemptStore.clear(AccountType.ADMIN, admin.getLoginId());
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

        String sessionId = UUID.randomUUID().toString();
        String accessToken = jwtTokenProvider.createAccessToken(
                adminId, AccountType.ADMIN, "ADMIN", adminRole, sessionId
        );

        String refreshToken = jwtTokenProvider.createRefreshToken(
                adminId, AccountType.ADMIN, adminRole, sessionId
        );

        // TTL = 유휴 타임아웃(슬라이딩, 관리자 전용). 절대 상한(refresh 1일)은 refresh 토큰 exp가 담당.
        refreshTokenStore.save(AccountType.ADMIN, adminId, sessionId,
                refreshToken, Duration.ofMillis(sessionProperties.getIdleTimeout(AccountType.ADMIN)));

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

    public AdminLoginDto.TokenRefreshResponse refresh(String refreshToken, HttpServletResponse response) {
        if (!jwtTokenProvider.validate(refreshToken, AccountType.ADMIN)) {
            throw new CustomException(AuthErrorCode.AUTH_REFRESH_INVALID);
        }

        var claims = jwtTokenProvider.parse(refreshToken, AccountType.ADMIN);
        String subject = claims.getSubject();
        String sessionId = claims.get("sessionId", String.class);
        if (sessionId == null) throw new CustomException(AuthErrorCode.AUTH_REFRESH_INVALID);

        // 세션 부재 vs 재사용 분리:
        //  - Redis 키 부재(null) → 유휴 만료/로그아웃/퇴출 → 조용한 재로그인(SESSION_EXPIRED)
        //  - 키 존재 + hash 불일치 → 진짜 재사용 → 전체 세션 폐기 + 경보(REUSE_DETECTED)
        String storedHash = refreshTokenStore.get(AccountType.ADMIN, subject, sessionId);
        if (storedHash == null) {
            throw new CustomException(AuthErrorCode.AUTH_SESSION_EXPIRED);
        }
        if (!storedHash.equals(RefreshTokenStore.hash(refreshToken))) {
            refreshTokenStore.deleteAll(AccountType.ADMIN, subject);
            throw new CustomException(AuthErrorCode.AUTH_REFRESH_REUSE_DETECTED);
        }

        // admin 계정 상태 검증: ACTIVE만 재발급
        long adminId;
        try {
            adminId = Long.parseLong(subject);
        } catch (NumberFormatException e) {
            throw new CustomException(AuthErrorCode.AUTH_REFRESH_INVALID);
        }
        Admin admin = adminRepository.findById(adminId)
                .orElseThrow(() -> new CustomException(AuthErrorCode.AUTH_REFRESH_INVALID));
        if (admin.getStatus() != AdminStatus.ACTIVE) {
            throw new CustomException(AuthErrorCode.AUTH_REFRESH_INVALID);
        }

        // adminRole은 DB 최신값 사용 — claim의 stale role 방지
        String currentAdminRole = admin.getAdminRole().name();
        // 절대 상한 고정: 회전 시 원본 refresh 만료 시각(exp)을 유지한다.
        java.util.Date originalExp = claims.getExpiration();
        String newAccessToken = jwtTokenProvider.createAccessToken(
                subject, AccountType.ADMIN, "ADMIN", currentAdminRole, sessionId);
        String newRefreshToken = jwtTokenProvider.createRefreshToken(
                subject, AccountType.ADMIN, currentAdminRole, sessionId, originalExp);

        // rotate TTL = 유휴 타임아웃(슬라이딩, 관리자 전용). 절대 상한은 refresh exp가 담당.
        refreshTokenStore.rotate(AccountType.ADMIN, subject, sessionId,
                newRefreshToken, Duration.ofMillis(sessionProperties.getIdleTimeout(AccountType.ADMIN)));

        // session_jti를 회전된 access token의 jti로 갱신 — 세션 퇴출 시 최신 access를 blacklist 등록(보조 방어)
        String newJti = jwtTokenProvider.extractJti(newAccessToken, AccountType.ADMIN);
        refreshTokenStore.saveAccessJti(AccountType.ADMIN, subject, sessionId, newJti,
                Duration.ofMillis(jwtProperties.getAdmin().getAccessExpiration()));

        setRefreshTokenCookie(response, newRefreshToken);

        // 탭 재오픈 등 sessionStorage 부재 상황에서 refresh 만으로 세션 완전 복원이 가능하도록 adminInfo 동봉
        AdminLoginDto.AdminInfo adminInfo = new AdminLoginDto.AdminInfo(
                admin.getAdminId(), admin.getName(), currentAdminRole);
        return new AdminLoginDto.TokenRefreshResponse(newAccessToken, adminInfo);
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
