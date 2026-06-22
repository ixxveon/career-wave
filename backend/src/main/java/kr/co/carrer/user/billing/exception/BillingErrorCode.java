package kr.co.carrer.user.billing.exception;

import kr.co.carrer.global.exception.BaseErrorCode;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum BillingErrorCode implements BaseErrorCode {

    PRODUCT_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 상품입니다."),
    PRODUCT_NOT_ACTIVE(HttpStatus.CONFLICT, "현재 판매 중이지 않은 상품입니다."),

    SUBSCRIPTION_NOT_FOUND(HttpStatus.NOT_FOUND, "구독 정보를 찾을 수 없습니다."),
    SUBSCRIPTION_FORBIDDEN(HttpStatus.FORBIDDEN, "본인 소유의 구독만 접근할 수 있습니다."),
    SUBSCRIPTION_ALREADY_ACTIVE(HttpStatus.CONFLICT, "이미 해당 상품의 구독이 존재합니다."),
    SUBSCRIPTION_NOT_CANCELABLE(HttpStatus.CONFLICT, "해지 예약이 불가능한 구독 상태입니다."),

    SUBSCRIPTION_REQUIRED(HttpStatus.PAYMENT_REQUIRED, "무료 이용권이 소진되었습니다. 구독 후 이용해주세요."),
    MONTHLY_LIMIT_EXCEEDED(HttpStatus.TOO_MANY_REQUESTS, "이번 달 이용 횟수를 모두 사용했습니다."),

    SERVICE_USAGE_ALREADY_RESERVED(HttpStatus.CONFLICT, "이미 사용 기록이 존재합니다."),
    SERVICE_USAGE_NOT_RESERVED(HttpStatus.CONFLICT, "예약된 사용 기록이 없습니다."),

    BILLING_ORDER_NOT_FOUND(HttpStatus.NOT_FOUND, "결제 주문 정보를 찾을 수 없습니다."),
    BILLING_ORDER_NOT_READY(HttpStatus.CONFLICT, "처리할 수 없는 주문 상태입니다."),
    BILLING_CUSTOMER_KEY_MISMATCH(HttpStatus.BAD_REQUEST, "고객 키가 일치하지 않습니다."),
    BILLING_AUTHORIZATION_FAILED(HttpStatus.UNPROCESSABLE_ENTITY, "billingKey 발급에 실패했습니다."),

    PAYMENT_AMOUNT_MISMATCH(HttpStatus.BAD_REQUEST, "결제 금액이 일치하지 않습니다."),
    PAYMENT_CONFIRM_FAILED(HttpStatus.UNPROCESSABLE_ENTITY, "결제 승인 중 오류가 발생했습니다."),
    PAYMENT_RECONCILIATION_REQUIRED(HttpStatus.ACCEPTED, "결제 결과를 확인 중입니다."),
    PAYMENT_METHOD_REQUIRED(HttpStatus.CONFLICT, "활성 자동결제 수단이 없습니다."),

    ENTITLEMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "상품 이용 권한 정보를 찾을 수 없습니다."),
    ACCOUNT_NOT_ELIGIBLE(HttpStatus.FORBIDDEN, "현재 계정 상태로는 결제·이용이 불가능합니다.");

    private final HttpStatus status;
    private final String message;

    BillingErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }
}
