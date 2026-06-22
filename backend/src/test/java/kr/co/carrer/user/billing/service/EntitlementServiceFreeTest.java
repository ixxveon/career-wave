package kr.co.carrer.user.billing.service;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.entity.MemberProductEntitlement;
import kr.co.carrer.user.billing.entity.ServiceUsageRecord;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import kr.co.carrer.user.billing.repository.MemberProductEntitlementRepository;
import kr.co.carrer.user.billing.repository.ServiceUsageRecordRepository;
import kr.co.carrer.user.billing.service.impl.EntitlementServiceImpl;
import kr.co.carrer.user.billing.type.FreeUsageStatus;
import kr.co.carrer.user.billing.type.ResourceType;
import kr.co.carrer.user.billing.type.UsageStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EntitlementServiceFreeTest {

    @InjectMocks
    private EntitlementServiceImpl service;

    @Mock
    private MemberProductEntitlementRepository entitlementRepository;

    @Mock
    private ServiceUsageRecordRepository usageRecordRepository;

    private UUID memberId;
    private UUID resourceId;
    private MemberProductEntitlement availableEntitlement;

    @BeforeEach
    void setUp() {
        memberId = UUID.randomUUID();
        resourceId = UUID.randomUUID();
        availableEntitlement = MemberProductEntitlement.createFree(memberId, "document-coaching");
    }

    @Nested
    @DisplayName("reserve()")
    class Reserve {

        @Test
        @DisplayName("AVAILABLE 이용권 — 예약 성공, UsageRecord 생성")
        void reserve_available_success() {
            when(usageRecordRepository.findByResourceTypeAndResourceId(ResourceType.DOCUMENT, resourceId))
                    .thenReturn(Optional.empty());
            when(entitlementRepository.findByMemberIdAndProductCodeForUpdate(memberId, "document-coaching"))
                    .thenReturn(Optional.of(availableEntitlement));
            when(usageRecordRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            service.reserve(memberId, "document-coaching", ResourceType.DOCUMENT, resourceId);

            assertThat(availableEntitlement.getFreeUsageStatus()).isEqualTo(FreeUsageStatus.RESERVED);

            ArgumentCaptor<ServiceUsageRecord> captor = ArgumentCaptor.forClass(ServiceUsageRecord.class);
            verify(usageRecordRepository).save(captor.capture());
            ServiceUsageRecord saved = captor.getValue();
            assertThat(saved.getMemberId()).isEqualTo(memberId);
            assertThat(saved.getResourceType()).isEqualTo(ResourceType.DOCUMENT);
            assertThat(saved.getResourceId()).isEqualTo(resourceId);
            assertThat(saved.getUsageStatus()).isEqualTo(UsageStatus.RESERVED);
        }

        @Test
        @DisplayName("동일 resourceId UsageRecord RESERVED — SERVICE_USAGE_ALREADY_RESERVED")
        void reserve_usageRecordAlreadyReserved_throws() {
            ServiceUsageRecord existingRecord = ServiceUsageRecord.reserveFree(memberId, "document-coaching", ResourceType.DOCUMENT, resourceId);

            when(usageRecordRepository.findByResourceTypeAndResourceId(ResourceType.DOCUMENT, resourceId))
                    .thenReturn(Optional.of(existingRecord));

            assertThatThrownBy(() -> service.reserve(memberId, "document-coaching", ResourceType.DOCUMENT, resourceId))
                    .isInstanceOf(CustomException.class)
                    .extracting(e -> ((CustomException) e).getErrorCode())
                    .isEqualTo(BillingErrorCode.SERVICE_USAGE_ALREADY_RESERVED);
        }

        @Test
        @DisplayName("이용권 freeUsageStatus RESERVED — SERVICE_USAGE_ALREADY_RESERVED")
        void reserve_entitlementReserved_throws() {
            availableEntitlement.reserveFree();

            when(usageRecordRepository.findByResourceTypeAndResourceId(ResourceType.DOCUMENT, resourceId))
                    .thenReturn(Optional.empty());
            when(entitlementRepository.findByMemberIdAndProductCodeForUpdate(memberId, "document-coaching"))
                    .thenReturn(Optional.of(availableEntitlement));

            assertThatThrownBy(() -> service.reserve(memberId, "document-coaching", ResourceType.DOCUMENT, resourceId))
                    .isInstanceOf(CustomException.class)
                    .extracting(e -> ((CustomException) e).getErrorCode())
                    .isEqualTo(BillingErrorCode.SERVICE_USAGE_ALREADY_RESERVED);
        }

        @Test
        @DisplayName("이용권 freeUsageStatus USED — SUBSCRIPTION_REQUIRED")
        void reserve_entitlementUsed_throws() {
            availableEntitlement.reserveFree();
            availableEntitlement.consumeFree();

            when(usageRecordRepository.findByResourceTypeAndResourceId(ResourceType.DOCUMENT, resourceId))
                    .thenReturn(Optional.empty());
            when(entitlementRepository.findByMemberIdAndProductCodeForUpdate(memberId, "document-coaching"))
                    .thenReturn(Optional.of(availableEntitlement));

            assertThatThrownBy(() -> service.reserve(memberId, "document-coaching", ResourceType.DOCUMENT, resourceId))
                    .isInstanceOf(CustomException.class)
                    .extracting(e -> ((CustomException) e).getErrorCode())
                    .isEqualTo(BillingErrorCode.SUBSCRIPTION_REQUIRED);
        }

        @Test
        @DisplayName("동일 resourceId UsageRecord CONSUMED — 멱등, save 없음")
        void reserve_usageRecordConsumed_idempotent() {
            ServiceUsageRecord consumed = ServiceUsageRecord.reserveFree(memberId, "document-coaching", ResourceType.DOCUMENT, resourceId);
            consumed.consume();

            when(usageRecordRepository.findByResourceTypeAndResourceId(ResourceType.DOCUMENT, resourceId))
                    .thenReturn(Optional.of(consumed));

            service.reserve(memberId, "document-coaching", ResourceType.DOCUMENT, resourceId);

            verify(entitlementRepository, never()).findByMemberIdAndProductCodeForUpdate(any(), any());
            verify(usageRecordRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("consume()")
    class Consume {

        private ServiceUsageRecord reservedRecord;

        @BeforeEach
        void setUp() {
            reservedRecord = ServiceUsageRecord.reserveFree(memberId, "document-coaching", ResourceType.DOCUMENT, resourceId);
            availableEntitlement.reserveFree();
        }

        @Test
        @DisplayName("RESERVED 상태 → CONSUMED 전이 성공")
        void consume_reserved_success() {
            when(usageRecordRepository.findByResourceTypeAndResourceId(ResourceType.DOCUMENT, resourceId))
                    .thenReturn(Optional.of(reservedRecord));
            when(entitlementRepository.findByMemberIdAndProductCodeForUpdate(memberId, "document-coaching"))
                    .thenReturn(Optional.of(availableEntitlement));

            service.consume(ResourceType.DOCUMENT, resourceId);

            assertThat(reservedRecord.getUsageStatus()).isEqualTo(UsageStatus.CONSUMED);
            assertThat(availableEntitlement.getFreeUsageStatus()).isEqualTo(FreeUsageStatus.USED);
            assertThat(availableEntitlement.getFreeRemaining()).isZero();
        }

        @Test
        @DisplayName("이미 CONSUMED — 멱등, 이용권 조회 없음")
        void consume_alreadyConsumed_idempotent() {
            reservedRecord.consume();

            when(usageRecordRepository.findByResourceTypeAndResourceId(ResourceType.DOCUMENT, resourceId))
                    .thenReturn(Optional.of(reservedRecord));

            service.consume(ResourceType.DOCUMENT, resourceId);

            verify(entitlementRepository, never()).findByMemberIdAndProductCodeForUpdate(any(), any());
        }

        @Test
        @DisplayName("UsageRecord 없음 — SERVICE_USAGE_NOT_RESERVED")
        void consume_noRecord_throws() {
            when(usageRecordRepository.findByResourceTypeAndResourceId(ResourceType.DOCUMENT, resourceId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.consume(ResourceType.DOCUMENT, resourceId))
                    .isInstanceOf(CustomException.class)
                    .extracting(e -> ((CustomException) e).getErrorCode())
                    .isEqualTo(BillingErrorCode.SERVICE_USAGE_NOT_RESERVED);
        }
    }

    @Nested
    @DisplayName("release()")
    class Release {

        private ServiceUsageRecord reservedRecord;

        @BeforeEach
        void setUp() {
            reservedRecord = ServiceUsageRecord.reserveFree(memberId, "document-coaching", ResourceType.DOCUMENT, resourceId);
            availableEntitlement.reserveFree();
        }

        @Test
        @DisplayName("RESERVED 상태 → RELEASED 전이 성공, 이용권 AVAILABLE 복원")
        void release_reserved_success() {
            when(usageRecordRepository.findByResourceTypeAndResourceId(ResourceType.DOCUMENT, resourceId))
                    .thenReturn(Optional.of(reservedRecord));
            when(entitlementRepository.findByMemberIdAndProductCodeForUpdate(memberId, "document-coaching"))
                    .thenReturn(Optional.of(availableEntitlement));

            service.release(ResourceType.DOCUMENT, resourceId);

            assertThat(reservedRecord.getUsageStatus()).isEqualTo(UsageStatus.RELEASED);
            assertThat(availableEntitlement.getFreeUsageStatus()).isEqualTo(FreeUsageStatus.AVAILABLE);
        }

        @Test
        @DisplayName("이미 RELEASED — 멱등, 이용권 조회 없음")
        void release_alreadyReleased_idempotent() {
            reservedRecord.release();

            when(usageRecordRepository.findByResourceTypeAndResourceId(ResourceType.DOCUMENT, resourceId))
                    .thenReturn(Optional.of(reservedRecord));

            service.release(ResourceType.DOCUMENT, resourceId);

            verify(entitlementRepository, never()).findByMemberIdAndProductCodeForUpdate(any(), any());
        }

        @Test
        @DisplayName("UsageRecord 없음 — 경고 로그만, 예외 없음")
        void release_noRecord_noOp() {
            when(usageRecordRepository.findByResourceTypeAndResourceId(ResourceType.DOCUMENT, resourceId))
                    .thenReturn(Optional.empty());

            service.release(ResourceType.DOCUMENT, resourceId);

            verify(entitlementRepository, never()).findByMemberIdAndProductCodeForUpdate(any(), any());
        }
    }
}
