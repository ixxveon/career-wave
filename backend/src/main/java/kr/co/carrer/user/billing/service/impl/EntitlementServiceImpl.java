package kr.co.carrer.user.billing.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.entity.MemberProductEntitlement;
import kr.co.carrer.user.billing.entity.ServiceUsageRecord;
import kr.co.carrer.user.billing.entity.Subscription;
import kr.co.carrer.user.billing.entity.SubscriptionUsagePeriod;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import kr.co.carrer.user.billing.repository.MemberProductEntitlementRepository;
import kr.co.carrer.user.billing.repository.ServiceUsageRecordRepository;
import kr.co.carrer.user.billing.repository.SubscriptionRepository;
import kr.co.carrer.user.billing.repository.SubscriptionUsagePeriodRepository;
import kr.co.carrer.user.billing.service.BillingMemberPort;
import kr.co.carrer.user.billing.service.EntitlementService;
import kr.co.carrer.user.billing.type.FreeUsageStatus;
import kr.co.carrer.user.billing.type.PlanType;
import kr.co.carrer.user.billing.type.ResourceType;
import kr.co.carrer.user.billing.type.SubscriptionStatus;
import kr.co.carrer.user.billing.type.UsageSource;
import kr.co.carrer.user.billing.type.UsageStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class EntitlementServiceImpl implements EntitlementService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private final MemberProductEntitlementRepository entitlementRepository;
    private final ServiceUsageRecordRepository usageRecordRepository;
    private final BillingMemberPort billingMemberPort;
    private final SubscriptionRepository subscriptionRepository;
    private final SubscriptionUsagePeriodRepository usagePeriodRepository;

    @Override
    @Transactional
    public void reserve(UUID memberId, String productCode, ResourceType resourceType, UUID resourceId) {
        if (!billingMemberPort.isEligibleForBilling(memberId)) {
            throw new CustomException(BillingErrorCode.ACCOUNT_NOT_ELIGIBLE);
        }

        // 멱등 체크: 동일 resourceId에 대한 UsageRecord가 이미 존재하면 중복 예약 거부
        Optional<ServiceUsageRecord> existing =
                usageRecordRepository.findByResourceTypeAndResourceId(resourceType, resourceId);
        if (existing.isPresent()) {
            ServiceUsageRecord record = existing.get();
            if (record.getUsageStatus() == UsageStatus.RESERVED) {
                throw new CustomException(BillingErrorCode.SERVICE_USAGE_ALREADY_RESERVED);
            }
            // CONSUMED/RELEASED — 이미 처리 완료된 resourceId, 무시
            return;
        }

        // 이용권 비관적 잠금 조회
        MemberProductEntitlement entitlement = entitlementRepository
                .findByMemberIdAndProductCodeForUpdate(memberId, productCode)
                .orElseThrow(() -> new CustomException(BillingErrorCode.ENTITLEMENT_NOT_FOUND));

        if (entitlement.getPlanType() == PlanType.PREMIUM) {
            reserveSubscription(memberId, productCode, resourceType, resourceId, entitlement);
            return;
        }

        // 이용권 상태 사전 검증 — 명시적 오류 코드 반환
        FreeUsageStatus freeStatus = entitlement.getFreeUsageStatus();
        if (freeStatus == FreeUsageStatus.RESERVED) {
            throw new CustomException(BillingErrorCode.SERVICE_USAGE_ALREADY_RESERVED);
        }
        if (freeStatus == FreeUsageStatus.USED || freeStatus == FreeUsageStatus.FORFEITED) {
            throw new CustomException(BillingErrorCode.SUBSCRIPTION_REQUIRED);
        }

        entitlement.reserveFree();
        usageRecordRepository.save(ServiceUsageRecord.reserveFree(memberId, productCode, resourceType, resourceId));
    }

    @Override
    @Transactional
    public void consume(ResourceType resourceType, UUID resourceId) {
        ServiceUsageRecord record = usageRecordRepository
                .findByResourceTypeAndResourceIdForUpdate(resourceType, resourceId)
                .orElseThrow(() -> new CustomException(BillingErrorCode.SERVICE_USAGE_NOT_RESERVED));

        // 멱등: 이미 CONSUMED이면 무시
        if (record.getUsageStatus() == UsageStatus.CONSUMED) {
            log.debug("[EntitlementService] consume 멱등 — resourceType={}, resourceId={}", resourceType, resourceId);
            return;
        }
        // RELEASED 상태에서 consume은 불가 — 예약이 취소된 후 차감 시도
        if (record.getUsageStatus() == UsageStatus.RELEASED) {
            throw new CustomException(BillingErrorCode.SERVICE_USAGE_NOT_RESERVED);
        }

        if (record.getUsageSource() == UsageSource.SUBSCRIPTION) {
            SubscriptionUsagePeriod period = usagePeriodRepository
                    .findByUsagePeriodIdForUpdate(record.getUsagePeriodId())
                    .orElseThrow(() -> new CustomException(BillingErrorCode.SERVICE_USAGE_NOT_RESERVED));
            period.consume();
        } else {
            MemberProductEntitlement entitlement = entitlementRepository
                    .findByMemberIdAndProductCodeForUpdate(record.getMemberId(), record.getProductCode())
                    .orElseThrow(() -> new CustomException(BillingErrorCode.ENTITLEMENT_NOT_FOUND));
            entitlement.consumeFree();
        }
        record.consume();
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isConsumable(ResourceType resourceType, UUID resourceId) {
        return usageRecordRepository
                .findByResourceTypeAndResourceId(resourceType, resourceId)
                .map(r -> r.getUsageStatus() == UsageStatus.RESERVED)
                .orElse(false);
    }

    @Override
    @Transactional
    public void release(ResourceType resourceType, UUID resourceId) {
        Optional<ServiceUsageRecord> opt =
                usageRecordRepository.findByResourceTypeAndResourceIdForUpdate(resourceType, resourceId);

        if (opt.isEmpty()) {
            throw new CustomException(BillingErrorCode.SERVICE_USAGE_NOT_RESERVED);
        }

        ServiceUsageRecord record = opt.get();

        // 멱등: 이미 RELEASED이면 무시
        if (record.getUsageStatus() == UsageStatus.RELEASED) {
            log.debug("[EntitlementService] release 멱등 — resourceType={}, resourceId={}", resourceType, resourceId);
            return;
        }
        // CONSUMED(차감 완료) 상태에서 release는 불가 — 이미 사용된 이용권 복원 시도
        if (record.getUsageStatus() == UsageStatus.CONSUMED) {
            throw new CustomException(BillingErrorCode.SERVICE_USAGE_NOT_RESERVED);
        }

        if (record.getUsageSource() == UsageSource.SUBSCRIPTION) {
            SubscriptionUsagePeriod period = usagePeriodRepository
                    .findByUsagePeriodIdForUpdate(record.getUsagePeriodId())
                    .orElseThrow(() -> new CustomException(BillingErrorCode.SERVICE_USAGE_NOT_RESERVED));
            period.releaseReservation();
        } else {
            MemberProductEntitlement entitlement = entitlementRepository
                    .findByMemberIdAndProductCodeForUpdate(record.getMemberId(), record.getProductCode())
                    .orElseThrow(() -> new CustomException(BillingErrorCode.ENTITLEMENT_NOT_FOUND));
            entitlement.releaseFreeReservation();
        }
        record.release();
    }

    private void reserveSubscription(UUID memberId, String productCode,
                                     ResourceType resourceType, UUID resourceId,
                                     MemberProductEntitlement entitlement) {
        UUID subscriptionId = entitlement.getActiveSubscriptionId();
        if (subscriptionId == null) {
            throw new CustomException(BillingErrorCode.SUBSCRIPTION_REQUIRED);
        }

        Subscription subscription = subscriptionRepository
                .findBySubscriptionIdAndMemberIdForUpdate(subscriptionId, memberId)
                .orElseThrow(() -> new CustomException(BillingErrorCode.SUBSCRIPTION_NOT_FOUND));

        ZonedDateTime now = ZonedDateTime.now(KST);
        validateSubscriptionAvailability(subscription, now);

        SubscriptionUsagePeriod period = usagePeriodRepository
                .findCurrentPeriodForUpdate(subscriptionId, now)
                .orElseThrow(() -> new CustomException(BillingErrorCode.SUBSCRIPTION_REQUIRED));

        if (!productCode.equals(period.getProductCode())) {
            throw new CustomException(BillingErrorCode.SUBSCRIPTION_REQUIRED);
        }

        period.reserve();
        usageRecordRepository.save(ServiceUsageRecord.reserveSubscription(
                memberId, productCode, resourceType, resourceId, period.getUsagePeriodId()));
    }

    private void validateSubscriptionAvailability(Subscription subscription, ZonedDateTime now) {
        SubscriptionStatus status = subscription.getSubscriptionStatus();
        if (status != SubscriptionStatus.ACTIVE && status != SubscriptionStatus.CANCEL_SCHEDULED) {
            throw new CustomException(BillingErrorCode.SUBSCRIPTION_REQUIRED);
        }
        if (now.isBefore(subscription.getCurrentPeriodStart())
                || !now.isBefore(subscription.getCurrentPeriodEnd())) {
            throw new CustomException(BillingErrorCode.SUBSCRIPTION_REQUIRED);
        }
    }
}
