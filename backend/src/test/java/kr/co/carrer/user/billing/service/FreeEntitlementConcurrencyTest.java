package kr.co.carrer.user.billing.service;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.entity.MemberProductEntitlement;
import kr.co.carrer.user.billing.entity.ServiceUsageRecord;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import kr.co.carrer.user.billing.repository.MemberProductEntitlementRepository;
import kr.co.carrer.user.billing.repository.ServiceUsageRecordRepository;
import kr.co.carrer.user.billing.service.impl.EntitlementServiceImpl;
import kr.co.carrer.user.billing.type.ResourceType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * 무료 이용권 동시성 보호 테스트.
 *
 * DB 레벨의 PESSIMISTIC_WRITE 락은 실제 컨테이너 환경에서 검증됨.
 * 본 테스트는 상태 머신(RESERVED → 추가 예약 거부)이 논리적으로 동시 예약을 차단함을 검증한다.
 */
@ExtendWith(MockitoExtension.class)
class FreeEntitlementConcurrencyTest {

    @Mock MemberProductEntitlementRepository entitlementRepository;
    @Mock ServiceUsageRecordRepository usageRecordRepository;
    @Mock BillingMemberPort billingMemberPort;

    private EntitlementServiceImpl service;
    private UUID memberId;
    private MemberProductEntitlement entitlement;

    @BeforeEach
    void setUp() {
        service = new EntitlementServiceImpl(entitlementRepository, usageRecordRepository, billingMemberPort);
        memberId = UUID.randomUUID();
        entitlement = MemberProductEntitlement.createFree(memberId, "interview");

        when(billingMemberPort.isEligibleForBilling(memberId)).thenReturn(true);
        when(entitlementRepository.findByMemberIdAndProductCodeForUpdate(memberId, "interview"))
                .thenReturn(Optional.of(entitlement));
        when(usageRecordRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    @DisplayName("동시 요청 2건 — 첫 번째 성공 후 두 번째는 ALREADY_RESERVED")
    void concurrent2_onlyFirstSucceeds() {
        UUID resourceId1 = UUID.randomUUID();
        UUID resourceId2 = UUID.randomUUID();

        when(usageRecordRepository.findByResourceTypeAndResourceId(ResourceType.INTERVIEW_SESSION, resourceId1))
                .thenReturn(Optional.empty());
        when(usageRecordRepository.findByResourceTypeAndResourceId(ResourceType.INTERVIEW_SESSION, resourceId2))
                .thenReturn(Optional.empty());

        // 첫 번째 예약 성공 — 이용권 RESERVED로 전이
        service.reserve(memberId, "interview", ResourceType.INTERVIEW_SESSION, resourceId1);

        // 동일 이용권, 두 번째 자원으로 예약 시도 — 이용권이 이미 RESERVED이므로 거부
        assertThatThrownBy(() -> service.reserve(memberId, "interview", ResourceType.INTERVIEW_SESSION, resourceId2))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(BillingErrorCode.SERVICE_USAGE_ALREADY_RESERVED);
    }

    @Test
    @DisplayName("동시 요청 10건 — 첫 번째만 성공, 나머지 9건은 ALREADY_RESERVED")
    void concurrent10_onlyOneSucceeds() {
        List<UUID> resourceIds = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            UUID rid = UUID.randomUUID();
            resourceIds.add(rid);
            when(usageRecordRepository.findByResourceTypeAndResourceId(ResourceType.INTERVIEW_SESSION, rid))
                    .thenReturn(Optional.empty());
        }

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failCount = new AtomicInteger(0);

        for (UUID resourceId : resourceIds) {
            try {
                service.reserve(memberId, "interview", ResourceType.INTERVIEW_SESSION, resourceId);
                successCount.incrementAndGet();
            } catch (CustomException e) {
                if (e.getErrorCode() == BillingErrorCode.SERVICE_USAGE_ALREADY_RESERVED) {
                    failCount.incrementAndGet();
                }
            }
        }

        assertThat(successCount.get()).isEqualTo(1);
        assertThat(failCount.get()).isEqualTo(9);
    }

    @Test
    @DisplayName("동일 resourceId 두 번 예약 — UsageRecord 기반 거부")
    void sameResourceId_twiceReserve_usageRecordGuard() {
        UUID resourceId = UUID.randomUUID();
        ServiceUsageRecord alreadyReserved = ServiceUsageRecord.reserveFree(
                memberId, "interview", ResourceType.INTERVIEW_SESSION, resourceId);

        when(usageRecordRepository.findByResourceTypeAndResourceId(ResourceType.INTERVIEW_SESSION, resourceId))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(alreadyReserved)); // 두 번째는 RESERVED record 있음

        // 첫 번째: 성공
        service.reserve(memberId, "interview", ResourceType.INTERVIEW_SESSION, resourceId);

        // 두 번째: UsageRecord로 즉시 거부 (이용권 잠금 없이)
        assertThatThrownBy(() -> service.reserve(memberId, "interview", ResourceType.INTERVIEW_SESSION, resourceId))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(BillingErrorCode.SERVICE_USAGE_ALREADY_RESERVED);
    }
}
