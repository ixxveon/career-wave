package kr.co.carrer.user.billing.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.ZonedDateTime;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TossBillingPaymentResponse(
        String paymentKey,
        String orderId,
        String status,          // "DONE" 이면 성공
        int totalAmount,
        String currency,
        ZonedDateTime approvedAt
) {}
