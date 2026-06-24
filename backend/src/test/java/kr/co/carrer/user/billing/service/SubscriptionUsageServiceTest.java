package kr.co.carrer.user.billing.service;

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
import kr.co.carrer.user.billing.service.impl.EntitlementServiceImpl;
import kr.co.carrer.user.billing.type.FreeUsageStatus;
import kr.co.carrer.user.billing.type.ResourceType;
import kr.co.carrer.user.billing.type.SubscriptionStatus;
import kr.co.carrer.user.billing.type.UsageSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.lang.reflect.Field;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SubscriptionUsageServiceTest {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    @Mock MemberProductEntitlementRepository entitlementRepository;
    @Mock ServiceUsageRecordRepository usageRecordRepository;
    @Mock BillingMemberPort billingMemberPort;
    @Mock SubscriptionRepository subscriptionRepository;
    @Mock SubscriptionUsagePeriodRepository usagePeriodRepository;

    private EntitlementServiceImpl service;
    private UUID memberId;
    private UUID subscriptionId;
    private UUID usagePeriodId;
    private MemberProductEntitlement entitlement;
    private Subscription subscription;
    private SubscriptionUsagePeriod period;

    @BeforeEach
    void setUp() {
        service = new EntitlementServiceImpl(
                entitlementRepository, usageRecordRepository, billingMemberPort,
                subscriptionRepository, usagePeriodRepository);
        memberId = UUID.randomUUID();
        subscriptionId = UUID.randomUUID();
        usagePeriodId = UUID.randomUUID();

        entitlement = MemberProductEntitlement.createFree(memberId, "document-coaching");
        entitlement.activatePremium(subscriptionId);

        ZonedDateTime now = ZonedDateTime.now(KST);
        subscription = Subscription.create(memberId, 1L, now.minusDays(1), now.plusDays(29));
        setField(subscription, "subscriptionId", subscriptionId);
        period = SubscriptionUsagePeriod.create(
                subscriptionId, "document-coaching", now.minusDays(1), now.plusDays(29), 2);
        setField(period, "usagePeriodId", usagePeriodId);

        when(billingMemberPort.isEligibleForBilling(memberId)).thenReturn(true);
    }

    @Test
    @DisplayName("ACTIVE PREMIUM 예약 — 구독 월 reserved만 증가하고 FREE 상태는 유지")
    void reserve_activePremium_usesSubscriptionOnly() {
        UUID resourceId = UUID.randomUUID();
        stubPremiumReservation(resourceId);

        service.reserve(memberId, "document-coaching", ResourceType.DOCUMENT, resourceId);

        assertThat(period.getReservedCount()).isEqualTo(1);
        assertThat(entitlement.getFreeRemaining()).isEqualTo(1);
        assertThat(entitlement.getFreeUsageStatus()).isEqualTo(FreeUsageStatus.AVAILABLE);

        ArgumentCaptor<ServiceUsageRecord> captor = ArgumentCaptor.forClass(ServiceUsageRecord.class);
        verify(usageRecordRepository).save(captor.capture());
        assertThat(captor.getValue().getUsageSource()).isEqualTo(UsageSource.SUBSCRIPTION);
        assertThat(captor.getValue().getUsagePeriodId()).isEqualTo(usagePeriodId);
    }

    @Test
    @DisplayName("CANCEL_SCHEDULED 기간 종료 전 예약 가능")
    void reserve_cancelScheduled_beforeEnd_success() {
        subscription.scheduleCancel();
        UUID resourceId = UUID.randomUUID();
        stubPremiumReservation(resourceId);

        service.reserve(memberId, "document-coaching", ResourceType.DOCUMENT, resourceId);

        assertThat(period.getReservedCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("PAYMENT_FAILED는 즉시 차단")
    void reserve_paymentFailed_blocked() {
        subscription.markPaymentFailed();
        UUID resourceId = UUID.randomUUID();
        stubPremiumReservation(resourceId);

        assertThatThrownBy(() ->
                service.reserve(memberId, "document-coaching", ResourceType.DOCUMENT, resourceId))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(BillingErrorCode.SUBSCRIPTION_REQUIRED);
        assertThat(period.getReservedCount()).isZero();
    }

    @ParameterizedTest
    @EnumSource(value = SubscriptionStatus.class, names = {
            "EXPIRED", "REFUND_PENDING", "REFUNDED"
    })
    @DisplayName("EXPIRED/REFUND 상태는 예약 차단")
    void reserve_blockedStatuses(SubscriptionStatus status) {
        setField(subscription, "subscriptionStatus", status);
        UUID resourceId = UUID.randomUUID();
        stubPremiumReservation(resourceId);

        assertThatThrownBy(() ->
                service.reserve(memberId, "document-coaching", ResourceType.DOCUMENT, resourceId))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(BillingErrorCode.SUBSCRIPTION_REQUIRED);
    }

    @Test
    @DisplayName("currentPeriodEnd 도달 시 CANCEL_SCHEDULED 예약 차단")
    void reserve_cancelScheduled_atPeriodEnd_blocked() {
        subscription.scheduleCancel();
        setField(subscription, "currentPeriodEnd", ZonedDateTime.now(KST));
        UUID resourceId = UUID.randomUUID();
        stubPremiumReservation(resourceId);

        assertThatThrownBy(() ->
                service.reserve(memberId, "document-coaching", ResourceType.DOCUMENT, resourceId))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(BillingErrorCode.SUBSCRIPTION_REQUIRED);
    }

    @Test
    @DisplayName("document PREMIUM은 interview 상품 예약에 사용되지 않음")
    void documentPremium_doesNotAuthorizeInterview() {
        UUID resourceId = UUID.randomUUID();
        MemberProductEntitlement interview =
                MemberProductEntitlement.createFree(memberId, "interview");
        interview.reserveFree();
        interview.consumeFree();
        when(usageRecordRepository.findByResourceTypeAndResourceId(
                ResourceType.INTERVIEW_SESSION, resourceId)).thenReturn(Optional.empty());
        when(entitlementRepository.findByMemberIdAndProductCodeForUpdate(memberId, "interview"))
                .thenReturn(Optional.of(interview));

        assertThatThrownBy(() ->
                service.reserve(memberId, "interview", ResourceType.INTERVIEW_SESSION, resourceId))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(BillingErrorCode.SUBSCRIPTION_REQUIRED);
        verify(subscriptionRepository, never())
                .findBySubscriptionIdAndMemberIdForUpdate(any(), any());
    }

    @Test
    @DisplayName("월 한도 소진 시 MONTHLY_LIMIT_EXCEEDED(429)")
    void reserve_limitExceeded() {
        UUID first = UUID.randomUUID();
        UUID second = UUID.randomUUID();
        period.reserve();
        period.reserve();
        stubPremiumReservation(first);
        when(usageRecordRepository.findByResourceTypeAndResourceId(ResourceType.DOCUMENT, second))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                service.reserve(memberId, "document-coaching", ResourceType.DOCUMENT, second))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(BillingErrorCode.MONTHLY_LIMIT_EXCEEDED);
    }

    @Test
    @DisplayName("SUBSCRIPTION consume — reserved -1, used +1, 재호출 멱등")
    void consume_subscription_idempotent() {
        UUID resourceId = UUID.randomUUID();
        period.reserve();
        ServiceUsageRecord record = ServiceUsageRecord.reserveSubscription(
                memberId, "document-coaching", ResourceType.DOCUMENT, resourceId, usagePeriodId);
        when(usageRecordRepository.findByResourceTypeAndResourceIdForUpdate(ResourceType.DOCUMENT, resourceId))
                .thenReturn(Optional.of(record));
        when(usagePeriodRepository.findByUsagePeriodIdForUpdate(usagePeriodId))
                .thenReturn(Optional.of(period));

        service.consume(ResourceType.DOCUMENT, resourceId);
        service.consume(ResourceType.DOCUMENT, resourceId);

        assertThat(period.getReservedCount()).isZero();
        assertThat(period.getUsedCount()).isEqualTo(1);
        verify(usagePeriodRepository, times(1)).findByUsagePeriodIdForUpdate(usagePeriodId);
    }

    @Test
    @DisplayName("SUBSCRIPTION release — reserved만 감소, 재호출 멱등")
    void release_subscription_idempotent() {
        UUID resourceId = UUID.randomUUID();
        period.reserve();
        ServiceUsageRecord record = ServiceUsageRecord.reserveSubscription(
                memberId, "document-coaching", ResourceType.DOCUMENT, resourceId, usagePeriodId);
        when(usageRecordRepository.findByResourceTypeAndResourceIdForUpdate(ResourceType.DOCUMENT, resourceId))
                .thenReturn(Optional.of(record));
        when(usagePeriodRepository.findByUsagePeriodIdForUpdate(usagePeriodId))
                .thenReturn(Optional.of(period));

        service.release(ResourceType.DOCUMENT, resourceId);
        service.release(ResourceType.DOCUMENT, resourceId);

        assertThat(period.getReservedCount()).isZero();
        assertThat(period.getUsedCount()).isZero();
        verify(usagePeriodRepository, times(1)).findByUsagePeriodIdForUpdate(usagePeriodId);
    }

    private void stubPremiumReservation(UUID resourceId) {
        when(usageRecordRepository.findByResourceTypeAndResourceId(any(), eq(resourceId)))
                .thenReturn(Optional.empty());
        when(entitlementRepository.findByMemberIdAndProductCodeForUpdate(
                memberId, "document-coaching")).thenReturn(Optional.of(entitlement));
        when(subscriptionRepository.findBySubscriptionIdAndMemberIdForUpdate(subscriptionId, memberId))
                .thenReturn(Optional.of(subscription));
        when(usagePeriodRepository.findCurrentPeriodForUpdate(eq(subscriptionId), any()))
                .thenReturn(Optional.of(period));
        when(usageRecordRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
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
