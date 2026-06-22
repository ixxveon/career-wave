package kr.co.carrer.admin.payment.entity;

import kr.co.carrer.admin.payment.exception.AdminPaymentErrorCode;
import kr.co.carrer.admin.payment.type.FailureReason;
import kr.co.carrer.admin.payment.type.PaymentStatus;
import kr.co.carrer.admin.payment.type.PaymentType;
import kr.co.carrer.global.exception.CustomException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.ZonedDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PaymentTest {

    private static final ZonedDateTime NOW = ZonedDateTime.now();

    private Payment newReady() {
        return Payment.createReady(
                UUID.randomUUID(), 1L, null,
                "order-001", "idem-001",
                9900, "KRW",
                PaymentType.MANUAL, 0,
                NOW.plusMinutes(30));
    }

    @Nested
    @DisplayName("createReady() 초기 상태")
    class CreateReady {

        @Test
        @DisplayName("READY 상태로 생성된다")
        void createReady_initialState() {
            Payment p = newReady();

            assertThat(p.getPaymentStatus()).isEqualTo(PaymentStatus.READY);
            assertThat(p.getPaymentKey()).isNull();
            assertThat(p.getApprovedAt()).isNull();
        }

        @Test
        @DisplayName("amount <= 0 이면 CustomException(PAYMENT_INVALID_PARAM)")
        void createReady_zeroAmount_throws() {
            assertThatThrownBy(() -> Payment.createReady(
                    UUID.randomUUID(), 1L, null, "o", "i", 0, "KRW", PaymentType.MANUAL, 0, NOW))
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(AdminPaymentErrorCode.PAYMENT_INVALID_PARAM);
        }

        @Test
        @DisplayName("memberId null이면 CustomException(PAYMENT_INVALID_PARAM)")
        void createReady_nullMemberId_throws() {
            assertThatThrownBy(() -> Payment.createReady(
                    null, 1L, null, "o", "i", 9900, "KRW", PaymentType.MANUAL, 0, NOW))
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(AdminPaymentErrorCode.PAYMENT_INVALID_PARAM);
        }

        @Test
        @DisplayName("planId null이면 CustomException(PAYMENT_INVALID_PARAM)")
        void createReady_nullPlanId_throws() {
            assertThatThrownBy(() -> Payment.createReady(
                    UUID.randomUUID(), null, null, "o", "i", 9900, "KRW", PaymentType.MANUAL, 0, NOW))
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(AdminPaymentErrorCode.PAYMENT_INVALID_PARAM);
        }

        @Test
        @DisplayName("orderId blank이면 CustomException(PAYMENT_INVALID_PARAM)")
        void createReady_blankOrderId_throws() {
            assertThatThrownBy(() -> Payment.createReady(
                    UUID.randomUUID(), 1L, null, "  ", "i", 9900, "KRW", PaymentType.MANUAL, 0, NOW))
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(AdminPaymentErrorCode.PAYMENT_INVALID_PARAM);
        }

        @Test
        @DisplayName("idempotencyKey blank이면 CustomException(PAYMENT_INVALID_PARAM)")
        void createReady_blankIdempotencyKey_throws() {
            assertThatThrownBy(() -> Payment.createReady(
                    UUID.randomUUID(), 1L, null, "o", "", 9900, "KRW", PaymentType.MANUAL, 0, NOW))
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(AdminPaymentErrorCode.PAYMENT_INVALID_PARAM);
        }

        @Test
        @DisplayName("paymentType null이면 CustomException(PAYMENT_INVALID_PARAM)")
        void createReady_nullPaymentType_throws() {
            assertThatThrownBy(() -> Payment.createReady(
                    UUID.randomUUID(), 1L, null, "o", "i", 9900, "KRW", null, 0, NOW))
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(AdminPaymentErrorCode.PAYMENT_INVALID_PARAM);
        }

        @Test
        @DisplayName("attemptSequence 음수이면 CustomException(PAYMENT_INVALID_PARAM)")
        void createReady_negativeAttemptSequence_throws() {
            assertThatThrownBy(() -> Payment.createReady(
                    UUID.randomUUID(), 1L, null, "o", "i", 9900, "KRW", PaymentType.MANUAL, -1, NOW))
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(AdminPaymentErrorCode.PAYMENT_INVALID_PARAM);
        }

        @Test
        @DisplayName("attemptSequence > 2이면 CustomException(PAYMENT_INVALID_PARAM)")
        void createReady_attemptSequenceOverMax_throws() {
            assertThatThrownBy(() -> Payment.createReady(
                    UUID.randomUUID(), 1L, null, "o", "i", 9900, "KRW", PaymentType.MANUAL, 3, NOW))
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(AdminPaymentErrorCode.PAYMENT_INVALID_PARAM);
        }

        @Test
        @DisplayName("AUTO_RENEWAL에 subscriptionId null이면 CustomException(PAYMENT_INVALID_PARAM)")
        void createReady_autoRenewalWithoutSubscriptionId_throws() {
            assertThatThrownBy(() -> Payment.createReady(
                    UUID.randomUUID(), 1L, null, "o", "i", 9900, "KRW",
                    PaymentType.AUTO_RENEWAL, 0, NOW))
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(AdminPaymentErrorCode.PAYMENT_INVALID_PARAM);
        }

        @Test
        @DisplayName("AUTO_RENEWAL에 subscriptionId 있으면 정상 생성")
        void createReady_autoRenewalWithSubscriptionId_success() {
            Payment p = Payment.createReady(
                    UUID.randomUUID(), 1L, UUID.randomUUID(), "o", "i", 9900, "KRW",
                    PaymentType.AUTO_RENEWAL, 0, NOW);
            assertThat(p.getPaymentStatus()).isEqualTo(PaymentStatus.READY);
        }
    }

    @Nested
    @DisplayName("authorize() — READY → AUTHORIZED")
    class Authorize {

        @Test
        @DisplayName("READY 상태에서 authorize() 성공")
        void authorize_fromReady_success() {
            Payment p = newReady();
            p.authorize();
            assertThat(p.getPaymentStatus()).isEqualTo(PaymentStatus.AUTHORIZED);
        }

        @Test
        @DisplayName("AUTHORIZED 상태에서 authorize() 시 PAYMENT_INVALID_STATUS_TRANSITION 예외")
        void authorize_fromAuthorized_throws() {
            Payment p = newReady();
            p.authorize();
            assertThatThrownBy(p::authorize)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(AdminPaymentErrorCode.PAYMENT_INVALID_STATUS_TRANSITION);
        }

        @Test
        @DisplayName("CONFIRMING 상태에서 authorize() 시 PAYMENT_INVALID_STATUS_TRANSITION 예외")
        void authorize_fromConfirming_throws() {
            Payment p = newReady();
            p.authorize();
            p.confirmStarted();
            assertThatThrownBy(p::authorize)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(AdminPaymentErrorCode.PAYMENT_INVALID_STATUS_TRANSITION);
        }
    }

    @Nested
    @DisplayName("confirmStarted() — AUTHORIZED → CONFIRMING")
    class ConfirmStarted {

        @Test
        @DisplayName("AUTHORIZED 상태에서 confirmStarted() 성공")
        void confirmStarted_fromAuthorized_success() {
            Payment p = newReady();
            p.authorize();
            p.confirmStarted();
            assertThat(p.getPaymentStatus()).isEqualTo(PaymentStatus.CONFIRMING);
        }

        @Test
        @DisplayName("READY 상태에서 confirmStarted() 시 PAYMENT_INVALID_STATUS_TRANSITION 예외")
        void confirmStarted_fromReady_throws() {
            Payment p = newReady();
            assertThatThrownBy(p::confirmStarted)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(AdminPaymentErrorCode.PAYMENT_INVALID_STATUS_TRANSITION);
        }
    }

    @Nested
    @DisplayName("paid() — CONFIRMING/RECONCILING → PAID")
    class Paid {

        @Test
        @DisplayName("CONFIRMING 상태에서 paid() 성공, paymentKey·approvedAt 설정")
        void paid_fromConfirming_success() {
            Payment p = newReady();
            p.authorize();
            p.confirmStarted();
            p.paid("tk_key_001", NOW);

            assertThat(p.getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
            assertThat(p.getPaymentKey()).isEqualTo("tk_key_001");
            assertThat(p.getApprovedAt()).isEqualTo(NOW);
        }

        @Test
        @DisplayName("RECONCILING 상태에서 paid() 성공")
        void paid_fromReconciling_success() {
            Payment p = newReady();
            p.authorize();
            p.confirmStarted();
            p.reconciling();
            p.paid("tk_key_002", NOW);

            assertThat(p.getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
        }

        @Test
        @DisplayName("READY 상태에서 paid() 시 PAYMENT_INVALID_STATUS_TRANSITION 예외 — 인증·승인 단계 건너뜀 금지")
        void paid_fromReady_throws() {
            Payment p = newReady();
            assertThatThrownBy(() -> p.paid("key", NOW))
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(AdminPaymentErrorCode.PAYMENT_INVALID_STATUS_TRANSITION);
        }

        @Test
        @DisplayName("paymentKey null이면 CustomException(PAYMENT_INVALID_PARAM)")
        void paid_nullPaymentKey_throws() {
            Payment p = newReady();
            p.authorize();
            p.confirmStarted();
            assertThatThrownBy(() -> p.paid(null, NOW))
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(AdminPaymentErrorCode.PAYMENT_INVALID_PARAM);
        }

        @Test
        @DisplayName("approvedAt null이면 CustomException(PAYMENT_INVALID_PARAM)")
        void paid_nullApprovedAt_throws() {
            Payment p = newReady();
            p.authorize();
            p.confirmStarted();
            assertThatThrownBy(() -> p.paid("tk_key", null))
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(AdminPaymentErrorCode.PAYMENT_INVALID_PARAM;
        }

        @Test
        @DisplayName("이미 PAID 상태에서 다시 paid() 시 PAYMENT_INVALID_STATUS_TRANSITION 예외")
        void paid_fromPaid_throws() {
            Payment p = newReady();
            p.authorize();
            p.confirmStarted();
            p.paid("tk_key", NOW);
            assertThatThrownBy(() -> p.paid("tk_key2", NOW))
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(AdminPaymentErrorCode.PAYMENT_INVALID_STATUS_TRANSITION);
        }
    }

    @Nested
    @DisplayName("fail() — AUTHORIZED/CONFIRMING/RECONCILING → FAILED")
    class Fail {

        @Test
        @DisplayName("AUTHORIZED 상태에서 fail() 성공")
        void fail_fromAuthorized_success() {
            Payment p = newReady();
            p.authorize();
            p.fail(FailureReason.CARD_DECLINED);

            assertThat(p.getPaymentStatus()).isEqualTo(PaymentStatus.FAILED);
            assertThat(p.getFailureReason()).isEqualTo(FailureReason.CARD_DECLINED);
        }

        @Test
        @DisplayName("CONFIRMING 상태에서 fail() 성공")
        void fail_fromConfirming_success() {
            Payment p = newReady();
            p.authorize();
            p.confirmStarted();
            p.fail(FailureReason.TIMEOUT);

            assertThat(p.getPaymentStatus()).isEqualTo(PaymentStatus.FAILED);
        }

        @Test
        @DisplayName("RECONCILING 상태에서 fail() 성공")
        void fail_fromReconciling_success() {
            Payment p = newReady();
            p.authorize();
            p.confirmStarted();
            p.reconciling();
            p.fail(FailureReason.CONFIRM_FAILED);

            assertThat(p.getPaymentStatus()).isEqualTo(PaymentStatus.FAILED);
        }

        @Test
        @DisplayName("READY 상태에서 fail() 시 PAYMENT_INVALID_STATUS_TRANSITION 예외")
        void fail_fromReady_throws() {
            Payment p = newReady();
            assertThatThrownBy(() -> p.fail(FailureReason.UNKNOWN))
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(AdminPaymentErrorCode.PAYMENT_INVALID_STATUS_TRANSITION);
        }

        @Test
        @DisplayName("PAID 상태에서 fail() 시 PAYMENT_INVALID_STATUS_TRANSITION 예외")
        void fail_fromPaid_throws() {
            Payment p = newReady();
            p.authorize();
            p.confirmStarted();
            p.paid("key", NOW);
            assertThatThrownBy(() -> p.fail(FailureReason.UNKNOWN))
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(AdminPaymentErrorCode.PAYMENT_INVALID_STATUS_TRANSITION);
        }

        @Test
        @DisplayName("reason null이면 CustomException(PAYMENT_INVALID_PARAM)")
        void fail_nullReason_throws() {
            Payment p = newReady();
            p.authorize();
            assertThatThrownBy(() -> p.fail(null))
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(AdminPaymentErrorCode.PAYMENT_INVALID_PARAM);
        }
    }

    @Nested
    @DisplayName("reconciling() — CONFIRMING → RECONCILING")
    class Reconciling {

        @Test
        @DisplayName("CONFIRMING 상태에서 reconciling() 성공")
        void reconciling_fromConfirming_success() {
            Payment p = newReady();
            p.authorize();
            p.confirmStarted();
            p.reconciling();
            assertThat(p.getPaymentStatus()).isEqualTo(PaymentStatus.RECONCILING);
        }

        @Test
        @DisplayName("AUTHORIZED 상태에서 reconciling() 시 PAYMENT_INVALID_STATUS_TRANSITION 예외")
        void reconciling_fromAuthorized_throws() {
            Payment p = newReady();
            p.authorize();
            assertThatThrownBy(p::reconciling)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(AdminPaymentErrorCode.PAYMENT_INVALID_STATUS_TRANSITION);
        }
    }

    @Nested
    @DisplayName("cancel() — READY → CANCELED")
    class Cancel {

        @Test
        @DisplayName("READY 상태에서 cancel() 성공")
        void cancel_fromReady_success() {
            Payment p = newReady();
            p.cancel();
            assertThat(p.getPaymentStatus()).isEqualTo(PaymentStatus.CANCELED);
        }

        @Test
        @DisplayName("AUTHORIZED 상태에서 cancel() 시 PAYMENT_INVALID_STATUS_TRANSITION 예외")
        void cancel_fromAuthorized_throws() {
            Payment p = newReady();
            p.authorize();
            assertThatThrownBy(p::cancel)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(AdminPaymentErrorCode.PAYMENT_INVALID_STATUS_TRANSITION);
        }

        @Test
        @DisplayName("PAID 상태에서 cancel() 시 PAYMENT_INVALID_STATUS_TRANSITION 예외 — 결제 완료 후 취소 금지")
        void cancel_fromPaid_throws() {
            Payment p = newReady();
            p.authorize();
            p.confirmStarted();
            p.paid("key", NOW);
            assertThatThrownBy(p::cancel)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(AdminPaymentErrorCode.PAYMENT_INVALID_STATUS_TRANSITION);
        }
    }

    @Nested
    @DisplayName("refund() — PAID → REFUNDED")
    class Refund {

        @Test
        @DisplayName("PAID 상태에서 refund() 성공")
        void refund_fromPaid_success() {
            Payment p = newReady();
            p.authorize();
            p.confirmStarted();
            p.paid("key", NOW);
            p.refund();
            assertThat(p.getPaymentStatus()).isEqualTo(PaymentStatus.REFUNDED);
        }

        @Test
        @DisplayName("READY 상태에서 refund() 시 PAYMENT_INVALID_STATUS_TRANSITION 예외")
        void refund_fromReady_throws() {
            Payment p = newReady();
            assertThatThrownBy(p::refund)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(AdminPaymentErrorCode.PAYMENT_INVALID_STATUS_TRANSITION);
        }

        @Test
        @DisplayName("FAILED 상태에서 refund() 시 PAYMENT_INVALID_STATUS_TRANSITION 예외")
        void refund_fromFailed_throws() {
            Payment p = newReady();
            p.authorize();
            p.fail(FailureReason.CARD_DECLINED);
            assertThatThrownBy(p::refund)
                    .isInstanceOf(CustomException.class)
                    .extracting(ex -> ((CustomException) ex).getErrorCode())
                    .isEqualTo(AdminPaymentErrorCode.PAYMENT_INVALID_STATUS_TRANSITION);
        }
    }
}
