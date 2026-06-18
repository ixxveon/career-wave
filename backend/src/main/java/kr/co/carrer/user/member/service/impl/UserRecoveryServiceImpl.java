package kr.co.carrer.user.member.service.impl;

import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.auth.store.RefreshTokenStore;
import org.springframework.data.redis.core.StringRedisTemplate;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.member.dto.UserRecoveryDto;
import kr.co.carrer.user.member.entity.Member;
import kr.co.carrer.user.member.entity.MemberVerification;
import kr.co.carrer.user.member.entity.PasswordResetToken;
import kr.co.carrer.user.member.exception.UserAuthErrorCode;
import kr.co.carrer.user.member.repository.CompanyProfileRepository;
import kr.co.carrer.user.member.repository.MemberVerificationRepository;
import kr.co.carrer.user.member.repository.PasswordResetTokenRepository;
import kr.co.carrer.user.member.repository.UserMemberQueryRepository;
import kr.co.carrer.user.member.repository.UserMemberRepository;
import kr.co.carrer.user.member.service.UserRecoveryService;
import kr.co.carrer.user.member.type.MemberType;
import kr.co.carrer.user.member.type.RoleType;
import kr.co.carrer.user.member.type.VerificationChannel;
import kr.co.carrer.user.member.type.VerificationPurpose;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserRecoveryServiceImpl implements UserRecoveryService {

    private static final long RESET_TOKEN_EXPIRES_SECONDS = 600L; // 10분
    private static final int RESET_MAX_FAIL = 5;
    private static final String RESET_FAIL_PREFIX = "password-reset:fail:";
    private static final int ISSUE_RATE_LIMIT = 5;
    private static final long ISSUE_RATE_TTL_SECONDS = 600L; // 10분
    private static final String ISSUE_RATE_PREFIX = "password-token:rate:";

    // INCR + 최초 TTL 설정 원자 Lua 스크립트 — INCR/EXPIRE 사이 프로세스 종료 시 TTL 미설정 방지
    private static final DefaultRedisScript<Long> INCR_WITH_TTL_SCRIPT = new DefaultRedisScript<>(
            "local count = redis.call('INCR', KEYS[1])\n" +
            "if count == 1 then\n" +
            "  redis.call('EXPIRE', KEYS[1], ARGV[1])\n" +
            "end\n" +
            "return count",
            Long.class
    );

    private final UserMemberRepository memberRepository;
    private final UserMemberQueryRepository memberQueryRepository;
    private final CompanyProfileRepository companyProfileRepository;
    private final MemberVerificationRepository verificationRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenStore refreshTokenStore;
    private final StringRedisTemplate redisTemplate;

    // ── 아이디 찾기 ────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public UserRecoveryDto.ResponseFindId findId(UserRecoveryDto.RequestFindId request) {
        MemberVerification verification = verificationRepository
                .findByVerificationToken(request.getVerificationToken())
                .orElseThrow(() -> new CustomException(UserAuthErrorCode.VERIFICATION_TOKEN_INVALID));

        UserVerificationServiceImpl.validateVerificationToken(
                verification,
                verification.getChannel(),
                verification.getTarget(),
                VerificationPurpose.FIND_ID);
        verification.markConsumed();

        List<String> rawIds;
        if (request.getRoleType() == MemberType.USER) {
            rawIds = findUserLoginIds(verification);
        } else {
            // 기업회원 — managerName·businessNumber 필수 (spec FR-011 준수)
            if (isBlank(request.getManagerName()) || isBlank(request.getBusinessNumber())) {
                return UserRecoveryDto.ResponseFindId.notFound();
            }
            rawIds = findCompanyLoginIds(verification, request.getManagerName(), request.getBusinessNumber());
        }

        if (rawIds.isEmpty()) return UserRecoveryDto.ResponseFindId.notFound();
        List<String> masked = rawIds.stream().map(this::maskLoginId).toList();
        return new UserRecoveryDto.ResponseFindId(masked, true);
    }

    private List<String> findUserLoginIds(MemberVerification verification) {
        if (verification.getChannel() == VerificationChannel.EMAIL) {
            return memberRepository.findByEmailAndRoleType(verification.getTarget(), RoleType.USER)
                    .stream().map(Member::getLoginId).toList();
        } else {
            return memberRepository.findByPhoneAndRoleType(verification.getTarget(), RoleType.USER)
                    .stream().map(Member::getLoginId).toList();
        }
    }

    private List<String> findCompanyLoginIds(MemberVerification verification,
                                              String managerName, String businessNumber) {
        if (verification.getChannel() == VerificationChannel.EMAIL) {
            return memberQueryRepository.findLoginIdsByManagerNameAndBusinessNumberAndEmail(
                    managerName, businessNumber, verification.getTarget());
        } else {
            return memberQueryRepository.findLoginIdsByManagerNameAndBusinessNumberAndPhone(
                    managerName, businessNumber, verification.getTarget());
        }
    }

    // loginId 마스킹 — 앞 3자 유지, 나머지 *
    private String maskLoginId(String loginId) {
        if (loginId == null || loginId.length() <= 3) return loginId;
        return loginId.substring(0, 3) + "*".repeat(loginId.length() - 3);
    }

    // ── 비밀번호 재설정 권한 발급 ────────────────────────────────────────────────

    @Override
    @Transactional
    public UserRecoveryDto.ResponsePasswordToken issuePasswordToken(
            UserRecoveryDto.RequestPasswordToken request, String clientIp) {
        // loginId + IP 기준 10분 5회 rate limit (spec §10)
        // Lua 스크립트로 INCR + 최초 EXPIRE를 원자 실행 — 프로세스 장애 시 TTL 미설정 방지
        String rateKey = ISSUE_RATE_PREFIX + request.getLoginId() + ":" + clientIp;
        Long rateCount = redisTemplate.execute(INCR_WITH_TTL_SCRIPT,
                List.of(rateKey), String.valueOf(ISSUE_RATE_TTL_SECONDS));
        if (rateCount == null || rateCount > ISSUE_RATE_LIMIT) {
            throw new CustomException(UserAuthErrorCode.VERIFICATION_RATE_LIMITED);
        }
        // verificationToken 검증
        MemberVerification verification = verificationRepository
                .findByVerificationToken(request.getVerificationToken())
                .orElseThrow(() -> new CustomException(UserAuthErrorCode.VERIFICATION_TOKEN_INVALID));

        UserVerificationServiceImpl.validateVerificationToken(
                verification,
                verification.getChannel(),
                verification.getTarget(),
                VerificationPurpose.RESET_PASSWORD);

        // 회원 조회 (계정 존재 여부 노출 금지 — 공통 메시지)
        Member member = findMemberForReset(request, verification);

        // 기업회원 추가 검증 — managerName·businessNumber를 DB 값과 대조 (단순 비어있음 체크 아님)
        if (request.getRoleType() == MemberType.COMPANY) {
            if (isBlank(request.getManagerName()) || isBlank(request.getBusinessNumber())) {
                throw new CustomException(UserAuthErrorCode.VERIFICATION_TOKEN_INVALID);
            }
            companyProfileRepository.findByMemberId(member.getMemberId())
                    .filter(cp -> cp.getBusinessNumber().equals(request.getBusinessNumber()))
                    .orElseThrow(() -> new CustomException(UserAuthErrorCode.VERIFICATION_TOKEN_INVALID));
            if (!member.getName().equals(request.getManagerName())) {
                throw new CustomException(UserAuthErrorCode.VERIFICATION_TOKEN_INVALID);
            }
        }

        // 중복 발급 방지 — 아직 유효한 token이 있으면 재사용 유도
        Instant now = Instant.now();
        if (resetTokenRepository.existsByMemberIdAndUsedAtIsNullAndExpiresAtAfter(member.getMemberId(), now)) {
            throw new CustomException(UserAuthErrorCode.PASSWORD_RESET_TOKEN_INVALID);
        }

        verification.markConsumed();

        String rawToken = generateRawToken();
        String tokenHash = hash(rawToken);
        Instant expiresAt = now.plusSeconds(RESET_TOKEN_EXPIRES_SECONDS);

        resetTokenRepository.save(PasswordResetToken.create(member.getMemberId(), tokenHash, expiresAt));
        return new UserRecoveryDto.ResponsePasswordToken(rawToken, expiresAt);
    }

    private Member findMemberForReset(UserRecoveryDto.RequestPasswordToken request,
                                       MemberVerification verification) {
        RoleType roleType = request.getRoleType() == MemberType.USER ? RoleType.USER : RoleType.COMPANY;
        Member member;
        if (verification.getChannel() == VerificationChannel.EMAIL) {
            member = memberRepository.findByEmailAndRoleType(verification.getTarget(), roleType)
                    .stream().filter(m -> m.getLoginId().equals(request.getLoginId()))
                    .findFirst()
                    .orElseThrow(() -> new CustomException(UserAuthErrorCode.VERIFICATION_TOKEN_INVALID));
        } else {
            member = memberRepository.findByPhoneAndRoleType(verification.getTarget(), roleType)
                    .stream().filter(m -> m.getLoginId().equals(request.getLoginId()))
                    .findFirst()
                    .orElseThrow(() -> new CustomException(UserAuthErrorCode.VERIFICATION_TOKEN_INVALID));
        }
        return member;
    }

    // ── 비밀번호 재설정 ─────────────────────────────────────────────────────────

    @Override
    @Transactional(noRollbackFor = {CustomException.class})
    public UserRecoveryDto.ResponseResetPassword resetPassword(UserRecoveryDto.RequestResetPassword request) {
        String tokenHash = hash(request.getResetToken());
        String failKey = RESET_FAIL_PREFIX + tokenHash;

        // 실패 횟수 체크 — 5회 초과 시 차단 (spec §10)
        String failCountStr = redisTemplate.opsForValue().get(failKey);
        if (failCountStr != null && Long.parseLong(failCountStr) >= RESET_MAX_FAIL) {
            throw new CustomException(UserAuthErrorCode.PASSWORD_RESET_TOKEN_INVALID);
        }

        PasswordResetToken resetToken = resetTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> {
                    incrementResetFailCount(failKey, 60L); // 존재하지 않는 token: 짧은 TTL
                    return new CustomException(UserAuthErrorCode.PASSWORD_RESET_TOKEN_INVALID);
                });

        if (resetToken.isUsed()) {
            throw new CustomException(UserAuthErrorCode.PASSWORD_RESET_TOKEN_INVALID);
        }
        if (resetToken.isExpired()) {
            throw new CustomException(UserAuthErrorCode.PASSWORD_RESET_TOKEN_EXPIRED);
        }

        Member member = memberRepository.findById(resetToken.getMemberId())
                .orElseThrow(() -> new CustomException(UserAuthErrorCode.PASSWORD_RESET_TOKEN_INVALID));

        // loginId 포함 금지 검증 (spec §8)
        if (request.getNewPassword().contains(member.getLoginId())) {
            incrementResetFailCount(failKey, resetToken.getExpiresAt().getEpochSecond() - Instant.now().getEpochSecond());
            throw new CustomException(UserAuthErrorCode.PASSWORD_POLICY_VIOLATION);
        }

        member.updatePassword(passwordEncoder.encode(request.getNewPassword()));
        resetToken.markUsed();

        // 모든 refresh token 폐기 — 개인/기업회원 모두 처리 (spec FR-018)
        AccountType accountType = member.getRoleType() == RoleType.USER
                ? AccountType.USER : AccountType.COMPANY;
        refreshTokenStore.deleteAll(accountType, member.getMemberId().toString());

        return new UserRecoveryDto.ResponseResetPassword(Instant.now());
    }

    private void incrementResetFailCount(String key, long ttlSeconds) {
        if (ttlSeconds <= 0) ttlSeconds = 60L;
        redisTemplate.execute(INCR_WITH_TTL_SCRIPT, List.of(key), String.valueOf(ttlSeconds));
    }

    // ── 내부 유틸 ─────────────────────────────────────────────────────────────

    private static String generateRawToken() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(
                    digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
