package kr.co.carrer.user.resume.scheduler;

import kr.co.carrer.user.resume.entity.Document;
import kr.co.carrer.user.resume.repository.DocumentRepository;
import kr.co.carrer.user.resume.service.DocumentStatusService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.mock;

@ExtendWith(MockitoExtension.class)
class DocumentAnalysisSchedulerTest {

    @Mock DocumentRepository documentRepository;
    @Mock DocumentStatusService documentStatusService;

    private DocumentAnalysisScheduler scheduler;

    @BeforeEach
    void setUp() {
        scheduler = new DocumentAnalysisScheduler(documentRepository, documentStatusService);
        ReflectionTestUtils.setField(scheduler, "stuckThresholdMinutes", 30L);
    }

    @Test
    @DisplayName("방치된 문서 각각에 대해 failStuckDocument 를 호출한다")
    void failsEachStuckDocument() {
        UUID id1 = UUID.randomUUID();
        UUID id2 = UUID.randomUUID();
        Document doc1 = docWithId(id1);
        Document doc2 = docWithId(id2);
        given(documentRepository.findStuckDocuments(anyList(), any()))
                .willReturn(List.of(doc1, doc2));

        scheduler.failStuckDocuments();

        then(documentStatusService).should().failStuckDocument(id1);
        then(documentStatusService).should().failStuckDocument(id2);
    }

    @Test
    @DisplayName("한 건 처리가 실패해도 나머지 문서는 계속 처리한다 (문서별 격리)")
    void oneFailureDoesNotBlockOthers() {
        UUID failing = UUID.randomUUID();
        UUID healthy = UUID.randomUUID();
        Document failingDoc = docWithId(failing);
        Document healthyDoc = docWithId(healthy);
        given(documentRepository.findStuckDocuments(anyList(), any()))
                .willReturn(List.of(failingDoc, healthyDoc));
        willThrow(new RuntimeException("boom"))
                .given(documentStatusService).failStuckDocument(failing);

        scheduler.failStuckDocuments();

        then(documentStatusService).should().failStuckDocument(healthy);
    }

    @Test
    @DisplayName("방치된 문서가 없으면 아무 처리도 하지 않는다")
    void noStuckDocuments() {
        given(documentRepository.findStuckDocuments(anyList(), any()))
                .willReturn(List.of());

        scheduler.failStuckDocuments();

        then(documentStatusService).shouldHaveNoInteractions();
    }

    private Document docWithId(UUID id) {
        Document document = mock(Document.class);
        given(document.getDocumentId()).willReturn(id);
        return document;
    }
}
