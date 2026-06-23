package kr.co.carrer.user.billing.service;

import kr.co.carrer.user.billing.dto.BillingDTO;
import kr.co.carrer.user.billing.entity.Plan;
import kr.co.carrer.user.billing.entity.Subscription;
import kr.co.carrer.user.billing.entity.SubscriptionUsagePeriod;
import kr.co.carrer.user.billing.repository.PlanRepository;
import kr.co.carrer.user.billing.repository.SubscriptionRepository;
import kr.co.carrer.user.billing.repository.SubscriptionUsagePeriodRepository;
import kr.co.carrer.user.billing.service.impl.SubscriptionQueryServiceImpl;
import kr.co.carrer.user.billing.type.SubscriptionStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SubscriptionQueryServiceTest {

    @Mock PlanRepository planRepository;
    @Mock SubscriptionRepository subscriptionRepository;
    @Mock SubscriptionUsagePeriodRepository usagePeriodRepository;

    private SubscriptionQueryServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new SubscriptionQueryServiceImpl(
                planRepository, subscriptionRepository, usagePeriodRepository);
    }

    @Test
    @DisplayName("상품 조회 — 기존 Product 필드와 DB 가격·한도를 반환")
    void getProducts_contract() {
        Plan document = plan(1L, "document-coaching", "서류 AI 코칭", 29000, 30);
        Plan interview = plan(2L, "interview", "AI 모의면접", 29000, 20);
        when(planRepository.findAllByIsActiveTrueOrderByPlanIdAsc()).thenReturn(List.of(document, interview));

        List<BillingDTO.ProductItem> products = service.getProducts();

        assertThat(products).hasSize(2);
        assertThat(products.get(0).productCode()).isEqualTo("document-coaching");
        assertThat(products.get(0).price()).isEqualTo(29000);
        assertThat(products.get(0).currency()).isEqualTo("KRW");
        assertThat(products.get(0).billingCycle()).isEqualTo("MONTHLY");
        assertThat(products.get(0).features()).isNotEmpty();
        assertThat(products.get(0).active()).isTrue();
    }

    @Test
    @DisplayName("구독 없음 — 빈 배열")
    void getMySubscriptions_empty() {
        UUID memberId = UUID.randomUUID();
        when(subscriptionRepository.findAllByMemberIdOrderByCreatedAtDesc(memberId))
                .thenReturn(List.of());
        when(planRepository.findAllById(List.of())).thenReturn(List.of());

        assertThat(service.getMySubscriptions(memberId).subscriptions()).isEmpty();
    }

    @Test
    @DisplayName("document/interview 두 상품 구독을 각각 반환")
    void getMySubscriptions_twoProducts() {
        UUID memberId = UUID.randomUUID();
        Plan document = plan(1L, "document-coaching", "서류 AI 코칭", 29000, 30);
        Plan interview = plan(2L, "interview", "AI 모의면접", 29000, 20);
        Subscription documentSub = subscription(memberId, UUID.randomUUID(), 1L);
        Subscription interviewSub = subscription(memberId, UUID.randomUUID(), 2L);
        when(subscriptionRepository.findAllByMemberIdOrderByCreatedAtDesc(memberId))
                .thenReturn(List.of(documentSub, interviewSub));
        when(planRepository.findAllById(any())).thenReturn(List.of(document, interview));

        List<BillingDTO.SubscriptionItem> items =
                service.getMySubscriptions(memberId).subscriptions();

        assertThat(items).extracting(BillingDTO.SubscriptionItem::productCode)
                .containsExactly("document-coaching", "interview");
        assertThat(items).allSatisfy(item -> {
            assertThat(item.status()).isEqualTo("ACTIVE");
            assertThat(item.currentPeriodEnd()).isNotNull();
        });
    }

    @Test
    @DisplayName("모든 SubscriptionStatus 문자열과 nullable 날짜를 그대로 반환")
    void getMySubscriptions_allStatuses() {
        UUID memberId = UUID.randomUUID();
        Plan interview = plan(2L, "interview", "AI 모의면접", 29000, 20);

        for (SubscriptionStatus status : SubscriptionStatus.values()) {
            Subscription subscription = subscription(memberId, UUID.randomUUID(), 2L);
            setField(subscription, "subscriptionStatus", status);
            if (status == SubscriptionStatus.CANCEL_SCHEDULED) {
                setField(subscription, "cancelScheduledAt", ZonedDateTime.now());
            }
            if (status != SubscriptionStatus.ACTIVE) {
                setField(subscription, "nextBillingAt", null);
            }
            when(subscriptionRepository.findAllByMemberIdOrderByCreatedAtDesc(memberId))
                    .thenReturn(List.of(subscription));
            when(planRepository.findAllById(any())).thenReturn(List.of(interview));

            BillingDTO.SubscriptionItem item =
                    service.getMySubscriptions(memberId).subscriptions().get(0);

            assertThat(item.status()).isEqualTo(status.name());
            if (status == SubscriptionStatus.CANCEL_SCHEDULED) {
                assertThat(item.cancelScheduledAt()).isNotNull();
            }
        }
    }

    @Test
    @DisplayName("사용량 remaining = limit - used - reserved")
    void getMyUsages_remainingIncludesReserved() {
        UUID memberId = UUID.randomUUID();
        UUID subscriptionId = UUID.randomUUID();
        Plan interview = plan(2L, "interview", "AI 모의면접", 29000, 20);
        Subscription subscription = subscription(memberId, subscriptionId, 2L);
        ZonedDateTime now = ZonedDateTime.now(ZoneId.of("Asia/Seoul"));
        SubscriptionUsagePeriod period = SubscriptionUsagePeriod.create(
                subscriptionId, "interview", now.minusDays(1), now.plusDays(29), 20);
        period.reserve();
        period.reserve();
        period.consume();

        when(planRepository.findAllById(anyList())).thenReturn(List.of(interview));
        when(subscriptionRepository.findAllByMemberIdOrderByCreatedAtDesc(memberId))
                .thenReturn(List.of(subscription));
        when(usagePeriodRepository.findCurrentPeriodsForSubscriptions(anyList(), any()))
                .thenReturn(List.of(period));

        BillingDTO.UsageItem usage = service.getMyUsages(memberId).usages().get(0);

        assertThat(usage.limit()).isEqualTo(20);
        assertThat(usage.used()).isEqualTo(1);
        assertThat(usage.reserved()).isEqualTo(1);
        assertThat(usage.remaining()).isEqualTo(18);
        assertThat(usage.unit()).isEqualTo("session");
    }

    private Plan plan(Long id, String code, String name, int price, int limit) {
        Plan plan = Plan.create(code, name, price, limit, "KRW", "MONTHLY", true);
        setField(plan, "planId", id);
        return plan;
    }

    private Subscription subscription(UUID memberId, UUID id, Long planId) {
        ZonedDateTime now = ZonedDateTime.now(ZoneId.of("Asia/Seoul"));
        Subscription subscription = Subscription.create(memberId, planId, now.minusDays(1), now.plusDays(29));
        setField(subscription, "subscriptionId", id);
        return subscription;
    }

    private void setField(Object target, String name, Object value) {
        try {
            Field field = target.getClass().getDeclaredField(name);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new AssertionError(e);
        }
    }
}
