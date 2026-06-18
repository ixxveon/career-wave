package kr.co.carrer.user.member.service.impl;

import kr.co.carrer.user.member.dto.UserRegisterDto;
import kr.co.carrer.user.member.entity.Member;
import kr.co.carrer.user.member.entity.MemberVerification;
import kr.co.carrer.user.member.exception.UserAuthErrorCode;
import kr.co.carrer.user.member.repository.*;
import kr.co.carrer.user.member.service.BusinessRegistrationVerificationPort;
import kr.co.carrer.user.member.service.EmploymentCertificateFilePort;
import kr.co.carrer.user.member.type.*;
import kr.co.carrer.global.exception.CustomException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.lang.reflect.Field;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserRegisterServiceImplTest {

    @Mock UserMemberRepository memberRepository;
    @Mock UserMemberPersonalProfileRepository personalProfileRepository;
    @Mock CompanyProfileRepository companyProfileRepository;
    @Mock UserHrManagerRepository hrManagerRepository;
    @Mock MemberTermsAgreementRepository termsRepository;
    @Mock MemberVerificationRepository verificationRepository;
    @Mock BusinessRegistrationVerificationPort businessVerificationPort;
    @Mock EmploymentCertificateFilePort employmentCertificateFilePort;

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private UserRegisterServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new UserRegisterServiceImpl(
                memberRepository, personalProfileRepository, companyProfileRepository,
                hrManagerRepository, termsRepository, verificationRepository,
                encoder, businessVerificationPort, employmentCertificateFilePort);
    }

    // ─── 개인회원 가입 성공 시 PersonalProfile 빈 row 생성 ─────────────────────────

    @Test
    void registerUser_성공_시_personalProfile_저장() throws Exception {
        // 이메일 인증 mock
        MemberVerification emailVerif = createVerification(VerificationChannel.EMAIL, "test@example.com");
        MemberVerification phoneVerif = createVerification(VerificationChannel.PHONE, "01012345678");
        when(verificationRepository.findByVerificationToken("etoken")).thenReturn(Optional.of(emailVerif));
        when(verificationRepository.findByVerificationToken("ptoken")).thenReturn(Optional.of(phoneVerif));

        // 중복 없음
        when(memberRepository.existsByLoginId(anyString())).thenReturn(false);
        when(memberRepository.existsByEmail(anyString())).thenReturn(false);
        when(memberRepository.existsByPhone(anyString())).thenReturn(false);

        // Member save 시 memberId 주입
        when(memberRepository.save(any())).thenAnswer(inv -> {
            Member m = inv.getArgument(0);
            setField(m, "memberId", UUID.randomUUID());
            return m;
        });

        UserRegisterDto.RequestPersonalRegister req = buildPersonalRequest();

        UserRegisterDto.ResponsePersonalRegister resp = service.registerUser(req);

        assertThat(resp).isNotNull();
        assertThat(resp.roleType()).isEqualTo("USER");

        // PersonalProfile 저장 확인 (spec FR-024)
        verify(personalProfileRepository, times(1)).save(any());
        // 약관 저장 확인
        verify(termsRepository, times(1)).save(any());
    }

    // ─── 로그인 아이디 포함 비밀번호 — PASSWORD_POLICY_VIOLATION ──────────────────

    @Test
    void registerUser_loginId_포함_비밀번호_정책위반() throws Exception {
        MemberVerification emailVerif = createVerification(VerificationChannel.EMAIL, "test@example.com");
        MemberVerification phoneVerif = createVerification(VerificationChannel.PHONE, "01012345678");
        when(verificationRepository.findByVerificationToken("etoken")).thenReturn(Optional.of(emailVerif));
        when(verificationRepository.findByVerificationToken("ptoken")).thenReturn(Optional.of(phoneVerif));

        UserRegisterDto.RequestPersonalRegister req = buildPersonalRequest();
        setField(req, "loginId", "user2024");
        setField(req, "password", "user2024Pass1!"); // loginId 포함

        assertThatThrownBy(() -> service.registerUser(req))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> {
                    assert ((CustomException) e).getErrorCode() == UserAuthErrorCode.PASSWORD_POLICY_VIOLATION;
                });
    }

    // ─── 내부 유틸 ───────────────────────────────────────────────────────────────

    private MemberVerification createVerification(VerificationChannel channel, String target) throws Exception {
        MemberVerification v = new MemberVerification() {};
        setField(v, "verificationId", UUID.randomUUID());
        setField(v, "channel", channel);
        setField(v, "target", target);
        setField(v, "purpose", VerificationPurpose.REGISTER);
        setField(v, "verificationStatus", VerificationStatus.VERIFIED);
        setField(v, "remainingAttempts", 5);
        setField(v, "expiresAt", Instant.now().plusSeconds(300));
        setField(v, "resendAvailableAt", Instant.now().minusSeconds(10));
        String token = channel == VerificationChannel.EMAIL ? "etoken" : "ptoken";
        setField(v, "verificationToken", token);
        return v;
    }

    private UserRegisterDto.RequestPersonalRegister buildPersonalRequest() throws Exception {
        UserRegisterDto.RequestPersonalRegister req = new UserRegisterDto.RequestPersonalRegister();
        setField(req, "loginId", "testuser01");
        setField(req, "password", "TestPass1!");
        setField(req, "name", "홍길동");
        setField(req, "email", "test@example.com");
        setField(req, "phone", "01012345678");
        setField(req, "emailVerificationToken", "etoken");
        setField(req, "phoneVerificationToken", "ptoken");
        UserRegisterDto.PersonalTerms terms = new UserRegisterDto.PersonalTerms();
        setField(terms, "service", true);
        setField(terms, "privacy", true);
        setField(terms, "marketing", false);
        setField(req, "terms", terms);
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
