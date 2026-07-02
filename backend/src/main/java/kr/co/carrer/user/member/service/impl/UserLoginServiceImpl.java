package kr.co.carrer.user.member.service.impl;

import kr.co.carrer.user.member.dto.UserLoginDto;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseCookie;
import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.auth.jwt.CookieProperties;
import kr.co.carrer.auth.jwt.JwtProperties;
import kr.co.carrer.auth.jwt.JwtTokenProvider;
import kr.co.carrer.auth.exception.AuthErrorCode;
import io.jsonwebtoken.JwtException;
import kr.co.carrer.auth.store.LoginAttemptStore;
import kr.co.carrer.auth.store.RefreshTokenStore;
import kr.co.carrer.auth.store.TokenBlacklistStore;
import lombok.extern.slf4j.Slf4j;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.member.exception.UserAuthErrorCode;
import kr.co.carrer.user.member.entity.Member;
import kr.co.carrer.user.member.repository.UserMemberRepository;
import kr.co.carrer.user.member.repository.UserMemberStatusQueryRepository;
import kr.co.carrer.user.member.type.CompanyApprovalStatus;
import kr.co.carrer.user.member.type.MemberStatus;
import kr.co.carrer.user.member.type.MemberType;
import kr.co.carrer.user.member.type.RoleType;
import kr.co.carrer.user.member.service.UserLoginService;
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
public class UserLoginServiceImpl implements UserLoginService {

    private final UserMemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final JwtProperties jwtProperties;
    private final RefreshTokenStore refreshTokenStore;
    private final TokenBlacklistStore tokenBlacklistStore;
    private final LoginAttemptStore loginAttemptStore;
    private final UserMemberStatusQueryRepository statusQueryRepository;
    private final CookieProperties cookieProperties;

    private static final long LOCK_DURATION_MINUTES = 15L;

    @Transactional
    public UserLoginDto.Response login(UserLoginDto.Request request, HttpServletResponse response) {
        AccountType accountType = request.getRoleType() == MemberType.USER
                ? AccountType.USER : AccountType.COMPANY;
        String loginId = request.getLoginId();

        Member member = memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new CustomException(AuthErrorCode.AUTH_INVALID_CREDENTIALS));

        // 계정 상태 체크 — 비밀번호 검증 이전 수행 (공격자 비밀번호 일치 여부 식별 방지)
        CompanyApprovalStatus approvalStatus = validateAccountStatus(member);

        // 비밀번호 검증 + 실패 카운트
        if (!passwordEncoder.matches(request.getPassword(), member.getPassword())) {
            long count = loginAttemptStore.increment(accountType, loginId);
            if (count >= loginAttemptStore.getMaxAttempts()) {
                member.lockAccount(Instant.now().plusSeconds(LOCK_DURATION_MINUTES * 60));
                loginAttemptStore.clear(accountType, loginId);
                throw new CustomException(AuthErrorCode.AUTH_ACCOUNT_LOCKED);
            }
            throw new CustomException(AuthErrorCode.AUTH_INVALID_CREDENTIALS);
        }

        // roleType 일치 검증 (프론트 탭과 실제 role_type이 같아야 함)
        RoleType expectedRole = accountType == AccountType.USER ? RoleType.USER : RoleType.COMPANY;
        if (member.getRoleType() != expectedRole) {
            throw new CustomException(AuthErrorCode.AUTH_INVALID_CREDENTIALS);
        }

        // 로그인 성공 — 실패 카운트 초기화
        loginAttemptStore.clear(accountType, loginId);

        member.updateLastLoginAt(Instant.now());

        String accessToken = jwtTokenProvider.createAccessToken(
                member.getMemberId().toString(),
                accountType,
                member.getRoleType().name(),
                null
        );

        String sessionId = UUID.randomUUID().toString();
        String refreshToken = jwtTokenProvider.createRefreshToken(
                member.getMemberId().toString(),
                accountType,
                null,
                sessionId
        );

