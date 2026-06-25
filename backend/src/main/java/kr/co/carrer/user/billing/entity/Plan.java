package kr.co.carrer.user.billing.entity;

import jakarta.persistence.*;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import kr.co.carrer.user.billing.type.ProductCode;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.ZoneId;
import java.time.ZonedDateTime;

@Entity
@Table(name = "plans", uniqueConstraints = @UniqueConstraint(name = "uq_plans_product_code", columnNames = "product_code"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Plan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "plan_id")
    private Long planId;

    @Column(name = "product_code", nullable = false, length = 30)
    private String productCode;

    @Column(name = "plan_name", nullable = false, length = 50)
    private String planName;

    @Column(name = "plan_price", nullable = false)
    private int planPrice;

    @Column(name = "monthly_usage_limit", nullable = false)
    private int monthlyUsageLimit;

    @Column(name = "currency", nullable = false, length = 10)
    private String currency;

    @Column(name = "billing_cycle", nullable = false, length = 20)
    private String billingCycle;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private ZonedDateTime updatedAt;

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    @PrePersist
    protected void onCreate() {
        ZonedDateTime now = ZonedDateTime.now(KST);
        createdAt = now;
        updatedAt = now;
        if (currency == null) currency = "KRW";
        if (billingCycle == null) billingCycle = "MONTHLY";
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = ZonedDateTime.now(KST);
    }

    public static Plan create(String productCode, String planName, int planPrice,
                              int monthlyUsageLimit, String currency, String billingCycle,
                              boolean active) {
        if (productCode == null || productCode.isBlank()
                || planName == null || planName.isBlank()
                || planPrice < 0 || monthlyUsageLimit <= 0
                || currency == null || currency.isBlank()
                || billingCycle == null || billingCycle.isBlank()) {
            throw new CustomException(BillingErrorCode.PRODUCT_INVALID_PARAM);
        }
        if (ProductCode.fromCode(productCode).isEmpty()) {
            throw new CustomException(BillingErrorCode.PRODUCT_INVALID_PARAM);
        }

        Plan plan = new Plan();
        plan.productCode = productCode;
        plan.planName = planName;
        plan.planPrice = planPrice;
        plan.monthlyUsageLimit = monthlyUsageLimit;
        plan.currency = currency;
        plan.billingCycle = billingCycle;
        plan.isActive = active;
        return plan;
    }
}
