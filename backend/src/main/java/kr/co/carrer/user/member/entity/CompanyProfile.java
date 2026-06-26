package kr.co.carrer.user.member.entity;

import jakarta.persistence.*;
import kr.co.carrer.user.member.type.CompanyType;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

// INSERT/UPDATE 책임: user 도메인 (admin 도메인의 CompanyProfile은 조회 전용)
@Entity(name = "UserCompanyProfile")
@Table(name = "company_profiles",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_company_member_id",  columnNames = "member_id"),
                @UniqueConstraint(name = "uq_business_number",    columnNames = "business_number"),
                @UniqueConstraint(name = "uq_cert_file_url",      columnNames = "cert_file_url")
        })
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CompanyProfile {
    private static final String LEGACY_CERTIFICATE_NUMBER_PLACEHOLDER = "UNUSED";

    @Id
    @Column(name = "company_profile_id", columnDefinition = "uuid")
    private UUID companyProfileId;

    @Column(name = "member_id", nullable = false, columnDefinition = "uuid")
    private UUID memberId;

    @Enumerated(EnumType.STRING)
    @Column(name = "company_type", nullable = false, length = 50)
    private CompanyType companyType;

    @Column(name = "company_name", nullable = false, length = 100)
    private String companyName;

    @Column(name = "business_number", nullable = false, length = 20)
    private String businessNumber;

    @Column(name = "ceo_name", nullable = false, length = 50)
    private String ceoName;

    // address = roadAddress 값으로 채움 (DB NOT NULL, road_address와 동의어)
    @Column(name = "address", nullable = false, length = 200)
    private String address;

    @Column(name = "postal_code", nullable = false, length = 10)
    private String postalCode;

    @Column(name = "road_address", nullable = false, length = 200)
    private String roadAddress;

    @Column(name = "jibun_address", length = 200)
    private String jibunAddress;

    @Column(name = "address_detail", length = 200)
    private String addressDetail;

    @Column(name = "is_agency", nullable = false)
    private boolean isAgency;

    @Column(name = "certificate_number", nullable = false, length = 50)
    private String certificateNumber;

    @Column(name = "cert_file_url", nullable = false, length = 500)
    private String certFileUrl;

    @Column(name = "cert_file_name", nullable = false, length = 200)
    private String certFileName;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        if (companyProfileId == null) companyProfileId = UUID.randomUUID();
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public static CompanyProfile create(UUID memberId, CompanyType companyType, String companyName,
                                        String businessNumber, String ceoName,
                                        String postalCode, String roadAddress, String jibunAddress, String addressDetail,
                                        boolean isAgency, String certificateNumber,
                                        String certFileUrl, String certFileName) {
        CompanyProfile p = new CompanyProfile();
        p.memberId = memberId;
        p.companyType = companyType;
        p.companyName = companyName;
        p.businessNumber = businessNumber;
        p.ceoName = ceoName;
        p.address = roadAddress;
        p.postalCode = postalCode;
        p.roadAddress = roadAddress;
        p.jibunAddress = jibunAddress;
        p.addressDetail = addressDetail;
        p.isAgency = isAgency;
        p.certificateNumber = normalizeCertificateNumber(certificateNumber);
        p.certFileUrl = certFileUrl;
        p.certFileName = certFileName;
        return p;
    }

    private static String normalizeCertificateNumber(String certificateNumber) {
        if (certificateNumber == null || certificateNumber.isBlank()) {
            return LEGACY_CERTIFICATE_NUMBER_PLACEHOLDER;
        }
        return certificateNumber;
    }
}
