package kr.co.carrer.user.billing.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.entity.MemberProductEntitlement;
import kr.co.carrer.user.billing.entity.ServiceUsageRecord;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import kr.co.carrer.user.billing.repository.MemberProductEntitlementRepository;
import kr.co.carrer.user.billing.repository.ServiceUsageRecordRepository;
import kr.co.carrer.user.billing.service.EntitlementService;
import kr.co.carrer.user.billing.type.FreeUsageStatus;
import kr.co.carrer.user.billing.type.ResourceType;
import kr.co.carrer.user.billing.type.UsageStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class EntitlementServiceImpl implements EntitlementService {

    private final MemberProductEntitlementRepository entitlementRepository;
    private final ServiceUsageRecordRepository usageRecordRepository;

    @Override
    @Transactional
    public void reserve(UUID memberId, String productCode, ResourceType resourceType, UUID resourceId) {
        // 멱등 체크: 동일 resourceId에 대한 UsageRecord가 이미 존재하면 중복 예약 거부
        Optional<ServiceUsageRecord> existing =
                usageRecordRepository.findByResourceTypeAndResourceId(resourceType, resourceId);
        if (existing.isPresent()) {
            ServiceUsageRecord record = existing.get();
            if (record.getUsageStatus() == UsageStatus.RESERVED) {
                throw new CustomException(BillingErrorCode.SERVICE_USAGE_ALREADY_RESERVED);
            }
            // CONSUMED/RELEASED — 이미 처리 완료된 resourceId, 무시
            return;
        }

        // 이용권 비관적 잠금 조회
        MemberProductEntitlement entitlement = entitlementRepository
                .findByMemberIdAndProductCodeForUpdate(memberId, productCode)
                .orElseThrow(() -> new CustomException(BillingErrorCode.ENTITLEMENT_NOT_FOUND));

        // 이용권 상태 사전 검증 — 명시적 오류 코드 반환
        FreeUsageStatus freeStatus = entitlement.getFreeUsageStatus();
        if (freeStatus == FreeUsageStatus.RESERVED) {
            throw new CustomException(BillingErrorCode.SERVICE_USAGE_ALREADY_RESERVED);
        }
        if (freeStatus == FreeUsageStatus.USED || freeStatus == FreeUsageStatus.FORFEITED) {
            throw new CustomException(BillingErrorCode.SUBSCRIPTION_REQUIRED);
        }

        entitlement.reserveFree();
        usageRecordRepository.save(ServiceUsageRecord.reserveFree(memberId, productCode, resourceType, resourceId));
    }

    @Override
    @Transactional
    public void consume(ResourceType resourceType, UUID resourceId) {
        ServiceUsageRecord record = usageRecordRepository
                .findByResourceTypeAndResourceId(resourceType, resourceId)
                .orElseThrow(() -> new CustomException(BillingErrorCode.SERVICE_USAGE_NOT_RESERVED));

        // 멱등: 이미 CONSUMED이면 무시
        if (record.getUsageStatus() == UsageStatus.CONSUMED) {
            log.debug("[EntitlementService] consume 멱등 — resourceType={}, resourceId={}", resourceType, resourceId);
            return;
        }

        MemberProductEntitlement entitlement = entitlementRepository
                .findByMemberIdAndProductCodeForUpdate(record.getMemberId(), record.getProductCode())
                .orElseThrow(() -> new CustomException(BillingErrorCode.ENTITLEMENT_NOT_FOUND));

        entitlement.consumeFree();
        record.consume();
    }

    @Override
    @Transactional
    public void release(ResourceType resourceType, UUID resourceId) {
        Optional<ServiceUsageRecord> opt =
                usageRecordRepository.findByResourceTypeAndResourceId(resourceType, resourceId);

        if (opt.isEmpty()) {
            log.warn("[EntitlementService] release 대상 UsageRecord 없음 — resourceType={}, resourceId={}",
                    resourceType, resourceId);
            return;
        }

        ServiceUsageRecord record = opt.get();

        // 멱등: 이미 RELEASED이면 무시
        if (record.getUsageStatus() == UsageStatus.RELEASED) {
            log.debug("[EntitlementService] release 멱등 — resourceType={}, resourceId={}", resourceType, resourceId);
            return;
        }

        MemberProductEntitlement entitlement = entitlementRepository
                .findByMemberIdAndProductCodeForUpdate(record.getMemberId(), record.getProductCode())
                .orElseThrow(() -> new CustomException(BillingErrorCode.ENTITLEMENT_NOT_FOUND));

        entitlement.releaseFreeReservation();
        record.release();
    }
}
