package kr.co.carrer.user.billing.entity;

import jakarta.persistence.*;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import kr.co.carrer.user.billing.type.SubscriptionStatus;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "subscriptions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Subscription {

    @Id
    @Column(name = "subscription_id", columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID subscriptionId;

    @Column(name = "member_id", nullable = false, columnDefinition = "uuid")
    private UUID memberId;

    @Column(name = "plan_id", nullable = false)
    private Long planId;

    @Column(name = "billing_profile_id", columnDefinition = "uuid")
    private UUID billingProfileId;

    @Enumerated(EnumType.STRING)
    @Column(name = "subscription_status", nullable = false, length = 30)
    private SubscriptionStatus subscriptionStatus;

    @Column(name = "started_at", nullable = false)
    private ZonedDateTime startedAt;

    @Column(name = "current_period_start", nullable = false)
    private ZonedDateTime currentPeriodStart;

    @Column(name = "current_period_end", nullable = false)
    private ZonedDateTime currentPeriodEnd;

    @Column(name = "next_billing_at")
    private ZonedDateTime nextBillingAt;

    @Column(name = "payment_failed_at")
    private ZonedDateTime paymentFailedAt;

    @Column(name = "retry_count", nullable = false)
    private int retryCount;

    @Column(name = "cancel_scheduled_at")
    private ZonedDateTime cancelScheduledAt;

    @Column(name = "cancelled_at")
    private ZonedDateTime cancelledAt;

    @Column(name = "auto_renew", nullable = false)
    private boolean autoRenew;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private ZonedDateTime updatedAt;

    private static final int MAX_RETRY_COUNT = 2;
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    @PrePersist
    protected void onCreate() {
        if (subscriptionId == null) subscriptionId = UUID.randomUUID();
        ZonedDateTime now = ZonedDateTime.now(KST);
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = ZonedDateTime.now(KST);
    }

    public static Subscription create(UUID memberId, Long planId,
                                      ZonedDateTime periodStart, ZonedDateTime periodEnd) {
        return create(memberId, planId, null, periodStart, periodEnd);
    }

    // Phase 4: billingKey 자동결제 구독 생성 — billingProfileId 필수
    public static Subscription create(UUID memberId, Long planId, UUID billingProfileId,
                                      ZonedDateTime periodStart, ZonedDateTime periodEnd) {
        if (periodStart == null || periodEnd == null) {
            throw new CustomException(BillingErrorCode.SUBSCRIPTION_INVALID_PERIOD_NULL);
        }
        if (!periodStart.isBefore(periodEnd)) {
            throw new CustomException(BillingErrorCode.SUBSCRIPTION_INVALID_PERIOD_RANGE);
        }
        Subscription s = new Subscription();
        s.memberId = memberId;
        s.planId = planId;
        s.billingProfileId = billingProfileId;
        s.subscriptionStatus = SubscriptionStatus.ACTIVE;
        s.startedAt = periodStart;
        s.currentPeriodStart = periodStart;
        s.currentPeriodEnd = periodEnd;
        s.nextBillingAt = periodEnd;
        s.autoRenew = true;
        s.retryCount = 0;
        return s;
    }

    public void scheduleCancel() {
        if (this.subscriptionStatus != SubscriptionStatus.ACTIVE) {
            throw new CustomException(BillingErrorCode.SUBSCRIPTION_NOT_CANCELABLE);
        }
        this.subscriptionStatus = SubscriptionStatus.CANCEL_SCHEDULED;
        this.cancelScheduledAt = ZonedDateTime.now(KST);
        this.autoRenew = false;
    }

    public void markPaymentFailed() {
        if (this.subscriptionStatus != SubscriptionStatus.ACTIVE
                && this.subscriptionStatus != SubscriptionStatus.PAYMENT_FAILED) {
            throw new CustomException(BillingErrorCode.SUBSCRIPTION_INVALID_TRANSITION);
        }
        this.subscriptionStatus = SubscriptionStatus.PAYMENT_FAILED;
        // 최초 실패 시각만 기록 — 재시도 실패에서 덮어쓰지 않음 (재시도 스케줄 계산 기준)
        if (this.paymentFailedAt == null) {
            this.paymentFailedAt = ZonedDateTime.now(KST);
        }
        // autoRenew는 유지 — 재시도 스케줄러가 PAYMENT_FAILED + autoRenew=true 조건으로 동작
    }

    public void incrementRetryCount() {
        if (this.subscriptionStatus != SubscriptionStatus.PAYMENT_FAILED) {
            throw new CustomException(BillingErrorCode.SUBSCRIPTION_INVALID_TRANSITION);
        }
        if (this.retryCount >= MAX_RETRY_COUNT) {
            throw new CustomException(BillingErrorCode.SUBSCRIPTION_INVALID_TRANSITION);
        }
        this.retryCount++;
    }

    public void expire() {
        // constitution 4.2: CANCEL_SCHEDULED → EXPIRED, PAYMENT_FAILED → EXPIRED만 허용
        if (this.subscriptionStatus != SubscriptionStatus.CANCEL_SCHEDULED
                && this.subscriptionStatus != SubscriptionStatus.PAYMENT_FAILED) {
            throw new CustomException(BillingErrorCode.SUBSCRIPTION_INVALID_TRANSITION);
        }
        this.subscriptionStatus = SubscriptionStatus.EXPIRED;
        this.cancelledAt = ZonedDateTime.now(KST);
        this.autoRenew = false;
        this.nextBillingAt = null;
    }

    public void markRefundPending() {
        if (this.subscriptionStatus != SubscriptionStatus.ACTIVE
                && this.subscriptionStatus != SubscriptionStatus.CANCEL_SCHEDULED) {
            throw new CustomException(BillingErrorCode.SUBSCRIPTION_INVALID_TRANSITION);
        }
        this.subscriptionStatus = SubscriptionStatus.REFUND_PENDING;
        this.autoRenew = false;
    }

    public void markRefunded() {
        if (this.subscriptionStatus != SubscriptionStatus.REFUND_PENDING) {
            throw new CustomException(BillingErrorCode.SUBSCRIPTION_INVALID_TRANSITION);
        }
        this.subscriptionStatus = SubscriptionStatus.REFUNDED;
    }

    // 환불 거부 — REFUND_PENDING 진입 전 상태로 복귀. markRefundPending()이
    // ACTIVE/CANCEL_SCHEDULED에서만 진입을 허용하므로, cancelScheduledAt 존재 여부로
    // 어느 쪽이었는지 판별한다 (별도 컬럼 없이 기존 필드로 판별 가능).
    public void revertRefundPending() {
        if (this.subscriptionStatus != SubscriptionStatus.REFUND_PENDING) {
            throw new CustomException(BillingErrorCode.SUBSCRIPTION_INVALID_TRANSITION);
        }
        this.subscriptionStatus = this.cancelScheduledAt != null
                ? SubscriptionStatus.CANCEL_SCHEDULED
                : SubscriptionStatus.ACTIVE;
        this.autoRenew = this.subscriptionStatus == SubscriptionStatus.ACTIVE;
    }

    public void renewPeriod(ZonedDateTime newPeriodStart, ZonedDateTime newPeriodEnd) {
        if (this.subscriptionStatus != SubscriptionStatus.ACTIVE
                && this.subscriptionStatus != SubscriptionStatus.PAYMENT_FAILED) {
            throw new CustomException(BillingErrorCode.SUBSCRIPTION_INVALID_TRANSITION);
        }
        if (newPeriodStart == null || newPeriodEnd == null) {
            throw new CustomException(BillingErrorCode.SUBSCRIPTION_INVALID_PERIOD_NULL);
        }
        if (!newPeriodStart.isBefore(newPeriodEnd)) {
            throw new CustomException(BillingErrorCode.SUBSCRIPTION_INVALID_PERIOD_RANGE);
        }
        this.subscriptionStatus = SubscriptionStatus.ACTIVE;
        this.currentPeriodStart = newPeriodStart;
        this.currentPeriodEnd = newPeriodEnd;
        this.nextBillingAt = newPeriodEnd;
        this.paymentFailedAt = null;
        this.retryCount = 0;
        this.autoRenew = true;
    }
}
