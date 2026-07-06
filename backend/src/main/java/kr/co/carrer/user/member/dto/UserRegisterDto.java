package kr.co.carrer.user.member.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import kr.co.carrer.user.member.type.CompanyType;
import kr.co.carrer.user.member.type.MemberStatus;
import kr.co.carrer.user.member.validation.NormalizedPattern;
import kr.co.carrer.user.member.validation.ValidPassword;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

public class UserRegisterDto {

    // ───────────────────────────── loginId 중복 확인 ─────────────────────────────

    public record ResponseCheckLoginId(boolean available) {}

    // ───────────────────────────── 사업자 번호 사전 확인 ────────────────────────────

    @Getter
    public static class RequestCheckBusinessNumber {
        @NotBlank(message = "사업자등록번호를 입력해 주세요.")
        @Pattern(regexp = "^\\d{10}$", message = "사업자등록번호는 10자리 숫자입니다.")
        @Schema(description = "사업자등록번호 (10자리 숫자)", example = "1234567890")
        private String businessNumber;
    }

    /**
     * businessStatus:
     * CONTINUING  — 계속사업자 (정상)
     * SUSPENDED   — 휴업자
     * CLOSED      — 폐업자
     * NOT_REGISTERED — 미등록 또는 조회 불가
     */
    public record ResponseCheckBusinessNumber(boolean valid, String businessStatus) {}

    // ───────────────────────────── 약관 Inner Class ─────────────────────────────

    @Getter
    public static class PersonalTerms {
        // age 동의는 프론트 UX 전용 — 백엔드 API에 포함하지 않음 (spec FR-016)
        @AssertTrue(message = "서비스 이용약관 동의는 필수입니다.")
        private boolean service;

        @AssertTrue(message = "개인정보 수집·이용 동의는 필수입니다.")
        private boolean privacy;

        private boolean marketing;
    }

    @Getter
    public static class CompanyTerms {
        @AssertTrue(message = "서비스 이용약관 동의는 필수입니다.")
        private boolean service;

        @AssertTrue(message = "개인정보 수집·이용 동의는 필수입니다.")
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
        @Schema(description = "로그인 아이디 (영문/숫자 6~20자)", example = "career_user01")
        @NotBlank
        @Pattern(regexp = "^[A-Za-z0-9]{6,20}$",
                message = "아이디는 영문/숫자 조합 6~20자로 입력해 주세요.")
        private String loginId;

        @Schema(description = "비밀번호 (8~64자, 영문/숫자/특수문자 포함, loginId 포함 금지)", example = "Password123!")
        @NotBlank
        @ValidPassword
        private String password;

        @Schema(description = "이름", example = "홍길동")
        @NotBlank
        @NormalizedPattern(regexp = "^[가-힣]{2,10}$", message = "이름은 2~10자 한글로 입력해 주세요.")
        private String name;

        @Schema(description = "이메일 주소", example = "user@example.com")
        @NotBlank
        @Email(message = "이메일 형식이 올바르지 않습니다.")
        private String email;

        @Schema(description = "휴대폰 번호 (010 시작 11자리 숫자)", example = "01012345678")
        @NotBlank
        @Pattern(regexp = "^010[0-9]{8}$",
                message = "휴대폰 번호는 010으로 시작하는 11자리 숫자로 입력해 주세요.")
        private String phone;

        @Schema(description = "/verifications/confirm 에서 발급된 이메일 인증 token")
        @NotBlank
        private String emailVerificationToken;

        @Schema(description = "/verifications/confirm 에서 발급된 휴대폰 인증 token")
        @NotBlank
        private String phoneVerificationToken;

        @NotNull
        @Valid
        private PersonalTerms terms;
    }

    public record ResponsePersonalRegister(
            @Schema(description = "생성된 회원 UUID") UUID memberId,
            @Schema(description = "회원 유형", example = "USER") String roleType,
            @Schema(description = "계정 상태", allowableValues = {"ACTIVE","SUSPENDED","BANNED","LOCKED","WITHDRAWN","BLACKLISTED"}) MemberStatus memberStatus
    ) {
        public static ResponsePersonalRegister of(UUID memberId) {
            return new ResponsePersonalRegister(memberId, "USER", MemberStatus.ACTIVE);
        }
    }

