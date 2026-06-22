package kr.co.carrer.user.billing.entity;

import jakarta.persistence.*;
import kr.co.carrer.user.billing.type.FreeUsageStatus;
import kr.co.carrer.user.billing.type.PlanType;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "member_product_entitlements")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MemberProductEntitlement {

    @Id
    @Column(name = "entitlement_id", columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID entitlementId;

    @Column(name = "member_id", nullable = false, columnDefinition = "uuid")
    private UUID memberId;

    @Column(name = "product_code", nullable = false, length = 30)
    private String productCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "plan_type", nullable = false, length = 20)
    private PlanType planType;

    @Column(name = "free_remaining", nullable = false)
    private int freeRemaining;

    @Enumerated(EnumType.STRING)
    @Column(name = "free_usage_status", nullable = false, length = 20)
    private FreeUsageStatus freeUsageStatus;

    @Column(name = "active_subscription_id", columnDefinition = "uuid")
    private UUID activeSubscriptionId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private ZonedDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (entitlementId == null) entitlementId = UUID.randomUUID();
        ZonedDateTime now = ZonedDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = ZonedDateTime.now();
    }

    public static MemberProductEntitlement createFree(UUID memberId, String productCode) {
        MemberProductEntitlement e = new MemberProductEntitlement();
        e.memberId = memberId;
        e.productCode = productCode;
        e.planType = PlanType.FREE;
        e.freeRemaining = 1;
        e.freeUsageStatus = FreeUsageStatus.AVAILABLE;
        return e;
    }

    public void reserveFree() {
        this.freeUsageStatus = FreeUsageStatus.RESERVED;
    }

    public void consumeFree() {
        this.freeUsageStatus = FreeUsageStatus.USED;
        this.freeRemaining = 0;
    }

    public void releaseFreeReservation() {
        this.freeUsageStatus = FreeUsageStatus.AVAILABLE;
    }

    public void forfeitFree() {
        this.freeUsageStatus = FreeUsageStatus.FORFEITED;
        this.freeRemaining = 0;
    }

    public void activatePremium(UUID subscriptionId) {
        this.planType = PlanType.PREMIUM;
        this.activeSubscriptionId = subscriptionId;
    }

    public void deactivatePremium() {
        this.planType = PlanType.FREE;
        this.activeSubscriptionId = null;
    }
}
