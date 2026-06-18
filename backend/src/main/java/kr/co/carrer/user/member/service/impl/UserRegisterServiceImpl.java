package kr.co.carrer.user.member.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.member.dto.UserRegisterDto;
import kr.co.carrer.user.member.entity.*;
import kr.co.carrer.user.member.exception.UserAuthErrorCode;
import kr.co.carrer.user.member.repository.*;
import kr.co.carrer.user.member.service.BusinessRegistrationVerificationPort;
import kr.co.carrer.user.member.service.EmploymentCertificateFilePort;
import kr.co.carrer.user.member.service.UserRegisterService;
import kr.co.carrer.user.member.type.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    // ── loginId 중복 확인 ──────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public UserRegisterDto.ResponseCheckLoginId checkLoginId(String loginId) {
        boolean available = !memberRepository.existsByLoginId(loginId);
        return new UserRegisterDto.ResponseCheckLoginId(available);
    }

    // ── 개인회원 가입 ──────────────────────────────────────────────────────────

    @Override
    @Transactional
    public UserRegisterDto.ResponsePersonalRegister registerUser(UserRegisterDto.RequestPersonalRegister request) {
        // 이메일 인증 검증 — purpose=REGISTER
        var emailVerification = verificationRepository.findByVerificationToken(request.getEmailVerificationToken())
                .orElseThrow(() -> new CustomException(UserAuthErrorCode.VERIFICATION_TOKEN_INVALID));
        UserVerificationServiceImpl.validateVerificationToken(
                emailVerification, VerificationChannel.EMAIL, request.getEmail(), VerificationPurpose.REGISTER);

        // 휴대폰 인증 검증 — purpose=REGISTER
        var phoneVerification = verificationRepository.findByVerificationToken(request.getPhoneVerificationToken())
                .orElseThrow(() -> new CustomException(UserAuthErrorCode.VERIFICATION_TOKEN_INVALID));
        UserVerificationServiceImpl.validateVerificationToken(
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

        return UserRegisterDto.ResponsePersonalRegister.of(member.getMemberId());
    }

    // ── 기업회원 가입 ──────────────────────────────────────────────────────────

    @Override
    @Transactional
    public UserRegisterDto.ResponseCompanyRegister registerCompany(UserRegisterDto.RequestCompanyRegister request) {
        // 담당자 이메일 인증 검증
        var emailVerification = verificationRepository.findByVerificationToken(request.getManagerEmailVerificationToken())
                .orElseThrow(() -> new CustomException(UserAuthErrorCode.VERIFICATION_TOKEN_INVALID));
        UserVerificationServiceImpl.validateVerificationToken(
                emailVerification, VerificationChannel.EMAIL, request.getManagerEmail(), VerificationPurpose.REGISTER);

        // 담당자 휴대폰 인증 검증
        var phoneVerification = verificationRepository.findByVerificationToken(request.getManagerPhoneVerificationToken())
                .orElseThrow(() -> new CustomException(UserAuthErrorCode.VERIFICATION_TOKEN_INVALID));
        UserVerificationServiceImpl.validateVerificationToken(
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

        // Member 생성 (담당자명=name, 담당자 이메일=email, 담당자 휴대폰=phone)
        Member member = Member.createCompany(
                request.getLoginId(),
                passwordEncoder.encode(request.getPassword()),
                request.getManagerName(),
                request.getManagerEmail(),
                request.getManagerPhone());
        memberRepository.save(member);

        // 재직증명서 fileId 검증 — Port를 통해 형식 검증 (Phase 5에서 S3 실제 검증으로 교체)
        String fileId = request.getEmploymentCertificateFileId();
        employmentCertificateFilePort.validate(fileId);

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

        // 기업회원 가입 응답 — access/refresh token 미발급 (spec FR-019, FR-020)
        return new UserRegisterDto.ResponseCompanyRegister(
                member.getMemberId(),
                companyProfile.getCompanyProfileId(),
                MemberStatus.ACTIVE,
                "PENDING_REVIEW");
    }

}
