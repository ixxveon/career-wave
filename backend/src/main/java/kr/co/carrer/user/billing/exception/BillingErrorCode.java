package kr.co.carrer.user.billing.exception;

import kr.co.carrer.global.exception.BaseErrorCode;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum BillingErrorCode implements BaseErrorCode {

    PLAN_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 상품입니다."),
    PLAN_NOT_ACTIVE(HttpStatus.BAD_REQUEST, "현재 판매 중이지 않은 상품입니다."),

    SUBSCRIPTION_NOT_FOUND(HttpStatus.NOT_FOUND, "구독 정보를 찾을 수 없습니다."),
    SUBSCRIPTION_FORBIDDEN(HttpStatus.FORBIDDEN, "본인 소유의 구독만 접근할 수 있습니다."),
    SUBSCRIPTION_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 해당 상품의 구독이 존재합니다."),
    SUBSCRIPTION_NOT_CANCELABLE(HttpStatus.BAD_REQUEST, "해지 예약이 불가능한 구독 상태입니다."),

    SUBSCRIPTION_REQUIRED(HttpStatus.PAYMENT_REQUIRED, "무료 이용권이 소진되었습니다. 구독 후 이용해주세요."),
    FREE_USAGE_EXHAUSTED(HttpStatus.PAYMENT_REQUIRED, "무료 이용권이 소진되었습니다."),
    USAGE_LIMIT_EXCEEDED(HttpStatus.PAYMENT_REQUIRED, "이번 달 이용 횟수를 모두 사용했습니다."),

    PAYMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "결제 정보를 찾을 수 없습니다."),
    PAYMENT_ORDER_FORBIDDEN(HttpStatus.FORBIDDEN, "본인 소유의 주문만 접근할 수 있습니다."),
    PAYMENT_ORDER_INVALID_STATUS(HttpStatus.BAD_REQUEST, "처리할 수 없는 주문 상태입니다."),
    PAYMENT_DUPLICATE(HttpStatus.CONFLICT, "이미 처리된 결제입니다."),
    PAYMENT_AMOUNT_MISMATCH(HttpStatus.BAD_REQUEST, "결제 금액이 일치하지 않습니다."),
    PAYMENT_CONFIRM_FAILED(HttpStatus.BAD_GATEWAY, "결제 승인 중 오류가 발생했습니다."),
    PAYMENT_EXPIRE_FAILED(HttpStatus.BAD_REQUEST, "만료된 주문입니다."),

    BILLING_PROFILE_NOT_FOUND(HttpStatus.NOT_FOUND, "자동결제 수단을 찾을 수 없습니다."),
    BILLING_CONSENT_REQUIRED(HttpStatus.BAD_REQUEST, "자동결제 약관 동의가 필요합니다."),
    BILLING_CUSTOMER_KEY_MISMATCH(HttpStatus.BAD_REQUEST, "고객 키가 일치하지 않습니다."),

    ENTITLEMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "상품 이용 권한 정보를 찾을 수 없습니다."),
    USAGE_RECORD_DUPLICATE(HttpStatus.CONFLICT, "이미 사용 기록이 존재합니다.");

    private final HttpStatus status;
    private final String message;

    BillingErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }
}
