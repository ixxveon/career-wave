package kr.co.carrer.user.billing.service.impl;

import kr.co.carrer.user.billing.entity.MemberProductEntitlement;
import kr.co.carrer.user.billing.repository.MemberProductEntitlementRepository;
import kr.co.carrer.user.billing.service.EntitlementInitService;
import kr.co.carrer.user.billing.type.ProductCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EntitlementInitServiceImpl implements EntitlementInitService {

    private final MemberProductEntitlementRepository entitlementRepository;

    @Override
    @Transactional
    public void initFreeEntitlements(UUID memberId) {
        for (ProductCode product : ProductCode.values()) {
            String productCode = product.code();
            entitlementRepository
                    .findByMemberIdAndProductCodeForUpdate(memberId, productCode)
                    .ifPresentOrElse(
                            existing -> {},
                            () -> entitlementRepository.save(
                                    MemberProductEntitlement.createFree(memberId, productCode))
                    );
        }
    }
}
