package kr.co.carrer.user.billing.service;

import kr.co.carrer.user.billing.dto.BillingDTO;

import java.util.UUID;

public interface UserPaymentConfirmService {

    BillingDTO.ConfirmPaymentResponse confirm(UUID memberId, BillingDTO.ConfirmPaymentRequest request);

    BillingDTO.RecordPaymentFailResponse recordFail(UUID memberId, BillingDTO.RecordPaymentFailRequest request);
}
