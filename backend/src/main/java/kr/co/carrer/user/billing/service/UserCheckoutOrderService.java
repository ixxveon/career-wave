package kr.co.carrer.user.billing.service;

import kr.co.carrer.user.billing.dto.BillingDTO;

import java.util.UUID;

public interface UserCheckoutOrderService {

    BillingDTO.CreateOrderResponse createOrder(UUID memberId, BillingDTO.CreateOrderRequest request);
}
