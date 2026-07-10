package kr.co.carrer.user.billing.service.impl;

import kr.co.carrer.user.billing.dto.EntitlementDTO;
import kr.co.carrer.user.billing.entity.MemberProductEntitlement;
import kr.co.carrer.user.billing.entity.Subscription;
import kr.co.carrer.user.billing.entity.SubscriptionUsagePeriod;
import kr.co.carrer.user.billing.repository.MemberProductEntitlementRepository;
import kr.co.carrer.user.billing.repository.SubscriptionRepository;
import kr.co.carrer.user.billing.repository.SubscriptionUsagePeriodRepository;
import kr.co.carrer.user.billing.service.EntitlementQueryService;
import kr.co.carrer.user.billing.type.FreeUsageStatus;
import kr.co.carrer.user.billing.type.PlanType;
import kr.co.carrer.user.billing.type.SubscriptionStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EntitlementQueryServiceImpl implements EntitlementQueryService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final String SUBSCRIPTION_REQUIRED = "SUBSCRIPTION_REQUIRED";
    private static final String MONTHLY_LIMIT_EXCEEDED = "MONTHLY_LIMIT_EXCEEDED";

    private final MemberProductEntitlementRepository entitlementRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final SubscriptionUsagePeriodRepository usagePeriodRepository;

    @Override
    @Transactional(readOnly = true)
    public EntitlementDTO.ResponseEntitlementList getMyEntitlements(UUID memberId) {
        List<MemberProductEntitlement> entitlements = entitlementRepository.findAllByMemberId(memberId);

        List<EntitlementDTO.EntitlementItem> items = entitlements.stream()
                .map(this::toItem)
                .toList();

        Map<String, Boolean> availabilityMap = new LinkedHashMap<>();
        items.forEach(item -> availabilityMap.put(item.productCode(), item.serviceAvailable()));

        return new EntitlementDTO.ResponseEntitlementList(availabilityMap, items);
    }

    private EntitlementDTO.EntitlementItem toItem(MemberProductEntitlement e) {
        boolean isPremium = e.getPlanType() == PlanType.PREMIUM;

        if (isPremium) {
            return toPremiumItem(e);
        }

        FreeUsageStatus freeStatus = e.getFreeUsageStatus();
        boolean available = freeStatus == FreeUsageStatus.AVAILABLE;
        String reason = resolveUnavailableReason(freeStatus);

        return new EntitlementDTO.EntitlementItem(
                e.getProductCode(),
                e.getPlanType().name(),
                e.getFreeRemaining(),
                freeStatus.name(),
                null,
                available,
                reason,
                null,
                null,
                null,
                null,
                null,
                null
        );
    }

    private EntitlementDTO.EntitlementItem toPremiumItem(MemberProductEntitlement entitlement) {
        Optional<Subscription> subscriptionOpt = entitlement.getActiveSubscriptionId() == null
                ? Optional.empty()
                : subscriptionRepository.findBySubscriptionId(entitlement.getActiveSubscriptionId());

        if (subscriptionOpt.isEmpty()) {
            return premiumUnavailable(entitlement, null, SUBSCRIPTION_REQUIRED);
        }

        Subscription subscription = subscriptionOpt.get();
        ZonedDateTime now = ZonedDateTime.now(KST);
        SubscriptionStatus status = subscription.getSubscriptionStatus();
        boolean statusAvailable = status == SubscriptionStatus.ACTIVE
                || status == SubscriptionStatus.CANCEL_SCHEDULED;
        boolean periodAvailable = !now.isBefore(subscription.getCurrentPeriodStart())
                && now.isBefore(subscription.getCurrentPeriodEnd());

        Optional<SubscriptionUsagePeriod> periodOpt =
                usagePeriodRepository.findCurrentPeriod(subscription.getSubscriptionId(), now);
        if (!statusAvailable || !periodAvailable || periodOpt.isEmpty()) {
            return premiumUnavailable(entitlement, status.name(),
                    statusAvailable ? SUBSCRIPTION_REQUIRED : status.name());
        }

        SubscriptionUsagePeriod period = periodOpt.get();
        boolean available = period.remaining() > 0;
        return new EntitlementDTO.EntitlementItem(
                entitlement.getProductCode(),
                entitlement.getPlanType().name(),
                entitlement.getFreeRemaining(),
                entitlement.getFreeUsageStatus().name(),
                status.name(),
                available,
                available ? null : MONTHLY_LIMIT_EXCEEDED,
                period.getLimitCount(),
                period.getUsedCount(),
                period.getReservedCount(),
                period.remaining(),
                period.getPeriodEnd(),
                period.getPeriodStart()
        );
    }

    private EntitlementDTO.EntitlementItem premiumUnavailable(
            MemberProductEntitlement entitlement, String subscriptionStatus, String reason) {
        return new EntitlementDTO.EntitlementItem(
                entitlement.getProductCode(),
                entitlement.getPlanType().name(),
                entitlement.getFreeRemaining(),
                entitlement.getFreeUsageStatus().name(),
                subscriptionStatus,
                false,
                reason,
                null,
                null,
                null,
                null,
                null,
                null
        );
    }

    private String resolveUnavailableReason(FreeUsageStatus status) {
        return switch (status) {
            case AVAILABLE -> null;
            case RESERVED -> SUBSCRIPTION_REQUIRED;
            case USED, FORFEITED -> SUBSCRIPTION_REQUIRED;
        };
    }
}
