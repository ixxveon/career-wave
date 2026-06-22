package kr.co.carrer.user.billing.service.impl;

import kr.co.carrer.user.billing.dto.EntitlementDTO;
import kr.co.carrer.user.billing.entity.MemberProductEntitlement;
import kr.co.carrer.user.billing.repository.MemberProductEntitlementRepository;
import kr.co.carrer.user.billing.service.EntitlementQueryService;
import kr.co.carrer.user.billing.type.FreeUsageStatus;
import kr.co.carrer.user.billing.type.PlanType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EntitlementQueryServiceImpl implements EntitlementQueryService {

    private final MemberProductEntitlementRepository entitlementRepository;

    @Override
    @Transactional(readOnly = true)
    public EntitlementDTO.ResponseEntitlementList getMyEntitlements(UUID memberId) {
        List<MemberProductEntitlement> entitlements = entitlementRepository.findAllByMemberId(memberId);

        List<EntitlementDTO.EntitlementItem> items = entitlements.stream()
                .map(this::toItem)
                .toList();

        return new EntitlementDTO.ResponseEntitlementList(items);
    }

    private EntitlementDTO.EntitlementItem toItem(MemberProductEntitlement e) {
        boolean isPremium = e.getPlanType() == PlanType.PREMIUM;

        if (isPremium) {
            return new EntitlementDTO.EntitlementItem(
                    e.getProductCode(),
                    e.getPlanType().name(),
                    e.getFreeRemaining(),
                    e.getFreeUsageStatus().name(),
                    true,
                    null
            );
        }

        FreeUsageStatus freeStatus = e.getFreeUsageStatus();
        boolean available = freeStatus == FreeUsageStatus.AVAILABLE;
        String reason = resolveUnavailableReason(freeStatus);

        return new EntitlementDTO.EntitlementItem(
                e.getProductCode(),
                e.getPlanType().name(),
                e.getFreeRemaining(),
                freeStatus.name(),
                available,
                reason
        );
    }

    private String resolveUnavailableReason(FreeUsageStatus status) {
        return switch (status) {
            case AVAILABLE -> null;
            case RESERVED -> "SERVICE_IN_PROGRESS";
            case USED, FORFEITED -> "SUBSCRIPTION_REQUIRED";
        };
    }
}