        // USER 5세션 상한 — 초과 세션 퇴출 + 해당 access token blacklist 등록
        String memberId = member.getMemberId().toString();
        Duration accessTtl = Duration.ofMillis(jwtProperties.getUser().getAccessExpiration());
        refreshTokenStore.enforceSessionLimit(accountType, memberId)
                .forEach(expiredKey -> {
                    String expiredSessionId = expiredKey.substring(expiredKey.lastIndexOf(':') + 1);
                    String expiredJti = refreshTokenStore.getAndDeleteAccessJti(accountType, memberId, expiredSessionId);
                    if (expiredJti != null) tokenBlacklistStore.add(expiredJti, accessTtl);
                    refreshTokenStore.delete(accountType, memberId, expiredSessionId);
                });

        // refresh token Redis 저장 (SHA-256 hash, TTL = refresh 만료시간)
        refreshTokenStore.save(accountType, memberId, sessionId,
                refreshToken, Duration.ofMillis(jwtProperties.getUser().getRefreshExpiration()));

        // access token jti 저장 — 이후 세션 퇴출 시 blacklist 등록에 사용
        String jti = jwtTokenProvider.extractJti(accessToken, accountType);
        refreshTokenStore.saveAccessJti(accountType, memberId, sessionId, jti, accessTtl);

        setRefreshTokenCookie(response, refreshToken);

        UserLoginDto.MemberInfo summary = UserLoginDto.MemberInfo.of(
                member.getMemberId(),
                member.getLoginId(),
                member.getName(),
                member.getRoleType(),
                member.getMemberStatus(),
                member.getSubscriptionStatus(),
                approvalStatus,
                member.getLastLoginAt()
        );

