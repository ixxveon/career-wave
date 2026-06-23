package kr.co.carrer.user.billing.entity;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SubscriptionUsagePeriodTest {

    private static final ZonedDateTime START = ZonedDateTime.now(ZoneId.of("Asia/Seoul"));
    private static final ZonedDateTime END = START.plusMonths(1);

    private SubscriptionUsagePeriod newPeriod(int limit) {
        return SubscriptionUsagePeriod.create(UUID.randomUUID(), "interview", START, END, limit);
    }

    @Nested
    @DisplayName("create() 검증")
    class Create {

        @Test
        @DisplayName("정상 생성 시 초기값 확인")
        void create_initialState() {
            SubscriptionUsagePeriod p = newPeriod(10);

            assertThat(p.getLimitCount()).isEqualTo(10);
            assertThat(p.getUsedCount()).isEqualTo(0);
            assertThat(p.getReservedCount()).isEqualTo(0);
            assertThat(p.remaining()).isEqualTo(10);
            assertThat(p.canReserve()).isTrue();
        }

        @Test
        @DisplayName("limitCount=0 이면 USAGE_PERIOD_INVALID_LIMIT 예외")
        void create_limitZero_throws() {
            assertThatThrownBy(() -> newPeriod(0))
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.USAGE_PERIOD_INVALID_LIMIT);
        }

        @Test
        @DisplayName("limitCount<0 이면 USAGE_PERIOD_INVALID_LIMIT 예외")
        void create_limitNegative_throws() {
            assertThatThrownBy(() -> newPeriod(-1))
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.USAGE_PERIOD_INVALID_LIMIT);
        }

        @Test
        @DisplayName("periodStart >= periodEnd 이면 USAGE_PERIOD_INVALID_RANGE 예외")
        void create_invalidDateRange_throws() {
            assertThatThrownBy(() -> SubscriptionUsagePeriod.create(
                    UUID.randomUUID(), "interview", END, START, 5))
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.USAGE_PERIOD_INVALID_RANGE);
        }
    }

    @Nested
    @DisplayName("reserve() — 예약")
    class Reserve {

        @Test
        @DisplayName("여유 있을 때 예약 성공, reservedCount+1")
        void reserve_success() {
            SubscriptionUsagePeriod p = newPeriod(3);
            p.reserve();

            assertThat(p.getReservedCount()).isEqualTo(1);
            assertThat(p.remaining()).isEqualTo(2);
        }

        @Test
        @DisplayName("한도 소진 시 MONTHLY_LIMIT_EXCEEDED 예외")
        void reserve_exhausted_throws() {
            SubscriptionUsagePeriod p = newPeriod(1);
            p.reserve();

            assertThatThrownBy(p::reserve)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.MONTHLY_LIMIT_EXCEEDED);
        }

        @Test
        @DisplayName("used+reserved = limit 일 때 추가 예약 시 MONTHLY_LIMIT_EXCEEDED 예외")
        void reserve_usedAndReservedFillLimit_throws() {
            SubscriptionUsagePeriod p = newPeriod(2);
            p.reserve();
            p.consume();
            p.reserve();

            assertThatThrownBy(p::reserve)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.MONTHLY_LIMIT_EXCEEDED);
        }
    }

    @Nested
    @DisplayName("consume() — 확정")
    class Consume {

        @Test
        @DisplayName("예약 후 확정 성공, reservedCount-1 usedCount+1")
        void consume_success() {
            SubscriptionUsagePeriod p = newPeriod(5);
            p.reserve();
            p.consume();

            assertThat(p.getReservedCount()).isEqualTo(0);
            assertThat(p.getUsedCount()).isEqualTo(1);
        }

        @Test
        @DisplayName("예약 없이 확정 시 SERVICE_USAGE_NOT_RESERVED 예외")
        void consume_withoutReservation_throws() {
            SubscriptionUsagePeriod p = newPeriod(5);
            assertThatThrownBy(p::consume)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.SERVICE_USAGE_NOT_RESERVED);
        }
    }

    @Nested
    @DisplayName("releaseReservation() — 예약 해제")
    class Release {

        @Test
        @DisplayName("예약 후 해제 성공, reservedCount-1")
        void release_success() {
            SubscriptionUsagePeriod p = newPeriod(5);
            p.reserve();
            p.releaseReservation();

            assertThat(p.getReservedCount()).isEqualTo(0);
            assertThat(p.getUsedCount()).isEqualTo(0);
        }

        @Test
        @DisplayName("예약 없이 해제 시 SERVICE_USAGE_NOT_RESERVED 예외")
        void release_withoutReservation_throws() {
            SubscriptionUsagePeriod p = newPeriod(5);
            assertThatThrownBy(p::releaseReservation)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.SERVICE_USAGE_NOT_RESERVED);
        }

        @Test
        @DisplayName("같은 예약을 두 번 해제 시 SERVICE_USAGE_NOT_RESERVED 예외 — 중복 해제 방지")
        void release_twice_throws() {
            SubscriptionUsagePeriod p = newPeriod(5);
            p.reserve();
            p.releaseReservation();

            assertThatThrownBy(p::releaseReservation)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.SERVICE_USAGE_NOT_RESERVED);
        }
    }

    @Nested
    @DisplayName("remaining() 계산")
    class Remaining {

        @Test
        @DisplayName("used+reserved 합계로 remaining이 정확히 계산된다")
        void remaining_calculation() {
            SubscriptionUsagePeriod p = newPeriod(10);
            p.reserve();
            p.reserve();
            p.consume();

            assertThat(p.getUsedCount()).isEqualTo(1);
            assertThat(p.getReservedCount()).isEqualTo(1);
            assertThat(p.remaining()).isEqualTo(8);
        }
    }
}
