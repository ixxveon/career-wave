package kr.co.carrer.user.member.service.impl;

import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.auth.store.RefreshTokenStore;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.member.dto.UserRecoveryDto;
import kr.co.carrer.user.member.entity.CompanyProfile;
import kr.co.carrer.user.member.entity.Member;
import kr.co.carrer.user.member.entity.MemberVerification;
import kr.co.carrer.user.member.entity.PasswordResetToken;
import kr.co.carrer.user.member.exception.UserAuthErrorCode;
import kr.co.carrer.user.member.repository.*;
import kr.co.carrer.user.member.type.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.lang.reflect.Field;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class UserRecoveryServiceImplTest {

    @Mock UserMemberRepository memberRepository;
    @Mock UserMemberQueryRepository memberQueryRepository;
    @Mock CompanyProfileRepository companyProfileRepository;
    @Mock MemberVerificationRepository verificationRepository;
    @Mock PasswordResetTokenRepository resetTokenRepository;
    @Mock RefreshTokenStore refreshTokenStore;
    @Mock StringRedisTemplate redisTemplate;
    @Mock ValueOperations<String, String> valueOps;

    private UserRecoveryServiceImpl service;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    @BeforeEach
    void setUp() {
        // opsForValue는 resetPassword 경로에서만 사용 — rate limit 경로(Lua script)에서는 불필요하므로 lenient 처리
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOps);
        service = new UserRecoveryServiceImpl(
                memberRepository, memberQueryRepository, companyProfileRepository,
                verificationRepository, resetTokenRepository, encoder,
                refreshTokenStore, redisTemplate);
    }

    // ─── 기업 비밀번호 재설정 — businessNumber 불일치 시 거부 ──────────────────────

    @Test
    void issuePasswordToken_기업회원_businessNumber_불일치_거부() throws Exception {
        // given
        MemberVerification verification = createEmailVerification("hr@company.com", VerificationPurpose.RESET_PASSWORD);
        when(verificationRepository.findByVerificationToken("vtoken")).thenReturn(Optional.of(verification));

        Member member = createMember(RoleType.COMPANY, MemberStatus.ACTIVE);
        when(memberRepository.findByEmailAndRoleType("hr@company.com", RoleType.COMPANY))
                .thenReturn(Optional.of(member));

        CompanyProfile cp = mock(CompanyProfile.class);
        when(cp.getBusinessNumber()).thenReturn("1234567890");
        when(companyProfileRepository.findByMemberId(member.getMemberId())).thenReturn(Optional.of(cp));
        when(redisTemplate.execute(any(), anyList(), any(Object[].class))).thenReturn(1L);

        UserRecoveryDto.RequestPasswordToken request = createCompanyPasswordTokenRequest(
                member.getLoginId(), "vtoken", "홍담당", "9999999999"); // 다른 사업자번호

        // when & then — businessNumber 불일치 → VERIFICATION_TOKEN_INVALID
        assertThatThrownBy(() -> service.issuePasswordToken(request, "127.0.0.1"))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> {
                    assertThat(((CustomException) e).getErrorCode()).isEqualTo(UserAuthErrorCode.VERIFICATION_TOKEN_INVALID);
                });
    }

    // ─── resetToken 실패 5회 차단 ────────────────────────────────────────────────

    @Test
    void resetPassword_실패_5회_초과_차단() throws Exception {
        // Redis 카운터가 이미 5이면 차단
        when(valueOps.get(startsWith("password-reset:fail:"))).thenReturn("5");

        UserRecoveryDto.RequestResetPassword request = new UserRecoveryDto.RequestResetPassword();
        setField(request, "resetToken", "any-token");
        setField(request, "newPassword", "NewPass1!");

        assertThatThrownBy(() -> service.resetPassword(request))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> {
                    assertThat(((CustomException) e).getErrorCode()).isEqualTo(UserAuthErrorCode.PASSWORD_RESET_TOKEN_INVALID);
                });

        verify(resetTokenRepository, never()).findByTokenHash(any());
    }

    // ─── resetToken 발급 rate limit 초과 — loginId+IP 10분 5회 ──────────────────────

    @Test
    void issuePasswordToken_rate_limit_초과_VERIFICATION_RATE_LIMITED() throws Exception {
        // Lua 스크립트 execute 결과가 6 (> 5 limit) → 차단
        when(redisTemplate.execute(any(), anyList(), any(Object[].class))).thenReturn(6L);

        UserRecoveryDto.RequestPasswordToken req = new UserRecoveryDto.RequestPasswordToken();
        setField(req, "roleType", MemberType.USER);
        setField(req, "loginId", "testlogin");
        setField(req, "verificationToken", "vtoken");

        assertThatThrownBy(() -> service.issuePasswordToken(req, "1.2.3.4"))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.VERIFICATION_RATE_LIMITED));

        verify(verificationRepository, never()).findByVerificationToken(any());
    }

    // ─── 비밀번호 재설정 성공 — 전체 refresh token 삭제 ─────────────────────────────

    @Test
    void resetPassword_성공_refreshTokenStore_deleteAll_호출() throws Exception {
        when(valueOps.get(startsWith("password-reset:fail:"))).thenReturn(null);

        UUID memberId = UUID.randomUUID();
        PasswordResetToken resetToken = mock(PasswordResetToken.class);
        when(resetToken.isUsed()).thenReturn(false);
        when(resetToken.isExpired()).thenReturn(false);
        when(resetToken.getMemberId()).thenReturn(memberId);
        when(resetTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(resetToken));

        Member member = createMember(RoleType.USER, MemberStatus.ACTIVE);
        setField(member, "memberId", memberId);
        when(memberRepository.findById(memberId)).thenReturn(Optional.of(member));

        UserRecoveryDto.RequestResetPassword req = new UserRecoveryDto.RequestResetPassword();
        setField(req, "resetToken", "rawtoken-abcdefghijklmno");
        setField(req, "newPassword", "NewPass1!");

        service.resetPassword(req);

        verify(refreshTokenStore).deleteAll(eq(AccountType.USER), anyString());
    }

    // ─── 개인회원 아이디 찾기 성공 — EMAIL 채널 ────────────────────────────────────────

    @Test
    void findId_개인회원_EMAIL_성공_loginId() throws Exception {
        MemberVerification verification = createEmailVerification("user@example.com", VerificationPurpose.FIND_ID);
        when(verificationRepository.findByVerificationToken("vtoken")).thenReturn(Optional.of(verification));

        Member member = createMember(RoleType.USER, MemberStatus.ACTIVE);
        setField(member, "loginId", "career01");
        // findByEmailAndRoleType returns Optional<Member>
        when(memberRepository.findByEmailAndRoleType("user@example.com", RoleType.USER))
                .thenReturn(Optional.of(member));

        UserRecoveryDto.RequestFindId req = new UserRecoveryDto.RequestFindId();
        setField(req, "roleType", MemberType.USER);
        setField(req, "verificationToken", "vtoken");

        UserRecoveryDto.ResponseFindId resp = service.findId(req);

        assertThat(resp.found()).isTrue();
        assertThat(resp.loginIds()).hasSize(1);
        assertThat(resp.loginIds().get(0)).isEqualTo("career01");
    }

    // ─── 기업회원 아이디 찾기 성공 ───────────────────────────────────────────────────

    @Test
    void findId_기업회원_성공_loginId() throws Exception {
        MemberVerification verification = createEmailVerification("hr@company.com", VerificationPurpose.FIND_ID);
        when(verificationRepository.findByVerificationToken("vtoken")).thenReturn(Optional.of(verification));
        when(memberQueryRepository.findLoginIdsByManagerNameAndBusinessNumberAndEmail(
                "홍담당", "1234567890", "hr@company.com"))
                .thenReturn(java.util.List.of("company01"));

        UserRecoveryDto.RequestFindId req = new UserRecoveryDto.RequestFindId();
        setField(req, "roleType", MemberType.COMPANY);
        setField(req, "verificationToken", "vtoken");
        setField(req, "managerName", "홍담당");
        setField(req, "businessNumber", "1234567890");

        UserRecoveryDto.ResponseFindId resp = service.findId(req);

        assertThat(resp.found()).isTrue();
        assertThat(resp.loginIds().get(0)).isEqualTo("company01");
    }

    // ─── 아이디 찾기 — 결과 없음 found=false ─────────────────────────────────────────

    @Test
    void findId_결과_없음_found_false() throws Exception {
        MemberVerification verification = createEmailVerification("nobody@example.com", VerificationPurpose.FIND_ID);
        when(verificationRepository.findByVerificationToken("vtoken")).thenReturn(Optional.of(verification));
        when(memberRepository.findByEmailAndRoleType("nobody@example.com", RoleType.USER))
                .thenReturn(Optional.empty());

        UserRecoveryDto.RequestFindId req = new UserRecoveryDto.RequestFindId();
        setField(req, "roleType", MemberType.USER);
        setField(req, "verificationToken", "vtoken");

        UserRecoveryDto.ResponseFindId resp = service.findId(req);

        assertThat(resp.found()).isFalse();
        assertThat(resp.loginIds()).isEmpty();
    }

    // ─── loginId 전체 반환 (마스킹 없음) ────────────────────────────────────────────

    @Test
    void findId_loginId_전체_반환() throws Exception {
        MemberVerification verification = createEmailVerification("user@example.com", VerificationPurpose.FIND_ID);
        when(verificationRepository.findByVerificationToken("vtoken")).thenReturn(Optional.of(verification));

        Member member = createMember(RoleType.USER, MemberStatus.ACTIVE);
        setField(member, "loginId", "abcdef");
        when(memberRepository.findByEmailAndRoleType(anyString(), any())).thenReturn(Optional.of(member));

        UserRecoveryDto.RequestFindId req = new UserRecoveryDto.RequestFindId();
        setField(req, "roleType", MemberType.USER);
        setField(req, "verificationToken", "vtoken");

        UserRecoveryDto.ResponseFindId resp = service.findId(req);

        assertThat(resp.loginIds().get(0)).isEqualTo("abcdef");
    }

    // ─── 비밀번호 resetToken 발급 성공 — 개인회원 ───────────────────────────────────────

    @Test
    void issuePasswordToken_개인회원_성공() throws Exception {
        when(redisTemplate.execute(any(), anyList(), any(Object[].class))).thenReturn(1L); // rate limit 미초과

        MemberVerification verification = createEmailVerification("user@example.com", VerificationPurpose.RESET_PASSWORD);
        when(verificationRepository.findByVerificationToken("vtoken")).thenReturn(Optional.of(verification));

        Member member = createMember(RoleType.USER, MemberStatus.ACTIVE);
        when(memberRepository.findByEmailAndRoleType("user@example.com", RoleType.USER))
                .thenReturn(Optional.of(member)); // Optional<Member>
        when(resetTokenRepository.existsByMemberIdAndUsedAtIsNullAndExpiresAtAfter(any(), any()))
                .thenReturn(false);

        UserRecoveryDto.RequestPasswordToken req = new UserRecoveryDto.RequestPasswordToken();
        setField(req, "roleType", MemberType.USER);
        setField(req, "loginId", "testlogin");
        setField(req, "verificationToken", "vtoken");

        UserRecoveryDto.ResponsePasswordToken resp = service.issuePasswordToken(req, "127.0.0.1");

        assertThat(resp).isNotNull();
        assertThat(resp.resetToken()).isNotBlank();
        assertThat(resp.expiresAt()).isAfter(Instant.now());
        verify(resetTokenRepository, times(1)).save(any());
    }

    // ─── resetToken 이미 사용됨 — PASSWORD_RESET_TOKEN_INVALID ───────────────────────

    @Test
    void resetPassword_토큰_이미_사용됨_PASSWORD_RESET_TOKEN_INVALID() throws Exception {
        when(valueOps.get(startsWith("password-reset:fail:"))).thenReturn(null);

        PasswordResetToken resetToken = mock(PasswordResetToken.class);
        when(resetToken.isUsed()).thenReturn(true);
        when(resetTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(resetToken));

        UserRecoveryDto.RequestResetPassword req = new UserRecoveryDto.RequestResetPassword();
        setField(req, "resetToken", "already-used-token-xyz");
        setField(req, "newPassword", "NewPass1!");

        assertThatThrownBy(() -> service.resetPassword(req))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.PASSWORD_RESET_TOKEN_INVALID));

        verify(memberRepository, never()).findById(any());
    }

    // ─── resetToken 만료 — PASSWORD_RESET_TOKEN_EXPIRED ──────────────────────────────

    @Test
    void resetPassword_토큰_만료_PASSWORD_RESET_TOKEN_EXPIRED() throws Exception {
        when(valueOps.get(startsWith("password-reset:fail:"))).thenReturn(null);

        PasswordResetToken resetToken = mock(PasswordResetToken.class);
        when(resetToken.isUsed()).thenReturn(false);
        when(resetToken.isExpired()).thenReturn(true);
        when(resetTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(resetToken));

        UserRecoveryDto.RequestResetPassword req = new UserRecoveryDto.RequestResetPassword();
        setField(req, "resetToken", "expired-token-xyz-12345678");
        setField(req, "newPassword", "NewPass1!");

        assertThatThrownBy(() -> service.resetPassword(req))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.PASSWORD_RESET_TOKEN_EXPIRED));
    }

    // ─── 내부 유틸 ───────────────────────────────────────────────────────────────

    private MemberVerification createEmailVerification(String target, VerificationPurpose purpose) throws Exception {
        MemberVerification v = new MemberVerification() {};
        setField(v, "verificationId", UUID.randomUUID());
        setField(v, "channel", VerificationChannel.EMAIL);
        setField(v, "target", target);
        setField(v, "purpose", purpose);
        setField(v, "verificationToken", "vtoken");
        setField(v, "verificationStatus", VerificationStatus.VERIFIED);
        setField(v, "remainingAttempts", 5);
        setField(v, "expiresAt", Instant.now().plusSeconds(300));
        setField(v, "resendAvailableAt", Instant.now().minusSeconds(10));
        return v;
    }

    private Member createMember(RoleType roleType, MemberStatus status) throws Exception {
        Member m = new Member() {};
        UUID id = UUID.randomUUID();
        setField(m, "memberId", id);
        setField(m, "loginId", "testlogin");
        setField(m, "name", "홍담당");
        setField(m, "email", "hr@company.com");
        setField(m, "roleType", roleType);
        setField(m, "memberStatus", status);
        setField(m, "subscriptionStatus", SubscriptionStatus.FREE);
        setField(m, "password", encoder.encode("pass1234!"));
        return m;
    }

    private UserRecoveryDto.RequestPasswordToken createCompanyPasswordTokenRequest(
            String loginId, String vtoken, String managerName, String businessNumber) throws Exception {
        UserRecoveryDto.RequestPasswordToken req = new UserRecoveryDto.RequestPasswordToken();
        setField(req, "roleType", MemberType.COMPANY);
        setField(req, "loginId", loginId);
        setField(req, "verificationToken", vtoken);
        setField(req, "managerName", managerName);
        setField(req, "businessNumber", businessNumber);
        return req;
    }

    private void setField(Object target, String name, Object value) throws Exception {
        Class<?> clazz = target.getClass();
        while (clazz != null) {
            try {
                Field field = clazz.getDeclaredField(name);
                field.setAccessible(true);
                field.set(target, value);
                return;
            } catch (NoSuchFieldException e) {
                clazz = clazz.getSuperclass();
            }
        }
        throw new NoSuchFieldException(name);
    }
}
