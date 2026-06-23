package kr.co.carrer.admin.payment.service;

import kr.co.carrer.admin.payment.dto.SubscriptionDTO;
import kr.co.carrer.admin.payment.type.SubscriptionStatus;
import kr.co.carrer.global.response.PaginationResponse;

public interface AdminSubscriptionService {

    SubscriptionDTO.ResponseCounts getSubscriptionCounts();

    PaginationResponse<SubscriptionDTO.ResponseList> getSubscriptions(SubscriptionStatus status, int page, int size);
}
