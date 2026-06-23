package kr.co.carrer.user.billing.type;

public enum PaymentFailureReason {
    USER_CANCELED,
    CARD_DECLINED,
    TIMEOUT,
    DUPLICATE_ORDER,
    CONFIRM_FAILED,
    FORBIDDEN,
    UNKNOWN
}
