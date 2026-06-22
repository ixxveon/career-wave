package kr.co.carrer.user.billing.entity;

import jakarta.persistence.*;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import kr.co.carrer.user.billing.type.ResourceType;
import kr.co.carrer.user.billing.type.UsageSource;
import kr.co.carrer.user.billing.type.UsageStatus;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "service_usage_records",
    uniqueConstraints = @UniqueConstraint(name = "uq_resource", columnNames = {"resource_type", "resource_id"})
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ServiceUsageRecord {

    @Id
    @Column(name = "usage_record_id", columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID usageRecordId;

    @Column(name = "member_id", nullable = false, columnDefinition = "uuid")
    private UUID memberId;

    @Column(name = "product_code", nullable = false, length = 30)
    private String productCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "resource_type", nullable = false, length = 20)
    private ResourceType resourceType;

    @Column(name = "resource_id", nullable = false, columnDefinition = "uuid")
    private UUID resourceId;

    @Enumerated(EnumType.STRING)
    @Column(name = "usage_source", nullable = false, length = 20)
    private UsageSource usageSource;

    @Enumerated(EnumType.STRING)
    @Column(name = "usage_status", nullable = false, length = 20)
    private UsageStatus usageStatus;

    @Column(name = "usage_period_id", columnDefinition = "uuid")
    private UUID usagePeriodId;

    @Column(name = "reserved_at", nullable = false)
    private ZonedDateTime reservedAt;

    @Column(name = "consumed_at")
    private ZonedDateTime consumedAt;

    @Column(name = "released_at")
    private ZonedDateTime releasedAt;

    @PrePersist
    protected void onCreate() {
        if (usageRecordId == null) usageRecordId = UUID.randomUUID();
        if (reservedAt == null) reservedAt = ZonedDateTime.now();
    }

    public static ServiceUsageRecord reserveFree(UUID memberId, String productCode,
                                                   ResourceType resourceType, UUID resourceId) {
        ServiceUsageRecord r = new ServiceUsageRecord();
        r.memberId = memberId;
        r.productCode = productCode;
        r.resourceType = resourceType;
        r.resourceId = resourceId;
        r.usageSource = UsageSource.FREE;
        r.usageStatus = UsageStatus.RESERVED;
        return r;
    }

    public static ServiceUsageRecord reserveSubscription(UUID memberId, String productCode,
                                                          ResourceType resourceType, UUID resourceId,
                                                          UUID usagePeriodId) {
        ServiceUsageRecord r = new ServiceUsageRecord();
        r.memberId = memberId;
        r.productCode = productCode;
        r.resourceType = resourceType;
        r.resourceId = resourceId;
        r.usageSource = UsageSource.SUBSCRIPTION;
        r.usageStatus = UsageStatus.RESERVED;
        r.usagePeriodId = usagePeriodId;
        return r;
    }

    public void consume() {
        if (this.usageStatus != UsageStatus.RESERVED) {
            throw new CustomException(BillingErrorCode.USAGE_RECORD_INVALID_STATE);
        }
        this.usageStatus = UsageStatus.CONSUMED;
        this.consumedAt = ZonedDateTime.now();
    }

    public void release() {
        if (this.usageStatus != UsageStatus.RESERVED) {
            throw new CustomException(BillingErrorCode.USAGE_RECORD_INVALID_STATE);
        }
        this.usageStatus = UsageStatus.RELEASED;
        this.releasedAt = ZonedDateTime.now();
    }
}
