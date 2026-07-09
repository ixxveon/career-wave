package kr.co.carrer.admin.payment.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TossCancelResponse(
        String paymentKey,
        String status   // "CANCELED" 이면 성공
) {}
