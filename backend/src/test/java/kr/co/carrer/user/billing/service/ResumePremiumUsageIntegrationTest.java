package kr.co.carrer.user.billing.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.carrer.global.s3.S3Uploader;
import kr.co.carrer.user.billing.entity.MemberProductEntitlement;
import kr.co.carrer.user.billing.entity.ServiceUsageRecord;
import kr.co.carrer.user.billing.entity.Subscription;
import kr.co.carrer.user.billing.entity.SubscriptionUsagePeriod;
import kr.co.carrer.user.billing.repository.MemberProductEntitlementRepository;
import kr.co.carrer.user.billing.repository.ServiceUsageRecordRepository;
import kr.co.carrer.user.billing.repository.SubscriptionRepository;
import kr.co.carrer.user.billing.repository.SubscriptionUsagePeriodRepository;
import kr.co.carrer.user.billing.service.impl.EntitlementServiceImpl;
import kr.co.carrer.user.billing.type.ResourceType;
import kr.co.carrer.user.resume.dto.ResumeDTO;
import kr.co.carrer.user.resume.entity.Document;
import kr.co.carrer.user.resume.repository.CoverLetterContentRepository;
import kr.co.carrer.user.resume.repository.CoverLetterMetaRepository;
import kr.co.carrer.user.resume.repository.DocumentFeedbackRepository;
import kr.co.carrer.user.resume.repository.DocumentRepository;
import kr.co.carrer.user.resume.service.DocumentStatusService;
import kr.co.carrer.user.resume.service.FileValidator;
import kr.co.carrer.user.resume.service.impl.ResumeServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;

import java.lang.reflect.Field;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ResumePremiumUsageIntegrationTest {

    @Mock DocumentRepository documentRepository;
    @Mock CoverLetterMetaRepository coverLetterMetaRepository;
    @Mock CoverLetterContentRepository coverLetterContentRepository;
    @Mock DocumentFeedbackRepository documentFeedbackRepository;
    @Mock FileValidator fileValidator;
    @Mock S3Uploader s3Uploader;
    @Mock ObjectMapper objectMapper;
    @Mock DocumentStatusService documentStatusService;
    @Mock ApplicationEventPublisher eventPublisher;
    @Mock MemberProductEntitlementRepository entitlementRepository;
    @Mock ServiceUsageRecordRepository usageRecordRepository;
    @Mock SubscriptionRepository subscriptionRepository;
    @Mock SubscriptionUsagePeriodRepository usagePeriodRepository;

    private ResumeServiceImpl resumeService;
    private SubscriptionUsagePeriod period;
    private AtomicReference<ServiceUsageRecord> usageRecord;
    private UUID memberId;
    private UUID documentId;

    @BeforeEach
    void setUp() {
        memberId = UUID.randomUUID();
        documentId = UUID.randomUUID();
        UUID subscriptionId = UUID.randomUUID();
        UUID usagePeriodId = UUID.randomUUID();
        ZonedDateTime now = ZonedDateTime.now(ZoneId.of("Asia/Seoul"));

        MemberProductEntitlement entitlement =
                MemberProductEntitlement.createFree(memberId, "document-coaching");
        entitlement.activatePremium(subscriptionId);
        Subscription subscription =
                Subscription.create(memberId, 1L, now.minusDays(1), now.plusDays(29));
        setField(subscription, "subscriptionId", subscriptionId);
        period = SubscriptionUsagePeriod.create(
                subscriptionId, "document-coaching", now.minusDays(1), now.plusDays(29), 2);
        setField(period, "usagePeriodId", usagePeriodId);
        usageRecord = new AtomicReference<>();

        when(entitlementRepository.findByMemberIdAndProductCodeForUpdate(
                memberId, "document-coaching")).thenReturn(Optional.of(entitlement));
        when(subscriptionRepository.findBySubscriptionIdAndMemberIdForUpdate(subscriptionId, memberId))
                .thenReturn(Optional.of(subscription));
        when(usagePeriodRepository.findCurrentPeriodForUpdate(eq(subscriptionId), any()))
                .thenReturn(Optional.of(period));
        when(usagePeriodRepository.findByUsagePeriodIdForUpdate(usagePeriodId))
                .thenReturn(Optional.of(period));
        when(usageRecordRepository.findByResourceTypeAndResourceId(any(), any()))
                .thenAnswer(invocation -> Optional.ofNullable(usageRecord.get()));
        when(usageRecordRepository.findByResourceTypeAndResourceIdForUpdate(any(), any()))
                .thenAnswer(invocation -> Optional.ofNullable(usageRecord.get()));
        when(usageRecordRepository.save(any())).thenAnswer(invocation -> {
            ServiceUsageRecord saved = invocation.getArgument(0);
            usageRecord.set(saved);
            return saved;
        });

        EntitlementService entitlementService = new EntitlementServiceImpl(
                entitlementRepository, usageRecordRepository, id -> true,
                subscriptionRepository, usagePeriodRepository);
        resumeService = new ResumeServiceImpl(
                documentRepository, coverLetterMetaRepository, coverLetterContentRepository,
                documentFeedbackRepository, fileValidator, s3Uploader, objectMapper,
                documentStatusService, eventPublisher, entitlementService);
        ReflectionTestUtils.setField(resumeService, "configuredWebhookSecret", "test-secret");
    }

    @Test
    @DisplayName("Resume PREMIUM 성공 — 시작 reserve, COMPLETED consume")
    void resumePremium_successConsumesMonthlyUsage() {
        Document document = prepareUpload();

        resumeService.uploadResume(memberId, mock(MultipartFile.class));
        assertThat(period.getReservedCount()).isEqualTo(1);

        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));
        when(documentFeedbackRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        resumeService.receiveWebhook(documentId, "test-secret", new ResumeDTO.RequestWebhook(
                documentId, "COMPLETED", 80, 80, 80, 80, 80, "총평", "[]", null));

        assertThat(period.getReservedCount()).isZero();
        assertThat(period.getUsedCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("Resume PREMIUM 실패 — FAILED release, used 불변")
    void resumePremium_failureReleasesMonthlyUsage() {
        Document document = prepareUpload();

        resumeService.uploadResume(memberId, mock(MultipartFile.class));
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));
        resumeService.receiveWebhook(documentId, "test-secret", new ResumeDTO.RequestWebhook(
                documentId, "FAILED", null, null, null, null, null, null, null, "오류"));

        assertThat(period.getReservedCount()).isZero();
        assertThat(period.getUsedCount()).isZero();
    }

    private Document prepareUpload() {
        when(fileValidator.extractExtension(any())).thenReturn("pdf");
        when(s3Uploader.upload(any(), any())).thenReturn("https://s3/resume.pdf");
        when(documentRepository.save(any())).thenAnswer(invocation -> {
            Document document = invocation.getArgument(0);
            setField(document, "documentId", documentId);
            return document;
        });
        Document document = Document.ofResume(memberId, "https://s3/resume.pdf", null);
        setField(document, "documentId", documentId);
        return document;
    }

    private void setField(Object target, String name, Object value) {
        try {
            Field field = target.getClass().getDeclaredField(name);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new AssertionError(e);
        }
    }
}
