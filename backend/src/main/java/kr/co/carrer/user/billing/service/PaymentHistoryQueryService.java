package kr.co.carrer.user.billing.service;

import kr.co.carrer.user.billing.dto.BillingDTO;

import java.util.UUID;

public interface PaymentHistoryQueryService {
    BillingDTO.ResponsePaymentHistory getPaymentHistory(UUID memberId, String period, int page, int size);
}
