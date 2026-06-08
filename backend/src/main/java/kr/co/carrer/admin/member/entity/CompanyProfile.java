package kr.co.carrer.admin.member.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.UUID;

/**
 * [READ-ONLY] admin 도메인 전용 조회 매핑 엔티티.
 * company_profiles 테이블의 INSERT/UPDATE는 user 도메인에서 담당합니다.
 * 이 엔티티는 HR 담당자 목록/상세 조회 시 Native Query JOIN 용도로만 사용됩니다.
 */
@Entity
@Table(name = "company_profiles")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CompanyProfile {

    @Id
    @Column(name = "company_profile_id", columnDefinition = "UUID")
    private UUID companyProfileId;

    @Column(name = "member_id", nullable = false, columnDefinition = "UUID")
    private UUID memberId;

    @Column(name = "company_type", nullable = false, length = 50)
    private String companyType;

    @Column(name = "company_name", nullable = false, length = 100)
    private String companyName;

    @Column(name = "business_number", nullable = false, length = 20)
    private String businessNumber;

    @Column(name = "ceo_name", nullable = false, length = 50)
    private String ceoName;

    @Column(name = "address", nullable = false, length = 200)
    private String address;

    @Column(name = "address_detail", length = 200)
    private String addressDetail;

    @Column(name = "is_agency", nullable = false)
    private boolean isAgency;

    @Column(name = "certificate_number", length = 50)
    private String certificateNumber;

    @Column(name = "cert_file_url", length = 500)
    private String certFileUrl;

    @Column(name = "cert_file_name", length = 200)
    private String certFileName;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private ZonedDateTime updatedAt;
}
