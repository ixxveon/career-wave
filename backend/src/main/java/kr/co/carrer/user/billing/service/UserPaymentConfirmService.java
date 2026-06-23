package kr.co.carrer.user.billing.service;

import kr.co.carrer.user.billing.dto.BillingDTO;

import java.util.UUID;

public interface UserPaymentConfirmService {

    BillingDTO.ResponseConfirmPayment confirm(UUID memberId, BillingDTO.RequestConfirmPayment request);

    BillingDTO.ResponseRecordPaymentFail recordFail(UUID memberId, BillingDTO.RequestRecordPaymentFail request);
}
