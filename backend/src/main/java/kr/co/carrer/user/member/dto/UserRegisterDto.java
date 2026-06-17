package kr.co.carrer.user.member.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import kr.co.carrer.user.member.type.CompanyType;
import kr.co.carrer.user.member.type.MemberStatus;
import kr.co.carrer.user.member.validation.ValidPassword;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

public class UserRegisterDto {

    // ───────────────────────────── loginId 중복 확인 ─────────────────────────────

    public record ResponseCheckLoginId(boolean available) {}

    // ───────────────────────────── 약관 Inner Class ─────────────────────────────

    @Getter
    public static class PersonalTerms {
        // age 동의는 프론트 UX 전용 — 백엔드 API에 포함하지 않음 (spec FR-016)
        @AssertTrue(message = "서비스 이용약관 동의는 필수입니다.")
        private boolean service;

        @AssertTrue(message = "개인정보 처리방침 동의는 필수입니다.")
        private boolean privacy;

        private boolean marketing;
    }

    @Getter
    public static class CompanyTerms {
        @AssertTrue(message = "서비스 이용약관 동의는 필수입니다.")
        private boolean service;

        @AssertTrue(message = "개인정보 처리방침 동의는 필수입니다.")
        private boolean privacy;

        @AssertTrue(message = "기업 인증 정보 제공 동의는 필수입니다.")
        private boolean companyVerification;

        @AssertTrue(message = "SMS 수신 동의는 필수입니다.")
        private boolean sms;

        private boolean marketing;
    }

    // ───────────────────────────── 개인회원 가입 ─────────────────────────────

    @Getter
    public static class RequestPersonalRegister {
        @NotBlank
        @Pattern(regexp = "^[A-Za-z0-9]{6,20}$",
                message = "아이디는 영문/숫자 조합 6~20자로 입력해 주세요.")
        private String loginId;

        @NotBlank
        @ValidPassword
        private String password;

        @NotBlank
        private String name;

        @NotBlank
        @Email(message = "이메일 형식이 올바르지 않습니다.")
        private String email;

        @NotBlank
        @Pattern(regexp = "^010[0-9]{8}$",
                message = "휴대폰 번호는 010으로 시작하는 11자리 숫자로 입력해 주세요.")
        private String phone;

        @NotBlank
        private String emailVerificationToken;

        @NotBlank
        private String phoneVerificationToken;

        @NotNull
        @Valid
        private PersonalTerms terms;
    }

    public record ResponsePersonalRegister(
            UUID memberId,
            String roleType,
            MemberStatus memberStatus
    ) {
        public static ResponsePersonalRegister of(UUID memberId) {
            return new ResponsePersonalRegister(memberId, "USER", MemberStatus.ACTIVE);
        }
    }

    // ───────────────────────────── 기업회원 가입 ─────────────────────────────

    @Getter
    public static class RequestCompanyRegister {
        @NotBlank
        @Pattern(regexp = "^[A-Za-z0-9]{6,20}$",
                message = "아이디는 영문/숫자 조합 6~20자로 입력해 주세요.")
        private String loginId;

        @NotBlank
        @ValidPassword
        private String password;

        @NotBlank
        private String managerName;

        @NotBlank
        @Email(message = "이메일 형식이 올바르지 않습니다.")
        private String managerEmail;

        @NotBlank
        @Pattern(regexp = "^010[0-9]{8}$",
                message = "휴대폰 번호는 010으로 시작하는 11자리 숫자로 입력해 주세요.")
        private String managerPhone;

        @NotBlank
        private String companyName;

        @NotBlank
        @Pattern(regexp = "^[0-9]{10}$",
                message = "사업자등록번호는 숫자 10자리로 입력해 주세요.")
        private String businessNumber;

        @NotBlank
        private String ceoName;

        @NotBlank
        private String certificateNumber;

        // 주소 — postalCode·roadAddress 필수, jibunAddress·addressDetail 선택 (spec §8)
        @NotBlank(message = "우편번호는 필수입니다.")
        private String postalCode;

        @NotBlank(message = "도로명주소는 필수입니다.")
        private String roadAddress;

        private String jibunAddress;

        private String addressDetail;

        @NotNull
        private CompanyType companyType;

        private boolean isAgency;

        @NotBlank
        private String managerPhoneVerificationToken;

        @NotBlank
        private String managerEmailVerificationToken;

        @NotBlank
        private String employmentCertificateFileId;

        @NotNull
        @Valid
        private CompanyTerms terms;
    }

    @Getter
    public static class ResponseCompanyRegister {
        private final UUID memberId;
        private final UUID companyProfileId;
        private final String roleType;
        private final MemberStatus memberStatus;
        private final String companyApprovalStatus;

        public ResponseCompanyRegister(UUID memberId, UUID companyProfileId,
                                       MemberStatus memberStatus, String companyApprovalStatus) {
            this.memberId = memberId;
            this.companyProfileId = companyProfileId;
            this.roleType = "COMPANY";
            this.memberStatus = memberStatus;
            this.companyApprovalStatus = companyApprovalStatus;
        }
    }

    // ───────────────────────────── 재직증명서 업로드 ─────────────────────────────

    public record ResponseEmploymentCertificateUpload(
            String fileId,
            String originalName,
            String mimeType,
            long size,
            Instant uploadedAt
    ) {}
}
