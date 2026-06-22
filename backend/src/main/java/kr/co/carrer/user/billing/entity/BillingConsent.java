package kr.co.carrer.user.billing.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "billing_consents")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BillingConsent {

    @Id
    @Column(name = "billing_consent_id", columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID billingConsentId;

    @Column(name = "member_id", nullable = false, columnDefinition = "uuid")
    private UUID memberId;

    @Column(name = "plan_id", nullable = false)
    private Long planId;

    @Column(name = "terms_version", nullable = false, length = 30)
    private String termsVersion;

    @Column(name = "agreed_at", nullable = false, updatable = false)
    private ZonedDateTime agreedAt;

    @Column(name = "revoked_at")
    private ZonedDateTime revokedAt;

    @PrePersist
    protected void onCreate() {
        if (billingConsentId == null) billingConsentId = UUID.randomUUID();
        if (agreedAt == null) agreedAt = ZonedDateTime.now();
    }

    public static BillingConsent agree(UUID memberId, Long planId, String termsVersion) {
        BillingConsent c = new BillingConsent();
        c.memberId = memberId;
        c.planId = planId;
        c.termsVersion = termsVersion;
        return c;
    }

    public void revoke() {
        this.revokedAt = ZonedDateTime.now();
    }

    public boolean isActive() {
        return revokedAt == null;
    }
}
