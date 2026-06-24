package kr.co.carrer.user.billing.type;

// admin.payment.type.PaymentStatus 와 DB CHECK 허용값 동일 — 변경 시 constitution §8.2 확인 필수
public enum UserPaymentStatus {
    READY, AUTHORIZED, CONFIRMING, PAID, FAILED, CANCELED, RECONCILING, REFUNDED
}
