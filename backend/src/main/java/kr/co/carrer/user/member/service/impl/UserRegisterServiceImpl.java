package kr.co.carrer.user.member.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.service.EntitlementInitService;
import kr.co.carrer.user.member.dto.UserRegisterDto;
import kr.co.carrer.user.member.entity.*;
import kr.co.carrer.user.member.exception.UserAuthErrorCode;
import kr.co.carrer.user.member.repository.*;
import kr.co.carrer.user.member.service.BusinessRegistrationVerificationPort;
import kr.co.carrer.user.member.service.EmploymentCertificateFilePort;
import kr.co.carrer.user.member.service.TermsAgreementEvidenceRecorder;
import kr.co.carrer.user.member.service.UserRegisterService;
import kr.co.carrer.user.member.service.VerificationTokenValidator;
import kr.co.carrer.user.member.type.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserRegisterServiceImpl implements UserRegisterService {

    private final UserMemberRepository memberRepository;
    private final UserMemberPersonalProfileRepository personalProfileRepository;
    private final CompanyProfileRepository companyProfileRepository;
    private final UserHrManagerRepository hrManagerRepository;
    private final MemberTermsAgreementRepository termsRepository;
    private final MemberVerificationRepository verificationRepository;
    private final PasswordEncoder passwordEncoder;
    private final BusinessRegistrationVerificationPort businessVerificationPort;
    private final EmploymentCertificateFilePort employmentCertificateFilePort;
    private final EntitlementInitService entitlementInitService;
    private final TermsAgreementEvidenceRecorder termsAgreementEvidenceRecorder;

    // ── loginId 중복 확인 ──────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public UserRegisterDto.ResponseCheckLoginId checkLoginId(String loginId) {
        if (loginId == null || loginId.isBlank() || !loginId.matches("^[A-Za-z0-9]{6,20}$")) {
            throw new CustomException(UserAuthErrorCode.LOGIN_ID_INVALID);
        }
        boolean available = !memberRepository.existsByLoginId(loginId);
        return new UserRegisterDto.ResponseCheckLoginId(available);
    }

    // ── 개인회원 가입 ──────────────────────────────────────────────────────────

    @Override
    @Transactional
    public UserRegisterDto.ResponsePersonalRegister registerUser(UserRegisterDto.RequestPersonalRegister request) {
        // 필수 약관 검증 — DTO @AssertTrue는 Controller Bean Validation 의존; Service 직접 호출 시 재검증
        if (request.getTerms() == null
                || !request.getTerms().isService()
                || !request.getTerms().isPrivacy()) {
            throw new CustomException(UserAuthErrorCode.REGISTER_TERMS_REQUIRED);
        }

        // 이메일 인증 검증 — purpose=REGISTER
        var emailVerification = verificationRepository.findByVerificationToken(request.getEmailVerificationToken())
                .orElseThrow(() -> new CustomException(UserAuthErrorCode.VERIFICATION_TOKEN_INVALID));
        VerificationTokenValidator.validate(
                emailVerification, VerificationChannel.EMAIL, request.getEmail(), VerificationPurpose.REGISTER);

        // 휴대폰 인증 검증 — purpose=REGISTER
        var phoneVerification = verificationRepository.findByVerificationToken(request.getPhoneVerificationToken())
                .orElseThrow(() -> new CustomException(UserAuthErrorCode.VERIFICATION_TOKEN_INVALID));
        VerificationTokenValidator.validate(
                phoneVerification, VerificationChannel.PHONE, request.getPhone(), VerificationPurpose.REGISTER);

        // loginId 포함 금지 검증
        if (request.getPassword().contains(request.getLoginId())) {
            throw new CustomException(UserAuthErrorCode.PASSWORD_POLICY_VIOLATION);
        }

        // 중복 검증 (최종 가입 시점 재검증)
        if (memberRepository.existsByLoginId(request.getLoginId()))
            throw new CustomException(UserAuthErrorCode.LOGIN_ID_ALREADY_EXISTS);
        if (memberRepository.existsByEmail(request.getEmail()))
            throw new CustomException(UserAuthErrorCode.EMAIL_ALREADY_EXISTS);
        if (memberRepository.existsByPhone(request.getPhone()))
            throw new CustomException(UserAuthErrorCode.PHONE_ALREADY_EXISTS);

        emailVerification.markConsumed();
        phoneVerification.markConsumed();

        // Member 생성
        Member member = Member.createUser(
                request.getLoginId(),
                passwordEncoder.encode(request.getPassword()),
                request.getName(),
                request.getEmail(),
                request.getPhone());
        memberRepository.save(member);

        // 빈 personal_profiles row 생성 (spec FR-024)
        personalProfileRepository.save(PersonalProfile.emptyFor(member.getMemberId()));

        // 약관 저장 — 기업 전용 컬럼은 null (spec §8)
        termsRepository.save(MemberTermsAgreement.forUser(
                member.getMemberId(),
                request.getTerms().isService(),
                request.getTerms().isPrivacy(),
                request.getTerms().isMarketing()));
        termsAgreementEvidenceRecorder.recordPersonalSignup(
                member.getMemberId(),
                request.getTerms().isService(),
                request.getTerms().isPrivacy(),
                request.getTerms().isMarketing());

        // 상품별 FREE 이용권 생성 (document-coaching, interview)
        entitlementInitService.initFreeEntitlements(member.getMemberId());

        return UserRegisterDto.ResponsePersonalRegister.of(member.getMemberId());
    }

    // ── 기업회원 가입 ──────────────────────────────────────────────────────────

    @Override
    @Transactional
    public UserRegisterDto.ResponseCompanyRegister registerCompany(UserRegisterDto.RequestCompanyRegister request) {
        // 필수 약관 검증 — 기업회원은 service/privacy/companyVerification/sms 모두 필수
        if (request.getTerms() == null
                || !request.getTerms().isService() || !request.getTerms().isPrivacy()
                || !request.getTerms().isCompanyVerification() || !request.getTerms().isSms()) {
            throw new CustomException(UserAuthErrorCode.REGISTER_TERMS_REQUIRED);
        }

        // 담당자 이메일 인증 검증
        var emailVerification = verificationRepository.findByVerificationToken(request.getManagerEmailVerificationToken())
                .orElseThrow(() -> new CustomException(UserAuthErrorCode.VERIFICATION_TOKEN_INVALID));
        VerificationTokenValidator.validate(
                emailVerification, VerificationChannel.EMAIL, request.getManagerEmail(), VerificationPurpose.REGISTER);

        // 담당자 휴대폰 인증 검증
        var phoneVerification = verificationRepository.findByVerificationToken(request.getManagerPhoneVerificationToken())
                .orElseThrow(() -> new CustomException(UserAuthErrorCode.VERIFICATION_TOKEN_INVALID));
        VerificationTokenValidator.validate(
                phoneVerification, VerificationChannel.PHONE, request.getManagerPhone(), VerificationPurpose.REGISTER);

        // loginId 포함 금지 검증
        if (request.getPassword().contains(request.getLoginId())) {
            throw new CustomException(UserAuthErrorCode.PASSWORD_POLICY_VIOLATION);
        }

        // 중복 검증
        if (memberRepository.existsByLoginId(request.getLoginId()))
            throw new CustomException(UserAuthErrorCode.LOGIN_ID_ALREADY_EXISTS);
        if (memberRepository.existsByEmail(request.getManagerEmail()))
            throw new CustomException(UserAuthErrorCode.EMAIL_ALREADY_EXISTS);
        if (memberRepository.existsByPhone(request.getManagerPhone()))
            throw new CustomException(UserAuthErrorCode.PHONE_ALREADY_EXISTS);
        if (companyProfileRepository.existsByBusinessNumber(request.getBusinessNumber()))
            throw new CustomException(UserAuthErrorCode.BUSINESS_NUMBER_ALREADY_EXISTS);

        // 국세청 사업자 검증 (spec §8.1) — 장애 시 503
        boolean valid = businessVerificationPort.verify(request.getBusinessNumber());
        if (!valid) throw new CustomException(UserAuthErrorCode.COMPANY_BUSINESS_VERIFICATION_FAILED);

        // 재직증명서 fileId 검증 — 엔티티 생성 전 검증 (실패 시 memberRepository.save() 미호출 보장)
        String fileId = request.getEmploymentCertificateFileId();
        employmentCertificateFilePort.validate(fileId);

        emailVerification.markConsumed();
        phoneVerification.markConsumed();

        // Member 생성 (담당자명=name, 담당자 이메일=email, 담당자 휴대폰=phone)
        Member member = Member.createCompany(
                request.getLoginId(),
                passwordEncoder.encode(request.getPassword()),
                request.getManagerName(),
                request.getManagerEmail(),
                request.getManagerPhone());
        memberRepository.save(member);

        // CompanyProfile 생성 — address = roadAddress (spec §8)
        CompanyProfile companyProfile = CompanyProfile.create(
                member.getMemberId(),
                request.getCompanyType(),
                request.getCompanyName(),
                request.getBusinessNumber(),
                request.getCeoName(),
                request.getPostalCode(),
                request.getRoadAddress(),
                request.getJibunAddress(),
                request.getAddressDetail(),
                request.isAgency(),
                request.getCertificateNumber(),
                employmentCertificateFilePort.resolveUrl(fileId),
                employmentCertificateFilePort.resolveFileName(fileId));
        companyProfileRepository.save(companyProfile);

        // hr_managers 신청 레코드 생성 — PENDING_REVIEW (spec §11)
        hrManagerRepository.save(
                UserHrManager.pendingFor(member.getMemberId(), companyProfile.getCompanyProfileId()));

        // 약관 저장 (spec §8)
        termsRepository.save(MemberTermsAgreement.forCompany(
                member.getMemberId(),
                request.getTerms().isService(),
                request.getTerms().isPrivacy(),
                request.getTerms().isMarketing(),
                request.getTerms().isCompanyVerification(),
                request.getTerms().isSms()));
        termsAgreementEvidenceRecorder.recordCompanySignup(
                member.getMemberId(),
                request.getTerms().isService(),
                request.getTerms().isPrivacy(),
                request.getTerms().isMarketing(),
                request.getTerms().isCompanyVerification(),
                request.getTerms().isSms());

        // 기업회원 가입 응답 — access/refresh token 미발급 (spec FR-019, FR-020)
        // 재직증명서 재사용 방지: company_profiles.cert_file_url UNIQUE 제약으로 DB 레벨에서 보장
        return new UserRegisterDto.ResponseCompanyRegister(
                member.getMemberId(),
                companyProfile.getCompanyProfileId(),
                MemberStatus.ACTIVE,
                "PENDING_REVIEW");
    }

    // ── 재직증명서 업로드 ──────────────────────────────────────────────────────

    @Override
    public UserRegisterDto.ResponseEmploymentCertificateUpload uploadEmploymentCertificate(MultipartFile file) {
        return employmentCertificateFilePort.upload(file);
    }

    // ── 사업자 번호 사전 확인 ──────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public UserRegisterDto.ResponseCheckBusinessNumber checkBusinessNumber(String businessNumber) {
        return businessVerificationPort.check(businessNumber);
    }

}
