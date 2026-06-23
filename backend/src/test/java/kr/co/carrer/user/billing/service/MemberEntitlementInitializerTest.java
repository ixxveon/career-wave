package kr.co.carrer.user.billing.service;

import kr.co.carrer.user.billing.entity.MemberProductEntitlement;
import kr.co.carrer.user.billing.repository.MemberProductEntitlementRepository;
import kr.co.carrer.user.billing.service.impl.EntitlementInitServiceImpl;
import kr.co.carrer.user.billing.type.PlanType;
import kr.co.carrer.user.member.dto.UserRegisterDto;
import kr.co.carrer.user.member.entity.Member;
import kr.co.carrer.user.member.entity.MemberVerification;
import kr.co.carrer.user.member.repository.*;
import kr.co.carrer.user.member.service.BusinessRegistrationVerificationPort;
import kr.co.carrer.user.member.service.EmploymentCertificateFilePort;
import kr.co.carrer.user.member.service.impl.UserRegisterServiceImpl;
import kr.co.carrer.user.member.entity.CompanyProfile;
import kr.co.carrer.user.member.type.CompanyType;
import kr.co.carrer.user.member.type.VerificationChannel;
import kr.co.carrer.user.member.type.VerificationPurpose;
import kr.co.carrer.user.member.type.VerificationStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.lang.reflect.Field;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MemberEntitlementInitializerTest {

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
    private UserRegisterServiceImpl registerService;

    @BeforeEach
    void setUp() {
        registerService = new UserRegisterServiceImpl(
                memberRepository, personalProfileRepository, companyProfileRepository,
                hrManagerRepository, termsRepository, verificationRepository,
                encoder, businessVerificationPort, employmentCertificateFilePort,
                entitlementInitService);
    }

    @Nested
    @DisplayName("USER 가입 — initFreeEntitlements 호출")
    class UserRegistration {

        @Test
        @DisplayName("일반 회원 가입 후 initFreeEntitlements(memberId) 1회 호출")
        void registerUser_callsInitWithMemberId() throws Exception {
            UUID memberId = UUID.randomUUID();
            MemberVerification emailVerif = createVerification(VerificationChannel.EMAIL, "test@example.com");
            MemberVerification phoneVerif = createVerification(VerificationChannel.PHONE, "01012345678");
            when(verificationRepository.findByVerificationToken("etoken")).thenReturn(Optional.of(emailVerif));
            when(verificationRepository.findByVerificationToken("ptoken")).thenReturn(Optional.of(phoneVerif));
            when(memberRepository.existsByLoginId(anyString())).thenReturn(false);
            when(memberRepository.existsByEmail(anyString())).thenReturn(false);
            when(memberRepository.existsByPhone(anyString())).thenReturn(false);
            when(memberRepository.save(any())).thenAnswer(inv -> {
                Member m = inv.getArgument(0);
                setField(m, "memberId", memberId);
                return m;
            });
            when(termsRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            registerService.registerUser(buildPersonalRequest());

            ArgumentCaptor<UUID> captor = ArgumentCaptor.forClass(UUID.class);
            verify(entitlementInitService, times(1)).initFreeEntitlements(captor.capture());
            assertThat(captor.getValue()).isEqualTo(memberId);
        }
    }

    @Nested
    @DisplayName("COMPANY 가입 — initFreeEntitlements 미호출")
    class CompanyRegistration {

        @Test
        @DisplayName("기업 회원 가입 후 initFreeEntitlements 호출 없음")
        void registerCompany_doesNotCallInit() throws Exception {
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
            when(employmentCertificateFilePort.resolveUrl(anyString())).thenReturn("https://s3/cert.pdf");
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
            when(hrManagerRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(termsRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            registerService.registerCompany(buildCompanyRequest());

            verify(entitlementInitService, never()).initFreeEntitlements(any());
        }
    }

    @Nested
    @DisplayName("EntitlementInitService 멱등성")
    class Idempotency {

        @Test
        @DisplayName("두 번 호출 시 두 번째는 save 없이 완료")
        void initFreeEntitlements_calledTwice_secondIsNoOp() {
            MemberProductEntitlementRepository repo = mock(MemberProductEntitlementRepository.class);
            EntitlementInitServiceImpl initService = new EntitlementInitServiceImpl(repo);
            UUID memberId = UUID.randomUUID();

            when(repo.findByMemberIdAndProductCodeForUpdate(eq(memberId), any())).thenReturn(Optional.empty());
            when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));
            initService.initFreeEntitlements(memberId);

            MemberProductEntitlement doc = MemberProductEntitlement.createFree(memberId, "document-coaching");
            MemberProductEntitlement itv = MemberProductEntitlement.createFree(memberId, "interview");
            when(repo.findByMemberIdAndProductCodeForUpdate(memberId, "document-coaching")).thenReturn(Optional.of(doc));
            when(repo.findByMemberIdAndProductCodeForUpdate(memberId, "interview")).thenReturn(Optional.of(itv));

            initService.initFreeEntitlements(memberId);

            // 첫 번째에만 2회 save, 두 번째는 0회
            verify(repo, times(2)).save(any());
        }

        @Test
        @DisplayName("생성된 이용권 기본값 — FREE, AVAILABLE, freeRemaining=1")
        void initFreeEntitlements_defaults() {
            MemberProductEntitlementRepository repo = mock(MemberProductEntitlementRepository.class);
            EntitlementInitServiceImpl initService = new EntitlementInitServiceImpl(repo);
            UUID memberId = UUID.randomUUID();

            when(repo.findByMemberIdAndProductCodeForUpdate(eq(memberId), any())).thenReturn(Optional.empty());
            when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

            initService.initFreeEntitlements(memberId);

            ArgumentCaptor<MemberProductEntitlement> captor = ArgumentCaptor.forClass(MemberProductEntitlement.class);
            verify(repo, times(2)).save(captor.capture());

            List<MemberProductEntitlement> saved = captor.getAllValues();
            assertThat(saved).extracting(MemberProductEntitlement::getPlanType).containsOnly(PlanType.FREE);
            assertThat(saved).extracting(MemberProductEntitlement::getFreeRemaining).containsOnly(1);
            assertThat(saved).extracting(MemberProductEntitlement::getProductCode)
                    .containsExactlyInAnyOrder("document-coaching", "interview");
        }
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

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
        setField(v, "verificationToken", channel == VerificationChannel.EMAIL ? "etoken" : "ptoken");
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
