package kr.co.carrer.user.billing.demo;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.ZonedDateTime;

/**
 * Toss <code>POST /v1/payments/confirm</code> 응답의 부분 매핑.
 * 데모에 필요한 필드만 취하고 나머지는 무시한다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record TossPaymentConfirmResult(
        String paymentKey,
        String orderId,
        String orderName,
        String status,
        int totalAmount,
        String currency,
        String method,
        ZonedDateTime approvedAt,
        EasyPay easyPay
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record EasyPay(String provider, int amount, int discountAmount) {}
}
