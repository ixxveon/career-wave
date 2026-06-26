package kr.co.carrer.user.billing.service;

import kr.co.carrer.user.billing.type.ResourceType;
import kr.co.carrer.user.resume.dto.ResumeDTO;
import kr.co.carrer.user.resume.entity.Document;
import kr.co.carrer.user.resume.repository.CoverLetterContentRepository;
import kr.co.carrer.user.resume.repository.CoverLetterMetaRepository;
import kr.co.carrer.user.resume.repository.DocumentFeedbackRepository;
import kr.co.carrer.user.resume.repository.DocumentRepository;
import kr.co.carrer.user.resume.service.impl.ResumeServiceImpl;
import kr.co.carrer.user.resume.type.DocumentStatus;
import kr.co.carrer.user.resume.service.FileValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;

import java.lang.reflect.Field;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.carrer.user.resume.service.DocumentStatusService;
import kr.co.carrer.global.s3.S3Uploader;

@ExtendWith(MockitoExtension.class)
class ResumeFreeEntitlementIntegrationTest {

    @Mock DocumentRepository documentRepository;
    @Mock CoverLetterMetaRepository coverLetterMetaRepository;
    @Mock CoverLetterContentRepository coverLetterContentRepository;
    @Mock DocumentFeedbackRepository documentFeedbackRepository;
    @Mock FileValidator fileValidator;
    @Mock S3Uploader s3Uploader;
    @Mock ObjectMapper objectMapper;
    @Mock DocumentStatusService documentStatusService;
    @Mock ApplicationEventPublisher eventPublisher;
    @Mock EntitlementService entitlementService;

    private ResumeServiceImpl resumeService;

    private UUID memberId;
    private UUID documentId;

    @BeforeEach
    void setUp() {
        resumeService = new ResumeServiceImpl(
                documentRepository, coverLetterMetaRepository, coverLetterContentRepository,
                documentFeedbackRepository, fileValidator, s3Uploader, objectMapper,
                documentStatusService, eventPublisher, entitlementService);
        ReflectionTestUtils.setField(resumeService, "configuredWebhookSecret", "test-secret");

        memberId = UUID.randomUUID();
        documentId = UUID.randomUUID();
    }

    @Nested
    @DisplayName("uploadResume — reserve 호출")
    class UploadResume {

        @Test
        @DisplayName("이력서 업로드 시 document-coaching reserve 호출")
        void uploadResume_callsReserve() {
            MultipartFile file = mock(MultipartFile.class);
            when(file.getOriginalFilename()).thenReturn("resume.pdf");
            when(fileValidator.extractExtension(any())).thenReturn("pdf");
            when(s3Uploader.upload(any(), any())).thenReturn("https://s3/resume.pdf");
            when(documentRepository.save(any())).thenAnswer(inv -> {
                Document doc = inv.getArgument(0);
                setDocumentId(doc, documentId);
                return doc;
            });

            resumeService.uploadResume(memberId, file);

            verify(entitlementService).reserve(memberId, "document-coaching", ResourceType.DOCUMENT, documentId);
        }
    }

    @Nested
    @DisplayName("receiveWebhook — consume/release 호출")
    class ReceiveWebhook {

        private Document uploadedDocument;

        @BeforeEach
        void setUp() {
            uploadedDocument = Document.ofResume(memberId, "https://s3/resume.pdf", "resume.pdf");
            setDocumentId(uploadedDocument, documentId);
            when(documentRepository.findByIdForUpdate(documentId)).thenReturn(Optional.of(uploadedDocument));
        }

        @Test
        @DisplayName("COMPLETED 웹훅 — consume 호출, 이용권 차감")
        void receiveWebhook_completed_callsConsume() {
            when(documentFeedbackRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            resumeService.receiveWebhook(documentId, "test-secret", completedDto());

            verify(entitlementService).consume(ResourceType.DOCUMENT, documentId);
            verify(entitlementService, never()).release(any(), any());
        }

        @Test
        @DisplayName("FAILED 웹훅 — release 호출, 이용권 복원")
        void receiveWebhook_failed_callsRelease() {
            resumeService.receiveWebhook(documentId, "test-secret", failedDto());

            verify(entitlementService).release(ResourceType.DOCUMENT, documentId);
            verify(entitlementService, never()).consume(any(), any());
        }

        @Test
        @DisplayName("COMPLETED 상태 문서에 중복 COMPLETED 웹훅 — 멱등, consume 미호출")
        void receiveWebhook_alreadyCompleted_idempotent() {
            uploadedDocument.updateStatus(DocumentStatus.COMPLETED);

            resumeService.receiveWebhook(documentId, "test-secret", completedDto());

            verify(entitlementService, never()).consume(any(), any());
            verify(entitlementService, never()).release(any(), any());
        }

        @Test
        @DisplayName("COMPLETED 이후 FAILED 웹훅 — 멱등, release 미호출")
        void receiveWebhook_completedThenFailed_idempotent() {
            uploadedDocument.updateStatus(DocumentStatus.COMPLETED);

            resumeService.receiveWebhook(documentId, "test-secret", failedDto());

            verify(entitlementService, never()).release(any(), any());
        }

        @Test
        @DisplayName("PENDING 중간 상태 웹훅 — consume/release 미호출")
        void receiveWebhook_pendingStatus_noEntitlementCall() {
            resumeService.receiveWebhook(documentId, "test-secret",
                    new ResumeDTO.RequestWebhook(documentId, "PENDING", null, null, null, null, null, null, null, null));

            verify(entitlementService, never()).consume(any(), any());
            verify(entitlementService, never()).release(any(), any());
        }
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private ResumeDTO.RequestWebhook completedDto() {
        return new ResumeDTO.RequestWebhook(documentId, "COMPLETED", 85, 90, 75, 80, 82, "총평", "[]", null);
    }

    private ResumeDTO.RequestWebhook failedDto() {
        return new ResumeDTO.RequestWebhook(documentId, "FAILED", null, null, null, null, null, null, null, "오류");
    }

    private void setDocumentId(Document document, UUID id) {
        try {
            Field field = Document.class.getDeclaredField("documentId");
            field.setAccessible(true);
            field.set(document, id);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
