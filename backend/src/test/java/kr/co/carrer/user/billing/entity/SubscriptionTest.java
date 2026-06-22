package kr.co.carrer.user.billing.entity;

import kr.co.carrer.user.billing.type.SubscriptionStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.ZonedDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SubscriptionTest {

    private static final ZonedDateTime NOW = ZonedDateTime.now();
    private static final ZonedDateTime NEXT_MONTH = NOW.plusMonths(1);

    private Subscription newActive() {
        return Subscription.create(UUID.randomUUID(), 1L, NOW, NEXT_MONTH);
    }

    @Nested
    @DisplayName("create() 초기 상태")
    class Create {

        @Test
        @DisplayName("ACTIVE, autoRenew=true, retryCount=0으로 생성된다")
        void create_initialState() {
            Subscription s = newActive();

            assertThat(s.getSubscriptionStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
            assertThat(s.isAutoRenew()).isTrue();
            assertThat(s.getRetryCount()).isEqualTo(0);
            assertThat(s.getPaymentFailedAt()).isNull();
            assertThat(s.getCancelScheduledAt()).isNull();
            assertThat(s.getNextBillingAt()).isEqualTo(NEXT_MONTH);
        }
    }

    @Nested
    @DisplayName("scheduleCancel() — 해지 예약")
    class ScheduleCancel {

        @Test
        @DisplayName("ACTIVE → CANCEL_SCHEDULED, autoRenew=false, cancelScheduledAt 설정")
        void scheduleCancel_fromActive_success() {
            Subscription s = newActive();
            s.scheduleCancel();

            assertThat(s.getSubscriptionStatus()).isEqualTo(SubscriptionStatus.CANCEL_SCHEDULED);
            assertThat(s.isAutoRenew()).isFalse();
            assertThat(s.getCancelScheduledAt()).isNotNull();
        }

        @Test
        @DisplayName("PAYMENT_FAILED 상태에서 해지 시 예외 발생")
        void scheduleCancel_fromPaymentFailed_throws() {
            Subscription s = newActive();
            s.markPaymentFailed();
            assertThatThrownBy(s::scheduleCancel).isInstanceOf(IllegalStateException.class);
        }

        @Test
        @DisplayName("EXPIRED 상태에서 해지 시 예외 발생")
        void scheduleCancel_fromExpired_throws() {
            Subscription s = newActive();
            s.expire();
            assertThatThrownBy(s::scheduleCancel).isInstanceOf(IllegalStateException.class);
        }
    }

    @Nested
    @DisplayName("markPaymentFailed() — 결제 실패 처리")
    class MarkPaymentFailed {

        @Test
        @DisplayName("PAYMENT_FAILED로 전환, paymentFailedAt 최초 실패 시각 기록")
        void markPaymentFailed_setsStatusAndTimestamp() {
            Subscription s = newActive();
            s.markPaymentFailed();

            assertThat(s.getSubscriptionStatus()).isEqualTo(SubscriptionStatus.PAYMENT_FAILED);
            assertThat(s.getPaymentFailedAt()).isNotNull();
        }

        @Test
        @DisplayName("autoRenew는 true를 유지 — 재시도 스케줄러가 사용하는 조건")
        void markPaymentFailed_autoRenewRemainsTrue() {
            Subscription s = newActive();
            s.markPaymentFailed();

            assertThat(s.isAutoRenew()).isTrue();
        }

        @Test
        @DisplayName("재시도 실패 시 paymentFailedAt을 덮어쓰지 않음 — 최초 실패 시각 보존")
        void markPaymentFailed_doesNotOverwritePaymentFailedAt() {
            Subscription s = newActive();
            s.markPaymentFailed();
            ZonedDateTime firstFailedAt = s.getPaymentFailedAt();

            s.markPaymentFailed();

            assertThat(s.getPaymentFailedAt()).isEqualTo(firstFailedAt);
        }
    }

    @Nested
    @DisplayName("expire() — 구독 만료")
    class Expire {

        @Test
        @DisplayName("EXPIRED 전환, autoRenew=false, nextBillingAt=null, cancelledAt 설정")
        void expire_setsCorrectState() {
            Subscription s = newActive();
            s.expire();

            assertThat(s.getSubscriptionStatus()).isEqualTo(SubscriptionStatus.EXPIRED);
            assertThat(s.isAutoRenew()).isFalse();
            assertThat(s.getNextBillingAt()).isNull();
            assertThat(s.getCancelledAt()).isNotNull();
        }
    }

    @Nested
    @DisplayName("renewPeriod() — 기간 갱신")
    class RenewPeriod {

        @Test
        @DisplayName("ACTIVE 상태에서 갱신 성공, 새 기간·nextBillingAt 설정, retryCount 초기화")
        void renewPeriod_fromActive_success() {
            Subscription s = newActive();
            ZonedDateTime newStart = NEXT_MONTH;
            ZonedDateTime newEnd = NEXT_MONTH.plusMonths(1);
            s.renewPeriod(newStart, newEnd);

            assertThat(s.getSubscriptionStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
            assertThat(s.getCurrentPeriodStart()).isEqualTo(newStart);
            assertThat(s.getCurrentPeriodEnd()).isEqualTo(newEnd);
            assertThat(s.getNextBillingAt()).isEqualTo(newEnd);
            assertThat(s.getRetryCount()).isEqualTo(0);
            assertThat(s.getPaymentFailedAt()).isNull();
        }

        @Test
        @DisplayName("PAYMENT_FAILED 상태에서 갱신 성공 — 재시도 성공 시 복구")
        void renewPeriod_fromPaymentFailed_success() {
            Subscription s = newActive();
            s.markPaymentFailed();
            s.renewPeriod(NEXT_MONTH, NEXT_MONTH.plusMonths(1));

            assertThat(s.getSubscriptionStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
            assertThat(s.isAutoRenew()).isTrue();
        }

        @Test
        @DisplayName("EXPIRED 상태에서 갱신 시 예외 발생")
        void renewPeriod_fromExpired_throws() {
            Subscription s = newActive();
            s.expire();
            assertThatThrownBy(() -> s.renewPeriod(NEXT_MONTH, NEXT_MONTH.plusMonths(1)))
                    .isInstanceOf(IllegalStateException.class);
        }

        @Test
        @DisplayName("CANCEL_SCHEDULED 상태에서 갱신 시 예외 발생")
        void renewPeriod_fromCancelScheduled_throws() {
            Subscription s = newActive();
            s.scheduleCancel();
            assertThatThrownBy(() -> s.renewPeriod(NEXT_MONTH, NEXT_MONTH.plusMonths(1)))
                    .isInstanceOf(IllegalStateException.class);
        }
    }

    @Nested
    @DisplayName("markRefundPending() / markRefunded() — 환불 흐름")
    class RefundFlow {

        @Test
        @DisplayName("ACTIVE → REFUND_PENDING, autoRenew=false")
        void markRefundPending_fromActive_success() {
            Subscription s = newActive();
            s.markRefundPending();

            assertThat(s.getSubscriptionStatus()).isEqualTo(SubscriptionStatus.REFUND_PENDING);
            assertThat(s.isAutoRenew()).isFalse();
        }

        @Test
        @DisplayName("REFUND_PENDING → REFUNDED")
        void markRefunded_fromRefundPending_success() {
            Subscription s = newActive();
            s.markRefundPending();
            s.markRefunded();

            assertThat(s.getSubscriptionStatus()).isEqualTo(SubscriptionStatus.REFUNDED);
        }

        @Test
        @DisplayName("EXPIRED 상태에서 환불 대기 전환 시 예외 발생")
        void markRefundPending_fromExpired_throws() {
            Subscription s = newActive();
            s.expire();
            assertThatThrownBy(s::markRefundPending).isInstanceOf(IllegalStateException.class);
        }

        @Test
        @DisplayName("ACTIVE 상태에서 환불 완료 전환 시 예외 발생 — REFUND_PENDING 거치지 않음 금지")
        void markRefunded_fromActive_throws() {
            Subscription s = newActive();
            assertThatThrownBy(s::markRefunded).isInstanceOf(IllegalStateException.class);
        }
    }
}