    // ───────────────────────────── 기업회원 가입 ─────────────────────────────

    @Getter
    public static class RequestCompanyRegister {
        @Schema(description = "로그인 아이디 (영문/숫자 6~20자)", example = "company_hr01")
        @NotBlank
        @Pattern(regexp = "^[A-Za-z0-9]{6,20}$",
                message = "아이디는 영문/숫자 조합 6~20자로 입력해 주세요.")
        private String loginId;

        @Schema(description = "비밀번호 (8~64자, 영문/숫자/특수문자 포함)", example = "Password123!")
        @NotBlank
        @ValidPassword
        private String password;

        @Schema(description = "HR 담당자 이름", example = "김담당")
        @NotBlank
        @NormalizedPattern(regexp = "^[가-힣]{2,10}$", message = "담당자명은 2~10자 한글로 입력해 주세요.")
        private String managerName;

        @Schema(description = "HR 담당자 이메일", example = "hr@example.com")
        @NotBlank
        @Email(message = "이메일 형식이 올바르지 않습니다.")
        private String managerEmail;

        @Schema(description = "HR 담당자 휴대폰 (010 시작 11자리)", example = "01098765432")
        @NotBlank
        @Pattern(regexp = "^010[0-9]{8}$",
                message = "휴대폰 번호는 010으로 시작하는 11자리 숫자로 입력해 주세요.")
        private String managerPhone;

        @Schema(description = "회사명", example = "커리어웨이브")
        @NotBlank
        private String companyName;

        @Schema(description = "사업자등록번호 (숫자 10자리)", example = "1234567890")
        @NotBlank
        @Pattern(regexp = "^[0-9]{10}$",
                message = "사업자등록번호는 숫자 10자리로 입력해 주세요.")
        private String businessNumber;

        @Schema(description = "대표자 이름", example = "이대표")
        @NotBlank
        @NormalizedPattern(regexp = "^[가-힣a-zA-Z ]{2,20}$",
                message = "대표자명은 2~20자의 한글 또는 영문으로 입력해 주세요.")
        private String ceoName;

        @Schema(description = "재직증명서 번호 (미사용 — 하위 호환용 선택 필드)", example = "202606150001")
        private String certificateNumber;

        @Schema(description = "우편번호 (주소 검색 결과)", example = "06134")
        @NotBlank(message = "우편번호는 필수입니다.")
        private String postalCode;

        @Schema(description = "도로명주소 (주소 검색 결과 필수)", example = "서울특별시 강남구 테헤란로 123")
        @NotBlank(message = "도로명주소는 필수입니다.")
        private String roadAddress;

        @Schema(description = "지번주소 (선택)", example = "서울특별시 강남구 역삼동 123-45")
        private String jibunAddress;

        @Schema(description = "상세주소 (선택)", example = "10층")
        private String addressDetail;

        @Schema(description = "기업 형태", allowableValues = {"ENTERPRISE","SUBSIDIARY","SME","MID_MARKET","VENTURE","FOREIGN_INVESTED","FOREIGN_CORPORATION","PUBLIC","NON_PROFIT","FOREIGN_NON_PROFIT"})
        @NotNull
        private CompanyType companyType;

        @Schema(description = "헤드헌팅 에이전시 여부", example = "false")
        private boolean isAgency;

        @Schema(description = "담당자 휴대폰 인증 token")
        @NotBlank
        private String managerPhoneVerificationToken;

        @Schema(description = "담당자 이메일 인증 token")
        @NotBlank
        private String managerEmailVerificationToken;

        @Schema(description = "/company/employment-certificate 업로드 후 반환된 fileId")
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
            @Schema(description = "업로드된 파일의 S3 key (기업회원 가입 시 employmentCertificateFileId로 사용)") String fileId,
            @Schema(description = "원본 파일명", example = "employment_certificate.pdf") String originalName,
            @Schema(description = "MIME type", example = "application/pdf") String mimeType,
            @Schema(description = "파일 크기 (bytes)", example = "1200000") long size,
            @Schema(description = "업로드 시각 (ISO-8601 UTC)") Instant uploadedAt
    ) {}
}
