package kr.co.carrer.user.billing.entity;

import jakarta.persistence.*;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import kr.co.carrer.user.billing.type.FreeUsageStatus;
import kr.co.carrer.user.billing.type.PlanType;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "member_product_entitlements",
    uniqueConstraints = @UniqueConstraint(name = "uq_member_product", columnNames = {"member_id", "product_code"})
)
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

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    @PrePersist
    protected void onCreate() {
        if (entitlementId == null) entitlementId = UUID.randomUUID();
        ZonedDateTime now = ZonedDateTime.now(KST);
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = ZonedDateTime.now(KST);
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
        if (this.freeUsageStatus != FreeUsageStatus.AVAILABLE) {
            throw new CustomException(BillingErrorCode.ENTITLEMENT_INVALID_STATE);
        }
        this.freeUsageStatus = FreeUsageStatus.RESERVED;
    }

    public void consumeFree() {
        if (this.freeUsageStatus != FreeUsageStatus.RESERVED) {
            throw new CustomException(BillingErrorCode.ENTITLEMENT_INVALID_STATE);
        }
        this.freeUsageStatus = FreeUsageStatus.USED;
        this.freeRemaining = 0;
    }

    public void releaseFreeReservation() {
        if (this.freeUsageStatus != FreeUsageStatus.RESERVED) {
            throw new CustomException(BillingErrorCode.ENTITLEMENT_INVALID_STATE);
        }
        this.freeUsageStatus = FreeUsageStatus.AVAILABLE;
    }

    public void forfeitFree() {
        // RESERVED 차단: 진행 중인 서비스 작업이 있을 때 구독 전환 시 후속 consume/release 콜백이 깨짐
        // 서비스 레이어에서 AVAILABLE 상태를 확인 후 호출해야 함
        if (this.freeUsageStatus != FreeUsageStatus.AVAILABLE) {
            throw new CustomException(BillingErrorCode.ENTITLEMENT_INVALID_STATE);
        }
        this.freeUsageStatus = FreeUsageStatus.FORFEITED;
        this.freeRemaining = 0;
    }

    public void activatePremium(UUID subscriptionId) {
        if (subscriptionId == null) {
            throw new CustomException(BillingErrorCode.ENTITLEMENT_INVALID_STATE);
        }
        if (this.freeUsageStatus == FreeUsageStatus.RESERVED) {
            throw new CustomException(BillingErrorCode.ENTITLEMENT_INVALID_STATE);
        }
        this.planType = PlanType.PREMIUM;
        this.activeSubscriptionId = subscriptionId;
    }

    public void deactivatePremium() {
        this.planType = PlanType.FREE;
        this.activeSubscriptionId = null;
    }
}
