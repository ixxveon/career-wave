package kr.co.carrer.user.billing.service;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.dto.BillingDTO;
import kr.co.carrer.user.billing.entity.Subscription;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import kr.co.carrer.user.billing.repository.SubscriptionRepository;
import kr.co.carrer.user.billing.service.impl.CancelSubscriptionServiceImpl;
import kr.co.carrer.user.billing.type.SubscriptionStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class CancelSubscriptionServiceTest {

    @Mock SubscriptionRepository subscriptionRepository;

    private CancelSubscriptionServiceImpl service;

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private final UUID memberId = UUID.randomUUID();
    private final UUID subscriptionId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new CancelSubscriptionServiceImpl(subscriptionRepository);
    }

    @Test
    @DisplayName("ACTIVE 구독 해지 — CANCEL_SCHEDULED 전이, cancelScheduledAt 기록")
    void cancel_active_scheduled() {
        Subscription sub = activeSubscription();
        given(subscriptionRepository.findBySubscriptionIdAndMemberIdForUpdate(subscriptionId, memberId))
                .willReturn(Optional.of(sub));

        BillingDTO.ResponseCancelSubscription result = service.cancel(memberId, subscriptionId);

        assertThat(result.status()).isEqualTo("CANCEL_SCHEDULED");
        assertThat(result.subscriptionId()).isEqualTo(subscriptionId);
        assertThat(result.currentPeriodEnd()).isNotNull();
        assertThat(result.cancelScheduledAt()).isNotNull();
    }

    @Test
    @DisplayName("구독 없음 또는 타인 소유 — SUBSCRIPTION_NOT_FOUND")
    void cancel_notFound_throws() {
        given(subscriptionRepository.findBySubscriptionIdAndMemberIdForUpdate(subscriptionId, memberId))
                .willReturn(Optional.empty());

        assertThatThrownBy(() -> service.cancel(memberId, subscriptionId))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(BillingErrorCode.SUBSCRIPTION_NOT_FOUND));
    }

    @ParameterizedTest
    @EnumSource(value = SubscriptionStatus.class,
            names = {"CANCEL_SCHEDULED", "PAYMENT_FAILED", "EXPIRED", "REFUND_PENDING", "REFUNDED"})
    @DisplayName("ACTIVE 외 상태 해지 시도 — SUBSCRIPTION_NOT_CANCELABLE")
    void cancel_nonActiveStatus_throws(SubscriptionStatus status) {
        Subscription sub = subscriptionInStatus(status);
        given(subscriptionRepository.findBySubscriptionIdAndMemberIdForUpdate(subscriptionId, memberId))
                .willReturn(Optional.of(sub));

        assertThatThrownBy(() -> service.cancel(memberId, subscriptionId))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(BillingErrorCode.SUBSCRIPTION_NOT_CANCELABLE));
    }

    @Test
    @DisplayName("해지 후 autoRenew=false — 자동결제 차단")
    void cancel_active_autoRenewFalse() {
        Subscription sub = activeSubscription();
        given(subscriptionRepository.findBySubscriptionIdAndMemberIdForUpdate(subscriptionId, memberId))
                .willReturn(Optional.of(sub));

        service.cancel(memberId, subscriptionId);

        assertThat(sub.isAutoRenew()).isFalse();
    }

    @Test
    @DisplayName("중복 해지 요청 — 두 번째 호출 시 SUBSCRIPTION_NOT_CANCELABLE")
    void cancel_duplicate_throws() {
        Subscription sub = activeSubscription();
        given(subscriptionRepository.findBySubscriptionIdAndMemberIdForUpdate(subscriptionId, memberId))
                .willReturn(Optional.of(sub));

        service.cancel(memberId, subscriptionId);

        // 두 번째 cancel — 이미 CANCEL_SCHEDULED
        assertThatThrownBy(() -> service.cancel(memberId, subscriptionId))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(BillingErrorCode.SUBSCRIPTION_NOT_CANCELABLE));
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private Subscription activeSubscription() {
        ZonedDateTime now = ZonedDateTime.now(KST);
        Subscription s = Subscription.create(memberId, 1L, now.minusDays(15), now.plusDays(15));
        setField(s, "subscriptionId", subscriptionId);
        return s;
    }

    private Subscription subscriptionInStatus(SubscriptionStatus status) {
        ZonedDateTime now = ZonedDateTime.now(KST);
        Subscription s = Subscription.create(memberId, 1L, now.minusDays(15), now.plusDays(15));
        setField(s, "subscriptionId", subscriptionId);
        setField(s, "subscriptionStatus", status);
        return s;
    }

    private void setField(Object target, String name, Object value) {
        try {
            Class<?> clazz = target.getClass();
            while (clazz != null) {
                try {
                    Field field = clazz.getDeclaredField(name);
                    field.setAccessible(true);
                    field.set(target, value);
                    return;
                } catch (NoSuchFieldException e) {
                    clazz = clazz.getSuperclass();
                }
            }
            throw new NoSuchFieldException(name);
        } catch (ReflectiveOperationException e) {
            throw new AssertionError(e);
        }
    }
}
