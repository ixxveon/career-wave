package kr.co.carrer.user.billing.service;

import kr.co.carrer.user.billing.entity.MemberProductEntitlement;
import kr.co.carrer.user.billing.repository.MemberProductEntitlementRepository;
import kr.co.carrer.user.billing.service.impl.EntitlementInitServiceImpl;
import kr.co.carrer.user.billing.type.FreeUsageStatus;
import kr.co.carrer.user.billing.type.PlanType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EntitlementInitServiceTest {

    @InjectMocks
    private EntitlementInitServiceImpl service;

    @Mock
    private MemberProductEntitlementRepository entitlementRepository;

    @Test
    @DisplayName("USER 가입 시 document-coaching, interview 이용권 2개 생성")
    void initFreeEntitlements_createsTwo() {
        UUID memberId = UUID.randomUUID();
        when(entitlementRepository.findByMemberIdAndProductCodeForUpdate(eq(memberId), any()))
                .thenReturn(Optional.empty());
        when(entitlementRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.initFreeEntitlements(memberId);

        ArgumentCaptor<MemberProductEntitlement> captor = ArgumentCaptor.forClass(MemberProductEntitlement.class);
        verify(entitlementRepository, times(2)).save(captor.capture());

        List<MemberProductEntitlement> saved = captor.getAllValues();
        assertThat(saved).extracting(MemberProductEntitlement::getMemberId)
                .containsOnly(memberId);
        assertThat(saved).extracting(MemberProductEntitlement::getProductCode)
                .containsExactlyInAnyOrder("document-coaching", "interview");
        assertThat(saved).extracting(MemberProductEntitlement::getPlanType)
                .containsOnly(PlanType.FREE);
        assertThat(saved).extracting(MemberProductEntitlement::getFreeUsageStatus)
                .containsOnly(FreeUsageStatus.AVAILABLE);
        assertThat(saved).extracting(MemberProductEntitlement::getFreeRemaining)
                .containsOnly(1);
    }

    @Test
    @DisplayName("이미 document-coaching이 존재하면 interview만 생성 (멱등)")
    void initFreeEntitlements_idempotent_skipsExisting() {
        UUID memberId = UUID.randomUUID();
        MemberProductEntitlement existing = MemberProductEntitlement.createFree(memberId, "document-coaching");

        when(entitlementRepository.findByMemberIdAndProductCodeForUpdate(memberId, "document-coaching"))
                .thenReturn(Optional.of(existing));
        when(entitlementRepository.findByMemberIdAndProductCodeForUpdate(memberId, "interview"))
                .thenReturn(Optional.empty());
        when(entitlementRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.initFreeEntitlements(memberId);

        ArgumentCaptor<MemberProductEntitlement> captor = ArgumentCaptor.forClass(MemberProductEntitlement.class);
        verify(entitlementRepository, times(1)).save(captor.capture());
        assertThat(captor.getValue().getProductCode()).isEqualTo("interview");
    }

    @Test
    @DisplayName("두 상품 모두 존재하면 save 호출 없음 (완전 멱등)")
    void initFreeEntitlements_allExist_noSave() {
        UUID memberId = UUID.randomUUID();
        when(entitlementRepository.findByMemberIdAndProductCodeForUpdate(eq(memberId), any()))
                .thenReturn(Optional.of(MemberProductEntitlement.createFree(memberId, "dummy")));

        service.initFreeEntitlements(memberId);

        verify(entitlementRepository, never()).save(any());
    }
}
