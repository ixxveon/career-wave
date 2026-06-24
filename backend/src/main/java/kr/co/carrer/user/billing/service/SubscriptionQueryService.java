package kr.co.carrer.user.billing.service;

import kr.co.carrer.user.billing.dto.BillingDTO;

import java.util.List;
import java.util.UUID;

public interface SubscriptionQueryService {

    List<BillingDTO.ProductItem> getProducts();

    BillingDTO.ResponseSubscriptionList getMySubscriptions(UUID memberId);

    BillingDTO.ResponseUsageList getMyUsages(UUID memberId);
}
