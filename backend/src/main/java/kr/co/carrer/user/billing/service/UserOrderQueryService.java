package kr.co.carrer.user.billing.service;

import kr.co.carrer.user.billing.dto.BillingDTO;

import java.util.UUID;

public interface UserOrderQueryService {

    BillingDTO.PaymentStatusResponse getOrderStatus(UUID memberId, String orderId);
}
