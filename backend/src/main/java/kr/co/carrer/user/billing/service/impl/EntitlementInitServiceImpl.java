package kr.co.carrer.user.billing.service.impl;

import kr.co.carrer.user.billing.entity.MemberProductEntitlement;
import kr.co.carrer.user.billing.repository.MemberProductEntitlementRepository;
import kr.co.carrer.user.billing.service.EntitlementInitService;
import kr.co.carrer.user.billing.type.ProductCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
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

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void ensureFreeEntitlement(UUID memberId, String productCode) {
        if (entitlementRepository.findByMemberIdAndProductCode(memberId, productCode).isPresent()) {
            return;
        }
        try {
            entitlementRepository.saveAndFlush(MemberProductEntitlement.createFree(memberId, productCode));
        } catch (DataIntegrityViolationException e) {
            // 동시 호출이 먼저 생성해 uq_member_product 위반 — 이미 존재하므로 무시한다.
            log.debug("이용권 동시 생성 경합 무시: memberId={}, productCode={}", memberId, productCode);
        }
    }
}
