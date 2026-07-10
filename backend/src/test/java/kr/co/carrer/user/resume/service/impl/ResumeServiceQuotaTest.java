package kr.co.carrer.user.resume.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.carrer.global.s3.S3Uploader;
import kr.co.carrer.user.billing.dto.EntitlementDTO;
import kr.co.carrer.user.billing.service.EntitlementQueryService;
import kr.co.carrer.user.billing.service.EntitlementService;
import kr.co.carrer.user.resume.dto.ResumeDTO;
import kr.co.carrer.user.resume.repository.CoverLetterContentRepository;
import kr.co.carrer.user.resume.repository.CoverLetterMetaRepository;
import kr.co.carrer.user.resume.repository.DocumentFeedbackRepository;
import kr.co.carrer.user.resume.repository.DocumentRepository;
import kr.co.carrer.user.resume.service.DocumentStatusService;
import kr.co.carrer.user.resume.service.FileValidator;
import kr.co.carrer.user.resume.type.DocumentStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ResumeServiceQuotaTest {

    @Mock private DocumentRepository documentRepository;
    @Mock private CoverLetterMetaRepository coverLetterMetaRepository;
    @Mock private CoverLetterContentRepository coverLetterContentRepository;
    @Mock private DocumentFeedbackRepository documentFeedbackRepository;
    @Mock private FileValidator fileValidator;
    @Mock private S3Uploader s3Uploader;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private DocumentStatusService documentStatusService;
    @Mock private EntitlementService entitlementService;
    @Mock private EntitlementQueryService entitlementQueryService;
    @Spy  private ObjectMapper objectMapper;

    @InjectMocks
    private ResumeServiceImpl resumeService;

    @Test
    @DisplayName("무료 사용자가 ANALYZING 문서 1개 보유 시 limitCount는 1로 유지된다 (#1218 회귀)")
    void getQuota_freeUser_analyzingDocument_limitCountIsOne() {
        UUID memberId = UUID.randomUUID();

        // ANALYZING 문서 1개 → countUsedThisMonth = 1
        when(documentRepository.countUsedThisMonth(eq(memberId), any(), eq(DocumentStatus.FAILED)))
                .thenReturn(1);

        // 무료 사용자: monthlyLimit = null, freeRemaining = 1
        EntitlementDTO.EntitlementItem freeItem = new EntitlementDTO.EntitlementItem(
                "document-coaching", "FREE", 1, "RESERVED", null,
                false, "SUBSCRIPTION_REQUIRED",
                null, null, null, null, null
        );
        when(entitlementQueryService.getMyEntitlements(memberId))
                .thenReturn(new EntitlementDTO.ResponseEntitlementList(
                        Map.of("document-coaching", false), List.of(freeItem)));

        ResumeDTO.ResponseQuota quota = resumeService.getQuota(memberId);

        assertThat(quota.usedCount()).isEqualTo(1);
        assertThat(quota.limitCount()).isEqualTo(1);  // 1+1=2가 아닌 FREE_DOCUMENT_LIMIT(1)
    }

    @Test
    @DisplayName("유료 구독 사용자는 monthlyLimit을 limitCount로 반환한다")
    void getQuota_premiumUser_returnsMonthlyLimit() {
        UUID memberId = UUID.randomUUID();

        when(documentRepository.countUsedThisMonth(eq(memberId), any(), eq(DocumentStatus.FAILED)))
                .thenReturn(5);

        EntitlementDTO.EntitlementItem premiumItem = new EntitlementDTO.EntitlementItem(
                "document-coaching", "PREMIUM", 0, "FORFEITED", "ACTIVE",
                true, null,
                30, 5, 0, 25, null
        );
        when(entitlementQueryService.getMyEntitlements(memberId))
                .thenReturn(new EntitlementDTO.ResponseEntitlementList(
                        Map.of("document-coaching", true), List.of(premiumItem)));

        ResumeDTO.ResponseQuota quota = resumeService.getQuota(memberId);

        assertThat(quota.usedCount()).isEqualTo(5);
        assertThat(quota.limitCount()).isEqualTo(30);
    }

    @Test
    @DisplayName("이용권이 없는 사용자는 limitCount 0을 반환한다")
    void getQuota_noEntitlement_limitCountIsZero() {
        UUID memberId = UUID.randomUUID();

        when(documentRepository.countUsedThisMonth(eq(memberId), any(), eq(DocumentStatus.FAILED)))
                .thenReturn(0);

        when(entitlementQueryService.getMyEntitlements(memberId))
                .thenReturn(new EntitlementDTO.ResponseEntitlementList(Map.of(), List.of()));

        ResumeDTO.ResponseQuota quota = resumeService.getQuota(memberId);

        assertThat(quota.usedCount()).isEqualTo(0);
        assertThat(quota.limitCount()).isEqualTo(0);
    }
}
