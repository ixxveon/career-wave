package kr.co.carrer.user.billing.entity;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
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
    @DisplayName("create() 검증")
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

        @Test
        @DisplayName("periodStart >= periodEnd 이면 IllegalArgumentException")
        void create_invalidDateRange_throws() {
            assertThatThrownBy(() -> Subscription.create(UUID.randomUUID(), 1L, NEXT_MONTH, NOW))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("periodStart null이면 IllegalArgumentException")
        void create_nullPeriodStart_throws() {
            assertThatThrownBy(() -> Subscription.create(UUID.randomUUID(), 1L, null, NEXT_MONTH))
                    .isInstanceOf(IllegalArgumentException.class);
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
        @DisplayName("PAYMENT_FAILED 상태에서 해지 시 SUBSCRIPTION_NOT_CANCELABLE 예외")
        void scheduleCancel_fromPaymentFailed_throws() {
            Subscription s = newActive();
            s.markPaymentFailed();
            assertThatThrownBy(s::scheduleCancel)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.SUBSCRIPTION_NOT_CANCELABLE);
        }

        @Test
        @DisplayName("EXPIRED 상태에서 해지 시 SUBSCRIPTION_NOT_CANCELABLE 예외")
        void scheduleCancel_fromExpired_throws() {
            Subscription s = newActive();
            s.scheduleCancel();
            s.expire();
            assertThatThrownBy(s::scheduleCancel)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.SUBSCRIPTION_NOT_CANCELABLE);
        }
    }

    @Nested
    @DisplayName("markPaymentFailed() — 결제 실패 처리")
    class MarkPaymentFailed {

        @Test
        @DisplayName("ACTIVE → PAYMENT_FAILED, paymentFailedAt 최초 실패 시각 기록")
        void markPaymentFailed_fromActive_setsStatusAndTimestamp() {
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

        @Test
        @DisplayName("EXPIRED 상태에서 결제 실패 전환 시 SUBSCRIPTION_INVALID_TRANSITION 예외")
        void markPaymentFailed_fromExpired_throws() {
            Subscription s = newActive();
            s.scheduleCancel();
            s.expire();
            assertThatThrownBy(s::markPaymentFailed)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.SUBSCRIPTION_INVALID_TRANSITION);
        }

        @Test
        @DisplayName("REFUNDED 상태에서 결제 실패 전환 시 SUBSCRIPTION_INVALID_TRANSITION 예외")
        void markPaymentFailed_fromRefunded_throws() {
            Subscription s = newActive();
            s.markRefundPending();
            s.markRefunded();
            assertThatThrownBy(s::markPaymentFailed)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.SUBSCRIPTION_INVALID_TRANSITION);
        }
    }

    @Nested
    @DisplayName("incrementRetryCount() — 재시도 횟수")
    class IncrementRetryCount {

        @Test
        @DisplayName("PAYMENT_FAILED 상태에서 최대 횟수(2)까지 증가 허용")
        void incrementRetryCount_upToMax_success() {
            Subscription s = newActive();
            s.markPaymentFailed();
            s.incrementRetryCount();
            s.incrementRetryCount();

            assertThat(s.getRetryCount()).isEqualTo(2);
        }

        @Test
        @DisplayName("ACTIVE 상태에서 증가 시 SUBSCRIPTION_INVALID_TRANSITION 예외 — PAYMENT_FAILED 전용")
        void incrementRetryCount_fromActive_throws() {
            Subscription s = newActive();
            assertThatThrownBy(s::incrementRetryCount)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.SUBSCRIPTION_INVALID_TRANSITION);
        }

        @Test
        @DisplayName("retryCount가 2인 상태에서 추가 증가 시 SUBSCRIPTION_INVALID_TRANSITION 예외")
        void incrementRetryCount_overMax_throws() {
            Subscription s = newActive();
            s.markPaymentFailed();
            s.incrementRetryCount();
            s.incrementRetryCount();
            assertThatThrownBy(s::incrementRetryCount)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.SUBSCRIPTION_INVALID_TRANSITION);
        }
    }

    @Nested
    @DisplayName("expire() — 구독 만료")
    class Expire {

        @Test
        @DisplayName("CANCEL_SCHEDULED 상태에서 expire() 성공 — 해지 예약 기간 종료")
        void expire_fromCancelScheduled_success() {
            Subscription s = newActive();
            s.scheduleCancel();
            s.expire();

            assertThat(s.getSubscriptionStatus()).isEqualTo(SubscriptionStatus.EXPIRED);
            assertThat(s.isAutoRenew()).isFalse();
            assertThat(s.getNextBillingAt()).isNull();
            assertThat(s.getCancelledAt()).isNotNull();
        }

        @Test
        @DisplayName("PAYMENT_FAILED 상태에서 expire() 성공 — 최종 재시도 실패 후 만료")
        void expire_fromPaymentFailed_success() {
            Subscription s = newActive();
            s.markPaymentFailed();
            s.expire();

            assertThat(s.getSubscriptionStatus()).isEqualTo(SubscriptionStatus.EXPIRED);
            assertThat(s.isAutoRenew()).isFalse();
        }

        @Test
        @DisplayName("ACTIVE 상태에서 expire() 시 SUBSCRIPTION_INVALID_TRANSITION 예외 — 직접 만료 금지")
        void expire_fromActive_throws() {
            Subscription s = newActive();
            assertThatThrownBy(s::expire)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.SUBSCRIPTION_INVALID_TRANSITION);
        }

        @Test
        @DisplayName("REFUND_PENDING 상태에서 expire() 시 SUBSCRIPTION_INVALID_TRANSITION 예외")
        void expire_fromRefundPending_throws() {
            Subscription s = newActive();
            s.markRefundPending();
            assertThatThrownBy(s::expire)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.SUBSCRIPTION_INVALID_TRANSITION);
        }

        @Test
        @DisplayName("REFUNDED 상태에서 expire() 시 SUBSCRIPTION_INVALID_TRANSITION 예외")
        void expire_fromRefunded_throws() {
            Subscription s = newActive();
            s.markRefundPending();
            s.markRefunded();
            assertThatThrownBy(s::expire)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.SUBSCRIPTION_INVALID_TRANSITION);
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
        @DisplayName("PAYMENT_FAILED 상태에서 갱신 성공 — 재시도 성공 시 복구, autoRenew=true")
        void renewPeriod_fromPaymentFailed_success() {
            Subscription s = newActive();
            s.markPaymentFailed();
            s.renewPeriod(NEXT_MONTH, NEXT_MONTH.plusMonths(1));

            assertThat(s.getSubscriptionStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
            assertThat(s.isAutoRenew()).isTrue();
        }

        @Test
        @DisplayName("EXPIRED 상태에서 갱신 시 SUBSCRIPTION_INVALID_TRANSITION 예외")
        void renewPeriod_fromExpired_throws() {
            Subscription s = newActive();
            s.scheduleCancel();
            s.expire();
            assertThatThrownBy(() -> s.renewPeriod(NEXT_MONTH, NEXT_MONTH.plusMonths(1)))
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.SUBSCRIPTION_INVALID_TRANSITION);
        }

        @Test
        @DisplayName("CANCEL_SCHEDULED 상태에서 갱신 시 SUBSCRIPTION_INVALID_TRANSITION 예외")
        void renewPeriod_fromCancelScheduled_throws() {
            Subscription s = newActive();
            s.scheduleCancel();
            assertThatThrownBy(() -> s.renewPeriod(NEXT_MONTH, NEXT_MONTH.plusMonths(1)))
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.SUBSCRIPTION_INVALID_TRANSITION);
        }

        @Test
        @DisplayName("start >= end 이면 IllegalArgumentException")
        void renewPeriod_invalidRange_throws() {
            Subscription s = newActive();
            assertThatThrownBy(() -> s.renewPeriod(NEXT_MONTH.plusMonths(1), NEXT_MONTH))
                    .isInstanceOf(IllegalArgumentException.class);
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
        @DisplayName("EXPIRED 상태에서 환불 대기 전환 시 SUBSCRIPTION_INVALID_TRANSITION 예외")
        void markRefundPending_fromExpired_throws() {
            Subscription s = newActive();
            s.scheduleCancel();
            s.expire();
            assertThatThrownBy(s::markRefundPending)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.SUBSCRIPTION_INVALID_TRANSITION);
        }

        @Test
        @DisplayName("ACTIVE 상태에서 환불 완료 전환 시 SUBSCRIPTION_INVALID_TRANSITION 예외 — REFUND_PENDING 거치지 않음 금지")
        void markRefunded_fromActive_throws() {
            Subscription s = newActive();
            assertThatThrownBy(s::markRefunded)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.SUBSCRIPTION_INVALID_TRANSITION);
        }
    }
}
