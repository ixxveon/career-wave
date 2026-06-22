package kr.co.carrer.user.billing.service.impl;

import kr.co.carrer.user.billing.dto.BillingDTO;
import kr.co.carrer.user.billing.entity.Plan;
import kr.co.carrer.user.billing.entity.Subscription;
import kr.co.carrer.user.billing.entity.SubscriptionUsagePeriod;
import kr.co.carrer.user.billing.repository.PlanRepository;
import kr.co.carrer.user.billing.repository.SubscriptionRepository;
import kr.co.carrer.user.billing.repository.SubscriptionUsagePeriodRepository;
import kr.co.carrer.user.billing.service.SubscriptionQueryService;
import kr.co.carrer.user.billing.type.ProductCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SubscriptionQueryServiceImpl implements SubscriptionQueryService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private final PlanRepository planRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final SubscriptionUsagePeriodRepository usagePeriodRepository;

    @Override
    @Transactional(readOnly = true)
    public List<BillingDTO.ProductItem> getProducts() {
        return planRepository.findAllByOrderByPlanIdAsc().stream()
                .filter(plan -> ProductCode.fromCode(plan.getProductCode()).isPresent())
                .map(this::toProductItem)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public BillingDTO.ResponseSubscriptionList getMySubscriptions(UUID memberId) {
        List<Subscription> subscriptions =
                subscriptionRepository.findAllByMemberIdOrderByCreatedAtDesc(memberId);
        Map<Long, Plan> plans = planRepository.findAllById(
                        subscriptions.stream()
                                .map(Subscription::getPlanId)
                                .distinct()
                                .toList()
                ).stream()
                .collect(Collectors.toMap(Plan::getPlanId, Function.identity()));

        List<BillingDTO.SubscriptionItem> items =
                subscriptions.stream()
                        .filter(subscription -> plans.containsKey(subscription.getPlanId()))
                        .filter(subscription -> ProductCode.fromCode(
                                plans.get(subscription.getPlanId()).getProductCode()).isPresent())
                        .map(subscription -> toSubscriptionItem(subscription, plans.get(subscription.getPlanId())))
                        .toList();

        return new BillingDTO.ResponseSubscriptionList(items);
    }

    @Override
    @Transactional(readOnly = true)
    public BillingDTO.ResponseUsageList getMyUsages(UUID memberId) {
        ZonedDateTime now = ZonedDateTime.now(KST);
        Map<Long, Plan> plans = planRepository.findAll().stream()
                .collect(Collectors.toMap(Plan::getPlanId, Function.identity()));

        List<BillingDTO.UsageItem> usages =
                subscriptionRepository.findAllByMemberIdOrderByCreatedAtDesc(memberId).stream()
                        .filter(subscription -> plans.containsKey(subscription.getPlanId()))
                        .filter(subscription -> ProductCode.fromCode(
                                plans.get(subscription.getPlanId()).getProductCode()).isPresent())
                        .map(subscription -> usagePeriodRepository
                                .findCurrentPeriod(subscription.getSubscriptionId(), now)
                                .map(period -> toUsageItem(period,
                                        ProductCode.fromCode(period.getProductCode()).orElseThrow())))
                        .flatMap(java.util.Optional::stream)
                        .toList();

        return new BillingDTO.ResponseUsageList(usages);
    }

    private BillingDTO.ProductItem toProductItem(Plan plan) {
        ProductCode product = ProductCode.fromCode(plan.getProductCode()).orElseThrow();
        return new BillingDTO.ProductItem(
                product.code(),
                plan.getPlanName(),
                product.description(),
                plan.getPlanPrice(),
                plan.getCurrency(),
                plan.getBillingCycle(),
                product.features(),
                plan.isActive(),
                plan.getMonthlyUsageLimit()
        );
    }

    private BillingDTO.SubscriptionItem toSubscriptionItem(Subscription subscription, Plan plan) {
        ProductCode product = ProductCode.fromCode(plan.getProductCode()).orElseThrow();
        return new BillingDTO.SubscriptionItem(
                subscription.getSubscriptionId(),
                product.code(),
                plan.getPlanName(),
                subscription.getSubscriptionStatus().name(),
                subscription.getStartedAt(),
                subscription.getCurrentPeriodStart(),
                subscription.getCurrentPeriodEnd(),
                subscription.getNextBillingAt(),
                subscription.getCancelScheduledAt()
        );
    }

    private BillingDTO.UsageItem toUsageItem(SubscriptionUsagePeriod period, ProductCode product) {
        return new BillingDTO.UsageItem(
                product.code(),
                period.getLimitCount(),
                period.getUsedCount(),
                Math.max(0, period.remaining()),
                product.usageUnit(),
                period.getPeriodEnd(),
                period.getReservedCount()
        );
    }
}
