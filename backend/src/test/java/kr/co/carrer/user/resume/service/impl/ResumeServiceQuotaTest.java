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

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

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
    @Mock private EntitlementQueryService entitlementQueryService;
    @Mock private EntitlementService entitlementService;
    @Spy  private ObjectMapper objectMapper;

    @InjectMocks private ResumeServiceImpl resumeService;

    private static final UUID MEMBER_ID = UUID.randomUUID();

    @Test
    @DisplayName("FREE 유저 — ANALYZING 중일 때 limitCount=1 유지 (회귀)")
    void getQuota_free_analyzingInProgress_limitCountStaysOne() {
        // freeRemaining=1이지만 ANALYZING 중인 문서가 있어 usedCount=1인 상황
        EntitlementDTO.EntitlementItem freeItem = freeItem(1, "ANALYZING");
        givenEntitlements(freeItem);
        given(documentRepository.countUsedThisMonth(eq(MEMBER_ID), any(ZonedDateTime.class), eq(DocumentStatus.FAILED)))
                .willReturn(1);

        ResumeDTO.ResponseQuota quota = resumeService.getQuota(MEMBER_ID);

        assertThat(quota.limitCount()).isEqualTo(1);
        assertThat(quota.usedCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("PREMIUM 유저 — monthlyUsed + monthlyReserved 합산으로 usedCount 반환")
    void getQuota_premium_usesMonthlyUsedPlusReserved() {
        EntitlementDTO.EntitlementItem premiumItem = premiumItem(10, 3, 2);
        givenEntitlements(premiumItem);

        ResumeDTO.ResponseQuota quota = resumeService.getQuota(MEMBER_ID);

        assertThat(quota.usedCount()).isEqualTo(5);   // used(3) + reserved(2)
        assertThat(quota.limitCount()).isEqualTo(10);
        verify(documentRepository, never()).countUsedThisMonth(any(), any(), any());
    }

    @Test
    @DisplayName("이용권 없는 경우 — usedCount=0, limitCount=0 반환")
    void getQuota_noEntitlement_returnsZero() {
        given(entitlementQueryService.getMyEntitlements(MEMBER_ID))
                .willReturn(new EntitlementDTO.ResponseEntitlementList(Map.of(), List.of()));

        ResumeDTO.ResponseQuota quota = resumeService.getQuota(MEMBER_ID);

        assertThat(quota.usedCount()).isZero();
        assertThat(quota.limitCount()).isZero();
    }

    @Test
    @DisplayName("핵심 케이스 — 무료 1회 사용 후 월 중간 구독 전환 시 usedCount=0 / limitCount=30")
    void getQuota_freeUsedOnce_thenSubscribedMidMonth_returnsZeroUsedAndPremiumLimit() {
        // 무료로 1회 사용 후 이번 달 중간에 구독 → 구독 기간의 monthlyUsed=0, monthlyReserved=0
        // 무료 사용분은 PREMIUM 월 카운트에 포함되지 않아야 함
        EntitlementDTO.EntitlementItem premiumItem = premiumItem(30, 0, 0);
        givenEntitlements(premiumItem);

        ResumeDTO.ResponseQuota quota = resumeService.getQuota(MEMBER_ID);

        assertThat(quota.usedCount()).isEqualTo(0);
        assertThat(quota.limitCount()).isEqualTo(30);
        verify(documentRepository, never()).countUsedThisMonth(any(), any(), any());
    }

    @Test
    @DisplayName("PREMIUM 유저 — 구독 시작일이 지난달이어도 이번 달 1일 기준 DB 조회 없이 DTO 값 사용")
    void getQuota_premium_crossMonthSubscription_usesEntitlementDto() {
        // 구독 시작: 지난달 20일, 현재 이번달 — DB 조회 없이 DTO monthlyUsed+monthlyReserved 사용
        EntitlementDTO.EntitlementItem premiumItem = premiumItem(5, 1, 1);
        givenEntitlements(premiumItem);

        ResumeDTO.ResponseQuota quota = resumeService.getQuota(MEMBER_ID);

        assertThat(quota.usedCount()).isEqualTo(2);
        assertThat(quota.limitCount()).isEqualTo(5);
        verify(documentRepository, never()).countUsedThisMonth(any(), any(), any());
    }

    private void givenEntitlements(EntitlementDTO.EntitlementItem item) {
        given(entitlementQueryService.getMyEntitlements(MEMBER_ID))
                .willReturn(new EntitlementDTO.ResponseEntitlementList(
                        Map.of("document-coaching", true),
                        List.of(item)));
    }

    private EntitlementDTO.EntitlementItem freeItem(int freeRemaining, String freeUsageStatus) {
        return new EntitlementDTO.EntitlementItem(
                "document-coaching", "FREE", freeRemaining, freeUsageStatus,
                null, true, null,
                null, null, null, null, null);
    }

    private EntitlementDTO.EntitlementItem premiumItem(int monthlyLimit, int monthlyUsed, int monthlyReserved) {
        return new EntitlementDTO.EntitlementItem(
                "document-coaching", "PREMIUM", 0, "USED",
                "ACTIVE", true, null,
                monthlyLimit, monthlyUsed, monthlyReserved,
                monthlyLimit - monthlyUsed - monthlyReserved,
                ZonedDateTime.now().plusDays(15));
    }
}
