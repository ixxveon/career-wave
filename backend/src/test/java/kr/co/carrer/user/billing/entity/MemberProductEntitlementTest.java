package kr.co.carrer.user.billing.entity;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import kr.co.carrer.user.billing.type.FreeUsageStatus;
import kr.co.carrer.user.billing.type.PlanType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MemberProductEntitlementTest {

    private MemberProductEntitlement newFree() {
        return MemberProductEntitlement.createFree(UUID.randomUUID(), "interview");
    }

    @Nested
    @DisplayName("createFree() 초기 상태")
    class Create {

        @Test
        @DisplayName("FREE, AVAILABLE, freeRemaining=1로 생성된다")
        void createFree_initialState() {
            MemberProductEntitlement e = newFree();

            assertThat(e.getPlanType()).isEqualTo(PlanType.FREE);
            assertThat(e.getFreeUsageStatus()).isEqualTo(FreeUsageStatus.AVAILABLE);
            assertThat(e.getFreeRemaining()).isEqualTo(1);
            assertThat(e.getActiveSubscriptionId()).isNull();
        }
    }

    @Nested
    @DisplayName("reserveFree() — 무료 이용권 예약")
    class ReserveFree {

        @Test
        @DisplayName("AVAILABLE → RESERVED 전이 성공")
        void reserveFree_fromAvailable_success() {
            MemberProductEntitlement e = newFree();
            e.reserveFree();
            assertThat(e.getFreeUsageStatus()).isEqualTo(FreeUsageStatus.RESERVED);
        }

        @Test
        @DisplayName("RESERVED 상태에서 예약 시 ENTITLEMENT_INVALID_STATE 예외")
        void reserveFree_fromReserved_throws() {
            MemberProductEntitlement e = newFree();
            e.reserveFree();
            assertThatThrownBy(e::reserveFree)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.ENTITLEMENT_INVALID_STATE);
        }

        @Test
        @DisplayName("USED 상태에서 예약 시 ENTITLEMENT_INVALID_STATE 예외")
        void reserveFree_fromUsed_throws() {
            MemberProductEntitlement e = newFree();
            e.reserveFree();
            e.consumeFree();
            assertThatThrownBy(e::reserveFree)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.ENTITLEMENT_INVALID_STATE);
        }

        @Test
        @DisplayName("FORFEITED 상태에서 예약 시 ENTITLEMENT_INVALID_STATE 예외")
        void reserveFree_fromForfeited_throws() {
            MemberProductEntitlement e = newFree();
            e.forfeitFree();
            assertThatThrownBy(e::reserveFree)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.ENTITLEMENT_INVALID_STATE);
        }
    }

    @Nested
    @DisplayName("consumeFree() — 무료 이용권 확정")
    class ConsumeFree {

        @Test
        @DisplayName("RESERVED → USED, freeRemaining=0")
        void consumeFree_fromReserved_success() {
            MemberProductEntitlement e = newFree();
            e.reserveFree();
            e.consumeFree();

            assertThat(e.getFreeUsageStatus()).isEqualTo(FreeUsageStatus.USED);
            assertThat(e.getFreeRemaining()).isEqualTo(0);
        }

        @Test
        @DisplayName("AVAILABLE 상태에서 확정 시 ENTITLEMENT_INVALID_STATE 예외")
        void consumeFree_fromAvailable_throws() {
            MemberProductEntitlement e = newFree();
            assertThatThrownBy(e::consumeFree)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.ENTITLEMENT_INVALID_STATE);
        }

        @Test
        @DisplayName("USED 상태에서 다시 확정 시 ENTITLEMENT_INVALID_STATE 예외 — 이중 차감 방지")
        void consumeFree_fromUsed_throws() {
            MemberProductEntitlement e = newFree();
            e.reserveFree();
            e.consumeFree();
            assertThatThrownBy(e::consumeFree)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.ENTITLEMENT_INVALID_STATE);
        }
    }

    @Nested
    @DisplayName("releaseFreeReservation() — 무료 이용권 예약 해제")
    class ReleaseFreeReservation {

        @Test
        @DisplayName("RESERVED → AVAILABLE 복구")
        void release_fromReserved_success() {
            MemberProductEntitlement e = newFree();
            e.reserveFree();
            e.releaseFreeReservation();

            assertThat(e.getFreeUsageStatus()).isEqualTo(FreeUsageStatus.AVAILABLE);
        }

        @Test
        @DisplayName("USED 상태에서 해제 시 ENTITLEMENT_INVALID_STATE 예외 — USED를 AVAILABLE로 되돌리기 금지")
        void release_fromUsed_throws() {
            MemberProductEntitlement e = newFree();
            e.reserveFree();
            e.consumeFree();
            assertThatThrownBy(e::releaseFreeReservation)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.ENTITLEMENT_INVALID_STATE);
        }

        @Test
        @DisplayName("AVAILABLE 상태에서 해제 시 ENTITLEMENT_INVALID_STATE 예외")
        void release_fromAvailable_throws() {
            MemberProductEntitlement e = newFree();
            assertThatThrownBy(e::releaseFreeReservation)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.ENTITLEMENT_INVALID_STATE);
        }
    }

    @Nested
    @DisplayName("forfeitFree() — 무료 이용권 포기")
    class ForfeitFree {

        @Test
        @DisplayName("AVAILABLE → FORFEITED, freeRemaining=0")
        void forfeit_fromAvailable_success() {
            MemberProductEntitlement e = newFree();
            e.forfeitFree();

            assertThat(e.getFreeUsageStatus()).isEqualTo(FreeUsageStatus.FORFEITED);
            assertThat(e.getFreeRemaining()).isEqualTo(0);
        }

        @Test
        @DisplayName("USED 상태에서 포기 시 ENTITLEMENT_INVALID_STATE 예외")
        void forfeit_fromUsed_throws() {
            MemberProductEntitlement e = newFree();
            e.reserveFree();
            e.consumeFree();
            assertThatThrownBy(e::forfeitFree)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.ENTITLEMENT_INVALID_STATE);
        }

        @Test
        @DisplayName("RESERVED 상태에서 포기 시 ENTITLEMENT_INVALID_STATE 예외 — 진행 중 작업 보호")
        void forfeit_fromReserved_throws() {
            MemberProductEntitlement e = newFree();
            e.reserveFree();
            assertThatThrownBy(e::forfeitFree)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.ENTITLEMENT_INVALID_STATE);
        }

        @Test
        @DisplayName("FORFEITED 상태에서 재포기 시 ENTITLEMENT_INVALID_STATE 예외")
        void forfeit_fromForfeited_throws() {
            MemberProductEntitlement e = newFree();
            e.forfeitFree();
            assertThatThrownBy(e::forfeitFree)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.ENTITLEMENT_INVALID_STATE);
        }
    }

    @Nested
    @DisplayName("activatePremium() / deactivatePremium()")
    class PremiumTransition {

        @Test
        @DisplayName("activatePremium() — PREMIUM으로 전환, subscriptionId 설정")
        void activatePremium_setsCorrectState() {
            MemberProductEntitlement e = newFree();
            UUID subId = UUID.randomUUID();
            e.activatePremium(subId);

            assertThat(e.getPlanType()).isEqualTo(PlanType.PREMIUM);
            assertThat(e.getActiveSubscriptionId()).isEqualTo(subId);
        }

        @Test
        @DisplayName("activatePremium() — subscriptionId null이면 CustomException")
        void activatePremium_nullSubscriptionId_throws() {
            MemberProductEntitlement e = newFree();
            assertThatThrownBy(() -> e.activatePremium(null))
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.ENTITLEMENT_INVALID_STATE);
        }

        @Test
        @DisplayName("RESERVED 상태에서는 activatePremium() 차단")
        void activatePremium_fromReserved_throws() {
            MemberProductEntitlement e = newFree();
            e.reserveFree();

            assertThatThrownBy(() -> e.activatePremium(UUID.randomUUID()))
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(BillingErrorCode.ENTITLEMENT_INVALID_STATE);
        }

        @Test
        @DisplayName("deactivatePremium() — FREE로 복귀, subscriptionId null")
        void deactivatePremium_setsCorrectState() {
            MemberProductEntitlement e = newFree();
            e.activatePremium(UUID.randomUUID());
            e.deactivatePremium();

            assertThat(e.getPlanType()).isEqualTo(PlanType.FREE);
            assertThat(e.getActiveSubscriptionId()).isNull();
        }
    }
}
