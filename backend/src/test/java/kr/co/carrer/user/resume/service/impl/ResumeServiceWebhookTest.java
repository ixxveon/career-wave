package kr.co.carrer.user.resume.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.s3.S3Uploader;
import kr.co.carrer.user.resume.dto.ResumeDTO;
import kr.co.carrer.user.resume.entity.Document;
import kr.co.carrer.user.resume.entity.DocumentFeedback;
import kr.co.carrer.user.resume.event.DocumentAnalysisCompletedEvent;
import kr.co.carrer.user.resume.exception.ResumeErrorCode;
import kr.co.carrer.user.resume.repository.CoverLetterContentRepository;
import kr.co.carrer.user.resume.repository.CoverLetterMetaRepository;
import kr.co.carrer.user.resume.repository.DocumentFeedbackRepository;
import kr.co.carrer.user.resume.repository.DocumentRepository;
import kr.co.carrer.user.resume.type.DocumentStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ResumeServiceWebhookTest {

    @Mock private DocumentRepository documentRepository;
    @Mock private CoverLetterMetaRepository coverLetterMetaRepository;
    @Mock private CoverLetterContentRepository coverLetterContentRepository;
    @Mock private DocumentFeedbackRepository documentFeedbackRepository;
    @Mock private FileValidator fileValidator;
    @Mock private S3Uploader s3Uploader;
    @Mock private FastApiClient fastApiClient;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Spy  private ObjectMapper objectMapper;

    @InjectMocks
    private ResumeServiceImpl resumeService;

    private static final String VALID_SECRET = "test-secret";

    @BeforeEach
    void injectSecret() {
        ReflectionTestUtils.setField(resumeService, "configuredWebhookSecret", VALID_SECRET);
    }

    @Test
    @DisplayName("올바른 시크릿과 COMPLETED 상태로 요청하면 DocumentFeedback이 저장되고 이벤트가 발행된다")
    void receiveWebhook_completed_savesFeedbackAndPublishesEvent() {
        UUID documentId = UUID.randomUUID();
        Document document = stubAnalyzingDocument(documentId);

        ResumeDTO.RequestWebhook request = new ResumeDTO.RequestWebhook(
                documentId, "COMPLETED",
                85, 90, 75, 80, 82,
                "전반적으로 우수합니다.", "[{\"sectionNumber\":1}]", null
        );

        resumeService.receiveWebhook(VALID_SECRET, request);

        verify(documentFeedbackRepository).save(any(DocumentFeedback.class));
        assertThat(document.getStatus()).isEqualTo(DocumentStatus.COMPLETED);

        ArgumentCaptor<DocumentAnalysisCompletedEvent> captor =
                ArgumentCaptor.forClass(DocumentAnalysisCompletedEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());
        assertThat(captor.getValue().documentId()).isEqualTo(documentId);
        assertThat(captor.getValue().status()).isEqualTo("COMPLETED");
    }

    @Test
    @DisplayName("FAILED 상태로 요청하면 Document가 FAILED로 마킹되고 이벤트가 발행된다")
    void receiveWebhook_failed_marksDocumentFailedAndPublishesEvent() {
        UUID documentId = UUID.randomUUID();
        Document document = stubAnalyzingDocument(documentId);

        ResumeDTO.RequestWebhook request = new ResumeDTO.RequestWebhook(
                documentId, "FAILED",
                null, null, null, null, null,
                null, null, "AI 분석 오류 발생"
        );

        resumeService.receiveWebhook(VALID_SECRET, request);

        verify(documentFeedbackRepository, never()).save(any());
        assertThat(document.getStatus()).isEqualTo(DocumentStatus.FAILED);
        assertThat(document.getErrorMessage()).isEqualTo("AI 분석 오류 발생");

        verify(eventPublisher).publishEvent(any(DocumentAnalysisCompletedEvent.class));
    }

    @Test
    @DisplayName("잘못된 시크릿으로 요청하면 WEBHOOK_SECRET_INVALID 예외가 발생한다")
    void receiveWebhook_invalidSecret_throwsException() {
        ResumeDTO.RequestWebhook request = new ResumeDTO.RequestWebhook(
                UUID.randomUUID(), "COMPLETED",
                85, 90, 75, 80, 82, "총평", "[]", null
        );

        assertThatThrownBy(() -> resumeService.receiveWebhook("wrong-secret", request))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(ResumeErrorCode.WEBHOOK_SECRET_INVALID);
    }

    @Test
    @DisplayName("이미 COMPLETED 상태인 문서는 멱등성 처리로 DB 갱신 없이 반환된다")
    void receiveWebhook_alreadyCompleted_idempotent() {
        UUID documentId = UUID.randomUUID();
        Document document = stubCompletedDocument(documentId);

        ResumeDTO.RequestWebhook request = new ResumeDTO.RequestWebhook(
                documentId, "COMPLETED",
                85, 90, 75, 80, 82, "총평", "[]", null
        );

        resumeService.receiveWebhook(VALID_SECRET, request);

        verify(documentFeedbackRepository, never()).save(any());
        verify(eventPublisher, never()).publishEvent(any());
    }

    // --- Helpers ---

    private Document stubAnalyzingDocument(UUID documentId) {
        Document document = Document.ofResume(UUID.randomUUID(), "https://s3.example.com/file.pdf", "이력서.pdf");
        document.updateStatus(DocumentStatus.ANALYZING);
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));
        return document;
    }

    private Document stubCompletedDocument(UUID documentId) {
        Document document = Document.ofResume(UUID.randomUUID(), "https://s3.example.com/file.pdf", "이력서.pdf");
        document.updateStatus(DocumentStatus.COMPLETED);
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));
        return document;
    }
}
