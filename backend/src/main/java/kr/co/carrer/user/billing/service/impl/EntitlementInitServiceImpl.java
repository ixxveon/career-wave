package kr.co.carrer.user.billing.service.impl;

import kr.co.carrer.user.billing.entity.MemberProductEntitlement;
import kr.co.carrer.user.billing.repository.MemberProductEntitlementRepository;
import kr.co.carrer.user.billing.service.EntitlementInitService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EntitlementInitServiceImpl implements EntitlementInitService {

    private static final List<String> PRODUCT_CODES = List.of("document-coaching", "interview");

    private final MemberProductEntitlementRepository entitlementRepository;

    @Override
    @Transactional
    public void initFreeEntitlements(UUID memberId) {
        for (String productCode : PRODUCT_CODES) {
            boolean exists = entitlementRepository
                    .findByMemberIdAndProductCode(memberId, productCode)
                    .isPresent();
            if (!exists) {
                entitlementRepository.save(MemberProductEntitlement.createFree(memberId, productCode));
            }
        }
    }
}
