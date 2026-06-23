package kr.co.carrer.user.billing.entity;

import jakarta.persistence.*;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "subscription_usage_periods",
    uniqueConstraints = @UniqueConstraint(name = "uq_sub_period_start", columnNames = {"subscription_id", "period_start"})
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SubscriptionUsagePeriod {

    @Id
    @Column(name = "usage_period_id", columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID usagePeriodId;

    @Column(name = "subscription_id", nullable = false, columnDefinition = "uuid")
    private UUID subscriptionId;

    @Column(name = "product_code", nullable = false, length = 30)
    private String productCode;

    @Column(name = "period_start", nullable = false)
    private ZonedDateTime periodStart;

    @Column(name = "period_end", nullable = false)
    private ZonedDateTime periodEnd;

    @Column(name = "limit_count", nullable = false)
    private int limitCount;

    @Column(name = "used_count", nullable = false)
    private int usedCount;

    @Column(name = "reserved_count", nullable = false)
    private int reservedCount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private ZonedDateTime updatedAt;

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    @PrePersist
    protected void onCreate() {
        if (usagePeriodId == null) usagePeriodId = UUID.randomUUID();
        ZonedDateTime now = ZonedDateTime.now(KST);
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = ZonedDateTime.now(KST);
    }

    public static SubscriptionUsagePeriod create(UUID subscriptionId, String productCode,
                                                  ZonedDateTime periodStart, ZonedDateTime periodEnd,
                                                  int limitCount) {
        if (limitCount <= 0) {
            throw new IllegalArgumentException("limitCount는 1 이상이어야 합니다: " + limitCount);
        }
        if (!periodStart.isBefore(periodEnd)) {
            throw new IllegalArgumentException("periodStart는 periodEnd보다 이전이어야 합니다");
        }
        SubscriptionUsagePeriod p = new SubscriptionUsagePeriod();
        p.subscriptionId = subscriptionId;
        p.productCode = productCode;
        p.periodStart = periodStart;
        p.periodEnd = periodEnd;
        p.limitCount = limitCount;
        p.usedCount = 0;
        p.reservedCount = 0;
        return p;
    }

    public void reserve() {
        if (!canReserve()) {
            throw new CustomException(BillingErrorCode.MONTHLY_LIMIT_EXCEEDED);
        }
        this.reservedCount++;
    }

    public void consume() {
        if (this.reservedCount <= 0) {
            throw new CustomException(BillingErrorCode.SERVICE_USAGE_NOT_RESERVED);
        }
        this.reservedCount--;
        this.usedCount++;
    }

    public void releaseReservation() {
        if (this.reservedCount <= 0) {
            throw new CustomException(BillingErrorCode.SERVICE_USAGE_NOT_RESERVED);
        }
        this.reservedCount--;
    }

    public int remaining() {
        return limitCount - usedCount - reservedCount;
    }

    public boolean canReserve() {
        return remaining() > 0;
    }
}
