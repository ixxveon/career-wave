package kr.co.carrer.user.billing.service;

import kr.co.carrer.user.billing.dto.BillingDTO;

import java.util.UUID;

public interface UserCheckoutOrderService {

    BillingDTO.ResponseCreateOrder createOrder(UUID memberId, BillingDTO.RequestCreateOrder request);
}
