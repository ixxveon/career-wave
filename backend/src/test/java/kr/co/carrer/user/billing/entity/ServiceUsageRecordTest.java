package kr.co.carrer.user.billing.entity;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import kr.co.carrer.user.billing.type.ResourceType;
import kr.co.carrer.user.billing.type.UsageSource;
import kr.co.carrer.user.billing.type.UsageStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ServiceUsageRecordTest {

    private ServiceUsageRecord newFreeRecord() {
        return ServiceUsageRecord.reserveFree(
                UUID.randomUUID(), "interview", ResourceType.INTERVIEW_SESSION, UUID.randomUUID());
    }

    @Nested
    @DisplayName("reserveFree() 초기 상태")
    class ReserveFree {

        @Test
        @DisplayName("FREE, RESERVED로 생성된다")
        void reserveFree_initialState() {
            ServiceUsageRecord r = newFreeRecord();

            assertThat(r.getUsageSource()).isEqualTo(UsageSource.FREE);
            assertThat(r.getUsageStatus()).isEqualTo(UsageStatus.RESERVED);
            assertThat(r.getConsumedAt()).isNull();
            assertThat(r.getReleasedAt()).isNull();
        }
    }

    @Nested
    @DisplayName("consume() — 사용 확정")
    class Consume {

        @Test
        @DisplayName("RESERVED → CONSUMED, consumedAt 설정")
        void consume_fromReserved_success() {
            ServiceUsageRecord r = newFreeRecord();
            r.consume();

            assertThat(r.getUsageStatus()).isEqualTo(UsageStatus.CONSUMED);
            assertThat(r.getConsumedAt()).isNotNull();
        }

        @Test
        @DisplayName("CONSUMED 상태에서 재확정 시 USAGE_RECORD_INVALID_STATE 예외 — 이중 차감 방지")
        void consume_fromConsumed_throws() {
            ServiceUsageRecord r = newFreeRecord();
            r.consume();

            assertThatThrownBy(r::consume)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.USAGE_RECORD_INVALID_STATE);
        }

        @Test
        @DisplayName("RELEASED 상태에서 확정 시 USAGE_RECORD_INVALID_STATE 예외")
        void consume_fromReleased_throws() {
            ServiceUsageRecord r = newFreeRecord();
            r.release();

            assertThatThrownBy(r::consume)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.USAGE_RECORD_INVALID_STATE);
        }
    }

    @Nested
    @DisplayName("release() — 예약 해제")
    class Release {

        @Test
        @DisplayName("RESERVED → RELEASED, releasedAt 설정")
        void release_fromReserved_success() {
            ServiceUsageRecord r = newFreeRecord();
            r.release();

            assertThat(r.getUsageStatus()).isEqualTo(UsageStatus.RELEASED);
            assertThat(r.getReleasedAt()).isNotNull();
        }

        @Test
        @DisplayName("CONSUMED 상태에서 해제 시 USAGE_RECORD_INVALID_STATE 예외 — 이미 차감된 항목 복구 금지")
        void release_fromConsumed_throws() {
            ServiceUsageRecord r = newFreeRecord();
            r.consume();

            assertThatThrownBy(r::release)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.USAGE_RECORD_INVALID_STATE);
        }

        @Test
        @DisplayName("RELEASED 상태에서 재해제 시 USAGE_RECORD_INVALID_STATE 예외")
        void release_fromReleased_throws() {
            ServiceUsageRecord r = newFreeRecord();
            r.release();

            assertThatThrownBy(r::release)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.USAGE_RECORD_INVALID_STATE);
        }
    }
}
