package kr.co.carrer.user.member.service.impl;

import kr.co.carrer.user.member.dto.UserRegisterDto;
import kr.co.carrer.user.member.entity.CompanyProfile;
import kr.co.carrer.user.member.entity.Member;
import kr.co.carrer.user.member.entity.MemberTermsAgreement;
import kr.co.carrer.user.member.entity.MemberVerification;
import kr.co.carrer.user.member.exception.UserAuthErrorCode;
import kr.co.carrer.user.member.repository.*;
import kr.co.carrer.user.billing.service.EntitlementInitService;
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
import org.mockito.ArgumentCaptor;

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
    @Mock EntitlementInitService entitlementInitService;

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private UserRegisterServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new UserRegisterServiceImpl(
                memberRepository, personalProfileRepository, companyProfileRepository,
                hrManagerRepository, termsRepository, verificationRepository,
                encoder, businessVerificationPort, employmentCertificateFilePort,
                entitlementInitService);
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
        assertThat(emailVerif.getVerificationStatus()).isEqualTo(VerificationStatus.CONSUMED);
        assertThat(phoneVerif.getVerificationStatus()).isEqualTo(VerificationStatus.CONSUMED);
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
                    assertThat(((CustomException) e).getErrorCode()).isEqualTo(UserAuthErrorCode.PASSWORD_POLICY_VIOLATION);
                });
    }

    // ─── fileId port 실패 시 회원 미저장 ─────────────────────────────────────────────

    @Test
    void registerCompany_fileId_port_실패_회원_미저장() throws Exception {
        MemberVerification emailVerif = createVerification(VerificationChannel.EMAIL, "hr@company.com");
        MemberVerification phoneVerif = createVerification(VerificationChannel.PHONE, "01099998888");
        setField(phoneVerif, "verificationToken", "ptoken");
        when(verificationRepository.findByVerificationToken("etoken")).thenReturn(Optional.of(emailVerif));
        when(verificationRepository.findByVerificationToken("ptoken")).thenReturn(Optional.of(phoneVerif));

        when(memberRepository.existsByLoginId(anyString())).thenReturn(false);
        when(memberRepository.existsByEmail(anyString())).thenReturn(false);
        when(memberRepository.existsByPhone(anyString())).thenReturn(false);
        when(companyProfileRepository.existsByBusinessNumber(anyString())).thenReturn(false);
        when(businessVerificationPort.verify(anyString())).thenReturn(true);

        doThrow(new CustomException(UserAuthErrorCode.EMPLOYMENT_FILE_INVALID))
                .when(employmentCertificateFilePort).validate(anyString());

        UserRegisterDto.RequestCompanyRegister req = buildCompanyRequest();

        assertThatThrownBy(() -> service.registerCompany(req))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.EMPLOYMENT_FILE_INVALID));

        verify(memberRepository, never()).save(any());
    }

    // ─── loginId 중복 확인 ────────────────────────────────────────────────────────

    @Test
    void checkLoginId_사용가능한_아이디_available_true() {
        when(memberRepository.existsByLoginId("newuser01")).thenReturn(false);
        assertThat(service.checkLoginId("newuser01").available()).isTrue();
    }

    @Test
    void checkLoginId_중복된_아이디_available_false() {
        when(memberRepository.existsByLoginId("taken01")).thenReturn(true);
        assertThat(service.checkLoginId("taken01").available()).isFalse();
    }

    @Test
    void checkLoginId_형식_오류_5자_LOGIN_ID_INVALID() {
        assertThatThrownBy(() -> service.checkLoginId("abc12")) // 5자 — 6자 미만
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.LOGIN_ID_INVALID));

        verifyNoInteractions(memberRepository);
    }

    @Test
    void checkLoginId_특수문자_포함_LOGIN_ID_INVALID() {
        assertThatThrownBy(() -> service.checkLoginId("user_01!")) // 특수문자 포함
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.LOGIN_ID_INVALID));
    }

    // ─── 개인회원 가입 중복 검증 ────────────────────────────────────────────────────

    @Test
    void registerUser_loginId_중복_LOGIN_ID_ALREADY_EXISTS() throws Exception {
        MemberVerification emailVerif = createVerification(VerificationChannel.EMAIL, "test@example.com");
        MemberVerification phoneVerif = createVerification(VerificationChannel.PHONE, "01012345678");
        when(verificationRepository.findByVerificationToken("etoken")).thenReturn(Optional.of(emailVerif));
        when(verificationRepository.findByVerificationToken("ptoken")).thenReturn(Optional.of(phoneVerif));
        when(memberRepository.existsByLoginId(anyString())).thenReturn(true); // 중복

        assertThatThrownBy(() -> service.registerUser(buildPersonalRequest()))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.LOGIN_ID_ALREADY_EXISTS));

        verify(memberRepository, never()).save(any());
    }

    @Test
    void registerUser_email_중복_EMAIL_ALREADY_EXISTS() throws Exception {
        MemberVerification emailVerif = createVerification(VerificationChannel.EMAIL, "test@example.com");
        MemberVerification phoneVerif = createVerification(VerificationChannel.PHONE, "01012345678");
        when(verificationRepository.findByVerificationToken("etoken")).thenReturn(Optional.of(emailVerif));
        when(verificationRepository.findByVerificationToken("ptoken")).thenReturn(Optional.of(phoneVerif));
        when(memberRepository.existsByLoginId(anyString())).thenReturn(false);
        when(memberRepository.existsByEmail(anyString())).thenReturn(true); // 중복

        assertThatThrownBy(() -> service.registerUser(buildPersonalRequest()))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.EMAIL_ALREADY_EXISTS));
    }

    @Test
    void registerUser_phone_중복_PHONE_ALREADY_EXISTS() throws Exception {
        MemberVerification emailVerif = createVerification(VerificationChannel.EMAIL, "test@example.com");
        MemberVerification phoneVerif = createVerification(VerificationChannel.PHONE, "01012345678");
        when(verificationRepository.findByVerificationToken("etoken")).thenReturn(Optional.of(emailVerif));
        when(verificationRepository.findByVerificationToken("ptoken")).thenReturn(Optional.of(phoneVerif));
        when(memberRepository.existsByLoginId(anyString())).thenReturn(false);
        when(memberRepository.existsByEmail(anyString())).thenReturn(false);
        when(memberRepository.existsByPhone(anyString())).thenReturn(true); // 중복

        assertThatThrownBy(() -> service.registerUser(buildPersonalRequest()))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.PHONE_ALREADY_EXISTS));
    }

    // ─── 기업회원 가입 중복 / 외부 검증 ─────────────────────────────────────────────

    @Test
    void registerCompany_businessNumber_중복_BUSINESS_NUMBER_ALREADY_EXISTS() throws Exception {
        MemberVerification emailVerif = createVerification(VerificationChannel.EMAIL, "hr@company.com");
        MemberVerification phoneVerif = createVerification(VerificationChannel.PHONE, "01099998888");
        setField(phoneVerif, "verificationToken", "ptoken");
        when(verificationRepository.findByVerificationToken("etoken")).thenReturn(Optional.of(emailVerif));
        when(verificationRepository.findByVerificationToken("ptoken")).thenReturn(Optional.of(phoneVerif));
        when(memberRepository.existsByLoginId(anyString())).thenReturn(false);
        when(memberRepository.existsByEmail(anyString())).thenReturn(false);
        when(memberRepository.existsByPhone(anyString())).thenReturn(false);
        when(companyProfileRepository.existsByBusinessNumber(anyString())).thenReturn(true); // 중복

        assertThatThrownBy(() -> service.registerCompany(buildCompanyRequest()))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.BUSINESS_NUMBER_ALREADY_EXISTS));

        verify(memberRepository, never()).save(any());
    }

    @Test
    void registerCompany_사업자등록_검증_실패_COMPANY_BUSINESS_VERIFICATION_FAILED() throws Exception {
        MemberVerification emailVerif = createVerification(VerificationChannel.EMAIL, "hr@company.com");
        MemberVerification phoneVerif = createVerification(VerificationChannel.PHONE, "01099998888");
        setField(phoneVerif, "verificationToken", "ptoken");
        when(verificationRepository.findByVerificationToken("etoken")).thenReturn(Optional.of(emailVerif));
        when(verificationRepository.findByVerificationToken("ptoken")).thenReturn(Optional.of(phoneVerif));
        when(memberRepository.existsByLoginId(anyString())).thenReturn(false);
        when(memberRepository.existsByEmail(anyString())).thenReturn(false);
        when(memberRepository.existsByPhone(anyString())).thenReturn(false);
        when(companyProfileRepository.existsByBusinessNumber(anyString())).thenReturn(false);
        when(businessVerificationPort.verify(anyString())).thenReturn(false); // 검증 실패

        assertThatThrownBy(() -> service.registerCompany(buildCompanyRequest()))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.COMPANY_BUSINESS_VERIFICATION_FAILED));
    }

    @Test
    void registerCompany_사업자등록_API_장애_COMPANY_BUSINESS_VERIFICATION_UNAVAILABLE() throws Exception {
        MemberVerification emailVerif = createVerification(VerificationChannel.EMAIL, "hr@company.com");
        MemberVerification phoneVerif = createVerification(VerificationChannel.PHONE, "01099998888");
        setField(phoneVerif, "verificationToken", "ptoken");
        when(verificationRepository.findByVerificationToken("etoken")).thenReturn(Optional.of(emailVerif));
        when(verificationRepository.findByVerificationToken("ptoken")).thenReturn(Optional.of(phoneVerif));
        when(memberRepository.existsByLoginId(anyString())).thenReturn(false);
        when(memberRepository.existsByEmail(anyString())).thenReturn(false);
        when(memberRepository.existsByPhone(anyString())).thenReturn(false);
        when(companyProfileRepository.existsByBusinessNumber(anyString())).thenReturn(false);
        when(businessVerificationPort.verify(anyString()))
                .thenThrow(new CustomException(UserAuthErrorCode.COMPANY_BUSINESS_VERIFICATION_UNAVAILABLE));

        assertThatThrownBy(() -> service.registerCompany(buildCompanyRequest()))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.COMPANY_BUSINESS_VERIFICATION_UNAVAILABLE));
    }

    // ─── 개인회원 필수 약관 미동의 ───────────────────────────────────────────────────

    @Test
    void registerUser_service_약관_미동의_REGISTER_TERMS_REQUIRED() throws Exception {
        UserRegisterDto.RequestPersonalRegister req = buildPersonalRequest();
        setField(req.getTerms(), "service", false);

        assertThatThrownBy(() -> service.registerUser(req))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.REGISTER_TERMS_REQUIRED));

        verifyNoInteractions(verificationRepository);
    }

    @Test
    void registerUser_privacy_약관_미동의_REGISTER_TERMS_REQUIRED() throws Exception {
        UserRegisterDto.RequestPersonalRegister req = buildPersonalRequest();
        setField(req.getTerms(), "privacy", false);

        assertThatThrownBy(() -> service.registerUser(req))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.REGISTER_TERMS_REQUIRED));
    }

    @Test
    void registerUser_약관_null_REGISTER_TERMS_REQUIRED() throws Exception {
        UserRegisterDto.RequestPersonalRegister req = buildPersonalRequest();
        setField(req, "terms", null);

        assertThatThrownBy(() -> service.registerUser(req))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.REGISTER_TERMS_REQUIRED));
    }

    // ─── 개인회원 가입 시 companyVerification/sms null 저장 ───────────────────────────

    @Test
    void registerUser_companyVerification_sms_null_저장() throws Exception {
        MemberVerification emailVerif = createVerification(VerificationChannel.EMAIL, "test@example.com");
        MemberVerification phoneVerif = createVerification(VerificationChannel.PHONE, "01012345678");
        when(verificationRepository.findByVerificationToken("etoken")).thenReturn(Optional.of(emailVerif));
        when(verificationRepository.findByVerificationToken("ptoken")).thenReturn(Optional.of(phoneVerif));
        when(memberRepository.existsByLoginId(anyString())).thenReturn(false);
        when(memberRepository.existsByEmail(anyString())).thenReturn(false);
        when(memberRepository.existsByPhone(anyString())).thenReturn(false);
        when(memberRepository.save(any())).thenAnswer(inv -> {
            Member m = inv.getArgument(0);
            setField(m, "memberId", UUID.randomUUID());
            return m;
        });

        service.registerUser(buildPersonalRequest());

        ArgumentCaptor<MemberTermsAgreement> captor = ArgumentCaptor.forClass(MemberTermsAgreement.class);
        verify(termsRepository).save(captor.capture());
        assertThat(captor.getValue().getCompanyVerificationAgreed()).isNull();
        assertThat(captor.getValue().getSmsAgreed()).isNull();
    }

    // ─── 기업회원 가입 성공 — token 미발급 ───────────────────────────────────────────

    @Test
    void registerCompany_성공_token_미발급() throws Exception {
        MemberVerification emailVerif = createVerification(VerificationChannel.EMAIL, "hr@company.com");
        MemberVerification phoneVerif = createVerification(VerificationChannel.PHONE, "01099998888");
        setField(phoneVerif, "verificationToken", "ptoken");
        when(verificationRepository.findByVerificationToken("etoken")).thenReturn(Optional.of(emailVerif));
        when(verificationRepository.findByVerificationToken("ptoken")).thenReturn(Optional.of(phoneVerif));
        when(memberRepository.existsByLoginId(anyString())).thenReturn(false);
        when(memberRepository.existsByEmail(anyString())).thenReturn(false);
        when(memberRepository.existsByPhone(anyString())).thenReturn(false);
        when(companyProfileRepository.existsByBusinessNumber(anyString())).thenReturn(false);
        when(businessVerificationPort.verify(anyString())).thenReturn(true);
        when(employmentCertificateFilePort.resolveUrl(anyString())).thenReturn("http://s3/cert.pdf");
        when(employmentCertificateFilePort.resolveFileName(anyString())).thenReturn("cert.pdf");
        when(memberRepository.save(any())).thenAnswer(inv -> {
            Member m = inv.getArgument(0);
            setField(m, "memberId", UUID.randomUUID());
            return m;
        });
        when(companyProfileRepository.save(any())).thenAnswer(inv -> {
            CompanyProfile cp = inv.getArgument(0);
            setField(cp, "companyProfileId", UUID.randomUUID());
            return cp;
        });

        UserRegisterDto.ResponseCompanyRegister resp = service.registerCompany(buildCompanyRequest());

        assertThat(resp).isNotNull();
        assertThat(resp.getRoleType()).isEqualTo("COMPANY");
        assertThat(resp.getMemberId()).isNotNull();
        assertThat(resp.getCompanyApprovalStatus()).isEqualTo("PENDING_REVIEW");
        verify(hrManagerRepository, times(1)).save(any());
        verify(termsRepository, times(1)).save(any());
    }

    // ─── 기업회원 필수 약관 미동의 ───────────────────────────────────────────────────

    @Test
    void registerCompany_companyVerification_미동의_REGISTER_TERMS_REQUIRED() throws Exception {
        UserRegisterDto.RequestCompanyRegister req = buildCompanyRequest();
        setField(req.getTerms(), "companyVerification", false);

        assertThatThrownBy(() -> service.registerCompany(req))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.REGISTER_TERMS_REQUIRED));

        verifyNoInteractions(verificationRepository);
    }

    @Test
    void registerCompany_sms_미동의_REGISTER_TERMS_REQUIRED() throws Exception {
        UserRegisterDto.RequestCompanyRegister req = buildCompanyRequest();
        setField(req.getTerms(), "sms", false);

        assertThatThrownBy(() -> service.registerCompany(req))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.REGISTER_TERMS_REQUIRED));
    }

    // ─── 기업회원 약관 저장값 검증 ───────────────────────────────────────────────────

    @Test
    void registerCompany_약관_저장_검증() throws Exception {
        MemberVerification emailVerif = createVerification(VerificationChannel.EMAIL, "hr@company.com");
        MemberVerification phoneVerif = createVerification(VerificationChannel.PHONE, "01099998888");
        setField(phoneVerif, "verificationToken", "ptoken");
        when(verificationRepository.findByVerificationToken("etoken")).thenReturn(Optional.of(emailVerif));
        when(verificationRepository.findByVerificationToken("ptoken")).thenReturn(Optional.of(phoneVerif));
        when(memberRepository.existsByLoginId(anyString())).thenReturn(false);
        when(memberRepository.existsByEmail(anyString())).thenReturn(false);
        when(memberRepository.existsByPhone(anyString())).thenReturn(false);
        when(companyProfileRepository.existsByBusinessNumber(anyString())).thenReturn(false);
        when(businessVerificationPort.verify(anyString())).thenReturn(true);
        when(employmentCertificateFilePort.resolveUrl(anyString())).thenReturn("http://s3/cert.pdf");
        when(employmentCertificateFilePort.resolveFileName(anyString())).thenReturn("cert.pdf");
        when(memberRepository.save(any())).thenAnswer(inv -> {
            Member m = inv.getArgument(0);
            setField(m, "memberId", UUID.randomUUID());
            return m;
        });
        when(companyProfileRepository.save(any())).thenAnswer(inv -> {
            CompanyProfile cp = inv.getArgument(0);
            setField(cp, "companyProfileId", UUID.randomUUID());
            return cp;
        });

        service.registerCompany(buildCompanyRequest());

        ArgumentCaptor<MemberTermsAgreement> captor = ArgumentCaptor.forClass(MemberTermsAgreement.class);
        verify(termsRepository).save(captor.capture());
        MemberTermsAgreement saved = captor.getValue();
        assertThat(saved.isServiceAgreed()).isTrue();
        assertThat(saved.isPrivacyAgreed()).isTrue();
        assertThat(saved.getCompanyVerificationAgreed()).isTrue();
        assertThat(saved.getSmsAgreed()).isTrue();
        assertThat(saved.isMarketingAgreed()).isFalse();
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

    private UserRegisterDto.RequestCompanyRegister buildCompanyRequest() throws Exception {
        UserRegisterDto.RequestCompanyRegister req = new UserRegisterDto.RequestCompanyRegister();
        setField(req, "loginId", "companyuser01");
        setField(req, "password", "CompanyPass1!");
        setField(req, "managerName", "홍담당");
        setField(req, "managerEmail", "hr@company.com");
        setField(req, "managerPhone", "01099998888");
        setField(req, "managerEmailVerificationToken", "etoken");
        setField(req, "managerPhoneVerificationToken", "ptoken");
        setField(req, "companyName", "테스트회사");
        setField(req, "businessNumber", "1234567890");
        setField(req, "ceoName", "김대표");
        setField(req, "companyType", CompanyType.SME);
        setField(req, "postalCode", "12345");
        setField(req, "roadAddress", "서울시 강남구 테헤란로 1");
        setField(req, "jibunAddress", "서울시 강남구 역삼동 1");
        setField(req, "addressDetail", "101호");
        setField(req, "isAgency", false);
        setField(req, "certificateNumber", "CERT-001");
        setField(req, "employmentCertificateFileId", "fileid-001");
        UserRegisterDto.CompanyTerms terms = new UserRegisterDto.CompanyTerms();
        setField(terms, "service", true);
        setField(terms, "privacy", true);
        setField(terms, "marketing", false);
        setField(terms, "companyVerification", true);
        setField(terms, "sms", true);
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
