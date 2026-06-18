package kr.co.carrer.user.member.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "member_terms_agreements")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MemberTermsAgreement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "agreement_id")
    private Long agreementId;

    @Column(name = "member_id", nullable = false, columnDefinition = "uuid")
    private UUID memberId;

    @Column(name = "service_agreed", nullable = false)
    private boolean serviceAgreed;

    @Column(name = "privacy_agreed", nullable = false)
    private boolean privacyAgreed;

    @Column(name = "marketing_agreed", nullable = false)
    private boolean marketingAgreed;

    // 기업 회원 필수, 개인 회원 NULL
    @Column(name = "company_verification_agreed")
    private Boolean companyVerificationAgreed;

    // 기업 회원 필수, 개인 회원 NULL
    @Column(name = "sms_agreed")
    private Boolean smsAgreed;

    @Column(name = "agreed_at", nullable = false, updatable = false)
    private Instant agreedAt;

    @PrePersist
    protected void onCreate() {
        agreedAt = Instant.now();
    }

    public static MemberTermsAgreement forUser(UUID memberId, boolean service, boolean privacy, boolean marketing) {
        Objects.requireNonNull(memberId, "memberId must not be null");
        MemberTermsAgreement a = new MemberTermsAgreement();
        a.memberId = memberId;
        a.serviceAgreed = service;
        a.privacyAgreed = privacy;
        a.marketingAgreed = marketing;
        a.companyVerificationAgreed = null;
        a.smsAgreed = null;
        return a;
    }

    public static MemberTermsAgreement forCompany(UUID memberId, boolean service, boolean privacy,
                                                   boolean marketing, boolean companyVerification, boolean sms) {
        Objects.requireNonNull(memberId, "memberId must not be null");
        MemberTermsAgreement a = new MemberTermsAgreement();
        a.memberId = memberId;
        a.serviceAgreed = service;
        a.privacyAgreed = privacy;
        a.marketingAgreed = marketing;
        a.companyVerificationAgreed = companyVerification;
        a.smsAgreed = sms;
        return a;
    }
}
