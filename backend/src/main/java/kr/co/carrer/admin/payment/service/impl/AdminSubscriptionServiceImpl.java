package kr.co.carrer.admin.payment.service.impl;

import kr.co.carrer.admin.payment.dto.SubscriptionDTO;
import kr.co.carrer.admin.payment.repository.SubscriptionQueryRepository;
import kr.co.carrer.admin.payment.service.AdminSubscriptionService;
import kr.co.carrer.admin.payment.type.SubscriptionStatus;
import kr.co.carrer.global.response.PaginationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminSubscriptionServiceImpl implements AdminSubscriptionService {

    private final SubscriptionQueryRepository subscriptionQueryRepository;

    @Override
    @Transactional(readOnly = true)
    public PaginationResponse<SubscriptionDTO.ResponseList> getSubscriptions(SubscriptionStatus status, int page, int size) {
        int safePage = Math.max(page, 1);
        int safeSize = Math.min(Math.max(size, 1), 100);
        int offset = (safePage - 1) * safeSize;

        List<SubscriptionDTO.ResponseList> items = subscriptionQueryRepository.findSubscriptions(status, offset, safeSize);
        long total = subscriptionQueryRepository.countSubscriptions(status);
        return PaginationResponse.of(items, safePage, safeSize, total);
    }
}
