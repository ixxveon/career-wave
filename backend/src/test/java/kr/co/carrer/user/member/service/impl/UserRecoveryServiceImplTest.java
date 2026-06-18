package kr.co.carrer.user.member.service.impl;

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

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

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
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
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
        when(valueOps.get(anyString())).thenReturn(null);
        when(valueOps.increment(anyString())).thenReturn(1L);
        when(redisTemplate.expire(anyString(), any())).thenReturn(true);

        UserRecoveryDto.RequestPasswordToken request = createCompanyPasswordTokenRequest(
                member.getLoginId(), "vtoken", "홍담당", "9999999999"); // 다른 사업자번호

        // when & then — businessNumber 불일치 → VERIFICATION_TOKEN_INVALID
        assertThatThrownBy(() -> service.issuePasswordToken(request, "127.0.0.1"))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> {
                    assert ((CustomException) e).getErrorCode() == UserAuthErrorCode.VERIFICATION_TOKEN_INVALID;
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
                    assert ((CustomException) e).getErrorCode() == UserAuthErrorCode.PASSWORD_RESET_TOKEN_INVALID;
                });

        verify(resetTokenRepository, never()).findByTokenHash(any());
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
