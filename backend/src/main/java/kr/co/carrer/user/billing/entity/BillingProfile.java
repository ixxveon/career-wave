package kr.co.carrer.user.billing.entity;

import jakarta.persistence.*;
import kr.co.carrer.user.billing.type.BillingProfileStatus;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "billing_profiles")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BillingProfile {

    @Id
    @Column(name = "billing_profile_id", columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID billingProfileId;

    @Column(name = "member_id", nullable = false, columnDefinition = "uuid")
    private UUID memberId;

    @Column(name = "customer_key", nullable = false, length = 100)
    private String customerKey;

    @Getter(AccessLevel.NONE)
    @Column(name = "encrypted_billing_key", nullable = false, columnDefinition = "text")
    private String encryptedBillingKey;

    @Column(name = "card_company", length = 50)
    private String cardCompany;

    @Column(name = "card_number_masked", length = 30)
    private String cardNumberMasked;

    @Enumerated(EnumType.STRING)
    @Column(name = "billing_profile_status", nullable = false, length = 20)
    private BillingProfileStatus billingProfileStatus;

    @Column(name = "authenticated_at", nullable = false)
    private ZonedDateTime authenticatedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private ZonedDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (billingProfileId == null) billingProfileId = UUID.randomUUID();
        ZonedDateTime now = ZonedDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = ZonedDateTime.now();
    }

    public static BillingProfile create(UUID memberId, String customerKey,
                                        String encryptedBillingKey, String cardCompany,
                                        String cardNumberMasked) {
        BillingProfile bp = new BillingProfile();
        bp.memberId = memberId;
        bp.customerKey = customerKey;
        bp.encryptedBillingKey = encryptedBillingKey;
        bp.cardCompany = cardCompany;
        bp.cardNumberMasked = cardNumberMasked;
        bp.billingProfileStatus = BillingProfileStatus.ACTIVE;
        bp.authenticatedAt = ZonedDateTime.now();
        return bp;
    }

    public void revoke() {
        this.billingProfileStatus = BillingProfileStatus.REVOKED;
    }

    // getter 이름 규칙 미적용 → Jackson BeanSerializer 직렬화 대상 제외
    // Toss 자동결제 API 호출 전용 — 응답 DTO·로그에 절대 포함 금지
    public String encryptedBillingKeyForService() {
        return this.encryptedBillingKey;
    }
}
