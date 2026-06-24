package kr.co.carrer.user.billing.service;

import kr.co.carrer.user.billing.dto.EntitlementDTO;
import kr.co.carrer.user.billing.entity.MemberProductEntitlement;
import kr.co.carrer.user.billing.entity.Subscription;
import kr.co.carrer.user.billing.entity.SubscriptionUsagePeriod;
import kr.co.carrer.user.billing.repository.MemberProductEntitlementRepository;
import kr.co.carrer.user.billing.repository.SubscriptionRepository;
import kr.co.carrer.user.billing.repository.SubscriptionUsagePeriodRepository;
import kr.co.carrer.user.billing.service.impl.EntitlementQueryServiceImpl;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EntitlementQueryServiceTest {

    @Mock MemberProductEntitlementRepository entitlementRepository;
    @Mock SubscriptionRepository subscriptionRepository;
    @Mock SubscriptionUsagePeriodRepository usagePeriodRepository;

    private EntitlementQueryServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new EntitlementQueryServiceImpl(
                entitlementRepository, subscriptionRepository, usagePeriodRepository);
    }

    @Test
    @DisplayName("PREMIUM ACTIVE — boolean map 유지 및 월 사용량 상세 확장")
    void premiumActive_contractCompatible() {
        UUID memberId = UUID.randomUUID();
        UUID subscriptionId = UUID.randomUUID();
        ZonedDateTime now = ZonedDateTime.now(ZoneId.of("Asia/Seoul"));
        MemberProductEntitlement entitlement =
                MemberProductEntitlement.createFree(memberId, "interview");
        entitlement.activatePremium(subscriptionId);
        Subscription subscription =
                Subscription.create(memberId, 1L, now.minusDays(1), now.plusDays(29));
        setField(subscription, "subscriptionId", subscriptionId);
        SubscriptionUsagePeriod period = SubscriptionUsagePeriod.create(
                subscriptionId, "interview", now.minusDays(1), now.plusDays(29), 20);
        period.reserve();

        when(entitlementRepository.findAllByMemberId(memberId)).thenReturn(List.of(entitlement));
        when(subscriptionRepository.findBySubscriptionId(subscriptionId))
                .thenReturn(Optional.of(subscription));
        when(usagePeriodRepository.findCurrentPeriod(eq(subscriptionId), any()))
                .thenReturn(Optional.of(period));

        EntitlementDTO.ResponseEntitlementList response = service.getMyEntitlements(memberId);
        EntitlementDTO.EntitlementItem detail = response.entitlementDetails().get(0);

        assertThat(response.entitlements()).containsEntry("interview", true);
        assertThat(detail.planType()).isEqualTo("PREMIUM");
        assertThat(detail.subscriptionStatus()).isEqualTo("ACTIVE");
        assertThat(detail.monthlyLimit()).isEqualTo(20);
        assertThat(detail.monthlyReserved()).isEqualTo(1);
        assertThat(detail.monthlyRemaining()).isEqualTo(19);
    }

    @Test
    @DisplayName("PREMIUM PAYMENT_FAILED — boolean false, FREE 이용권으로 폴백하지 않음")
    void premiumPaymentFailed_blocked() {
        UUID memberId = UUID.randomUUID();
        UUID subscriptionId = UUID.randomUUID();
        ZonedDateTime now = ZonedDateTime.now(ZoneId.of("Asia/Seoul"));
        MemberProductEntitlement entitlement =
                MemberProductEntitlement.createFree(memberId, "interview");
        entitlement.activatePremium(subscriptionId);
        Subscription subscription =
                Subscription.create(memberId, 1L, now.minusDays(1), now.plusDays(29));
        setField(subscription, "subscriptionId", subscriptionId);
        subscription.markPaymentFailed();

        when(entitlementRepository.findAllByMemberId(memberId)).thenReturn(List.of(entitlement));
        when(subscriptionRepository.findBySubscriptionId(subscriptionId))
                .thenReturn(Optional.of(subscription));

        EntitlementDTO.ResponseEntitlementList response = service.getMyEntitlements(memberId);
        EntitlementDTO.EntitlementItem detail = response.entitlementDetails().get(0);

        assertThat(response.entitlements()).containsEntry("interview", false);
        assertThat(detail.subscriptionStatus()).isEqualTo("PAYMENT_FAILED");
        assertThat(detail.unavailableReason()).isEqualTo("PAYMENT_FAILED");
        assertThat(entitlement.getFreeRemaining()).isEqualTo(1);
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