        return new UserLoginDto.Response(accessToken, summary);
    }

    private CompanyApprovalStatus validateAccountStatus(Member member) {
        switch (member.getMemberStatus()) {
            case SUSPENDED -> throw new CustomException(UserAuthErrorCode.AUTH_ACCOUNT_SUSPENDED);
            case BANNED        -> throw new CustomException(UserAuthErrorCode.AUTH_ACCOUNT_BANNED);
            case BLACKLISTED   -> throw new CustomException(UserAuthErrorCode.AUTH_ACCOUNT_BLACKLISTED);
            case WITHDRAWN -> throw new CustomException(UserAuthErrorCode.AUTH_ACCOUNT_WITHDRAWN);
            case LOCKED -> {
                if (member.getLockedUntil() != null && Instant.now().isBefore(member.getLockedUntil())) {
                    throw new CustomException(AuthErrorCode.AUTH_ACCOUNT_LOCKED);
                }
                // locked_until 경과 → ACTIVE 자동 복구 (dirty checking으로 DB 반영) + Redis 카운트 초기화
                member.recoverFromLock();
                loginAttemptStore.clear(
                        member.getRoleType() == RoleType.USER ? AccountType.USER : AccountType.COMPANY,
                        member.getLoginId()
                );
            }
            default -> {}
        }
        if (member.getRoleType() == RoleType.COMPANY) {
            String rawHrStatus = statusQueryRepository.findCompanyHrStatus(member.getMemberId());
            CompanyApprovalStatus status = UserMemberStatusQueryRepository.mapCompanyApprovalStatus(rawHrStatus);
            if ("REMOVED".equals(rawHrStatus)) {
                throw new CustomException(UserAuthErrorCode.AUTH_COMPANY_REJECTED);
            }
            switch (status) {
                case PENDING_REVIEW -> throw new CustomException(UserAuthErrorCode.AUTH_COMPANY_PENDING_REVIEW);
                case REJECTED       -> throw new CustomException(UserAuthErrorCode.AUTH_COMPANY_REJECTED);
                case NEEDS_REVISION -> throw new CustomException(UserAuthErrorCode.AUTH_COMPANY_NEEDS_REVISION);
                case APPROVED       -> { /* 로그인 허용 */ }
                // NONE(hr_managers row 없음) 포함 나머지 — fail-close: spec "APPROVED만 로그인 가능"
                default             -> throw new CustomException(UserAuthErrorCode.AUTH_COMPANY_PENDING_REVIEW);
            }
            return status;
        }
        return CompanyApprovalStatus.NONE;
    }

    private CompanyApprovalStatus resolveCompanyApprovalStatus(Member member) {
        if (member.getRoleType() != RoleType.COMPANY) {
            return CompanyApprovalStatus.NONE;
        }
        return UserMemberStatusQueryRepository.mapCompanyApprovalStatus(statusQueryRepository.findCompanyHrStatus(member.getMemberId()));
    }

    @Transactional
    public String refresh(String refreshToken, HttpServletResponse response) {
        AccountType accountType;
        try {
            accountType = jwtTokenProvider.extractAccountType(refreshToken);
        } catch (IllegalArgumentException e) {
            throw new CustomException(AuthErrorCode.AUTH_REFRESH_INVALID);
        }
        if (accountType == AccountType.ADMIN) {
            throw new CustomException(AuthErrorCode.AUTH_REFRESH_INVALID);
        }
        if (!jwtTokenProvider.validate(refreshToken, accountType)) {
            throw new CustomException(AuthErrorCode.AUTH_REFRESH_INVALID);
        }

        var claims = jwtTokenProvider.parse(refreshToken, accountType);
        String subject = claims.getSubject();
        String sessionId = claims.get("sessionId", String.class);
        if (sessionId == null) throw new CustomException(AuthErrorCode.AUTH_REFRESH_INVALID);

        // 재사용 탐지: hash 불일치 → 전체 세션 폐기 + 401
        if (!refreshTokenStore.matches(accountType, subject, sessionId, refreshToken)) {
            refreshTokenStore.deleteAll(accountType, subject);
            throw new CustomException(AuthErrorCode.AUTH_REFRESH_REUSE_DETECTED);
        }

        // 계정 상태 검증: ACTIVE만 재발급
        UUID memberId;
        try {
            memberId = UUID.fromString(subject);
        } catch (IllegalArgumentException e) {
            throw new CustomException(AuthErrorCode.AUTH_REFRESH_INVALID);
        }
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new CustomException(AuthErrorCode.AUTH_REFRESH_INVALID));
        if (member.getMemberStatus() != MemberStatus.ACTIVE) {
            throw new CustomException(AuthErrorCode.AUTH_REFRESH_INVALID);
        }

        String newAccessToken = jwtTokenProvider.createAccessToken(subject, accountType, member.getRoleType().name(), null);
        String newRefreshToken = jwtTokenProvider.createRefreshToken(subject, accountType, null, sessionId);

        refreshTokenStore.rotate(accountType, subject, sessionId,
                newRefreshToken, Duration.ofMillis(jwtProperties.getUser().getRefreshExpiration()));
        setRefreshTokenCookie(response, newRefreshToken);
        return newAccessToken;
    }

    public void logout(String refreshToken, String accessToken) {
        try {
            AccountType accountType = jwtTokenProvider.extractAccountType(refreshToken);
            if (jwtTokenProvider.validate(refreshToken, accountType)) {
                var claims = jwtTokenProvider.parse(refreshToken, accountType);
                String subject = claims.getSubject();
                String sessionId = claims.get("sessionId", String.class);
                if (sessionId != null) {
                    refreshTokenStore.delete(accountType, subject, sessionId);
                }
            }
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("[로그아웃] refresh token 처리 실패 (이미 만료/무효) — 무시하고 계속: {}", e.getMessage());
        }

        // access token blacklist 등록
        try {
            AccountType accountType = jwtTokenProvider.extractAccountType(accessToken);
            if (jwtTokenProvider.validate(accessToken, accountType)) {
                String jti = jwtTokenProvider.extractJti(accessToken, accountType);
                Duration ttl = jwtTokenProvider.remainingTtl(accessToken, accountType);
                tokenBlacklistStore.add(jti, ttl);
            }
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("[로그아웃] access token blacklist 등록 실패 (이미 만료/무효) — 무시하고 계속: {}", e.getMessage());
        }
    }

    private void setRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        ResponseCookie cookie = cookieProperties.applyDomain(ResponseCookie.from("refreshToken", refreshToken)
                        .httpOnly(true)
                        .secure(cookieProperties.isSecure())
                        .path("/api/v1/user/members")
                        .maxAge(jwtProperties.getUser().getRefreshExpiration() / 1000)
                        .sameSite("Strict"))
                .build();
        response.addHeader("Set-Cookie", cookie.toString());
    }
}
