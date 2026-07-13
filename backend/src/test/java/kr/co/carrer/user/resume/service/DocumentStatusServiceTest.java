package kr.co.carrer.user.resume.service;

import kr.co.carrer.user.billing.service.EntitlementService;
import kr.co.carrer.user.billing.type.ResourceType;
import kr.co.carrer.user.resume.entity.Document;
import kr.co.carrer.user.resume.event.DocumentAnalysisCompletedEvent;
import kr.co.carrer.user.resume.repository.DocumentRepository;
import kr.co.carrer.user.resume.type.DocumentStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;

@ExtendWith(MockitoExtension.class)
class DocumentStatusServiceTest {

    @Mock DocumentRepository documentRepository;
    @Mock EntitlementService entitlementService;
    @Mock ApplicationEventPublisher eventPublisher;

    private DocumentStatusService service;

    private final UUID documentId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new DocumentStatusService(documentRepository, entitlementService, eventPublisher);
    }

    @Test
    @DisplayName("failStuckDocument — ANALYZING 문서는 markFailed + release + FAILED 이벤트 발행")
    void failStuckDocument_analyzing_processed() {
        Document document = mock(Document.class);
        given(document.getStatus()).willReturn(DocumentStatus.ANALYZING);
        given(documentRepository.findByIdForUpdate(documentId)).willReturn(Optional.of(document));

        service.failStuckDocument(documentId);

        then(document).should().markFailed(anyString());
        then(entitlementService).should().release(ResourceType.DOCUMENT, documentId);
        then(eventPublisher).should().publishEvent(any(DocumentAnalysisCompletedEvent.class));
    }

    @Test
    @DisplayName("failStuckDocument — 이미 COMPLETED 면 멱등 스킵(상태 변경·release·이벤트 없음)")
    void failStuckDocument_completed_skipped() {
        Document document = mock(Document.class);
        given(document.getStatus()).willReturn(DocumentStatus.COMPLETED);
        given(documentRepository.findByIdForUpdate(documentId)).willReturn(Optional.of(document));

        service.failStuckDocument(documentId);

        then(document).should(never()).markFailed(anyString());
        then(entitlementService).shouldHaveNoInteractions();
        then(eventPublisher).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("failStuckDocument — 이미 FAILED 면 멱등 스킵(상태 변경·release·이벤트 없음)")
    void failStuckDocument_failed_skipped() {
        Document document = mock(Document.class);
        given(document.getStatus()).willReturn(DocumentStatus.FAILED);
        given(documentRepository.findByIdForUpdate(documentId)).willReturn(Optional.of(document));

        service.failStuckDocument(documentId);

        then(document).should(never()).markFailed(anyString());
        then(entitlementService).shouldHaveNoInteractions();
        then(eventPublisher).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("failStuckDocument — 문서가 없으면 아무 처리도 하지 않는다")
    void failStuckDocument_notFound_noop() {
        given(documentRepository.findByIdForUpdate(documentId)).willReturn(Optional.empty());

        service.failStuckDocument(documentId);

        then(entitlementService).shouldHaveNoInteractions();
        then(eventPublisher).shouldHaveNoInteractions();
    }
}
