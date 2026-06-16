package kr.co.carrer.user.resume.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.s3.S3Uploader;
import kr.co.carrer.user.resume.dto.ResumeDTO;
import kr.co.carrer.user.resume.entity.Document;
import kr.co.carrer.user.resume.entity.DocumentFeedback;
import kr.co.carrer.user.resume.exception.ResumeErrorCode;
import kr.co.carrer.user.resume.repository.CoverLetterContentRepository;
import kr.co.carrer.user.resume.repository.CoverLetterMetaRepository;
import kr.co.carrer.user.resume.repository.DocumentFeedbackRepository;
import kr.co.carrer.user.resume.repository.DocumentRepository;
import org.springframework.context.ApplicationEventPublisher;
import kr.co.carrer.user.resume.service.FileValidator;
import kr.co.carrer.user.resume.type.DocumentStatus;
import kr.co.carrer.user.resume.type.FileType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ResumeServiceFeedbackTest {

    @Mock private DocumentRepository documentRepository;
    @Mock private CoverLetterMetaRepository coverLetterMetaRepository;
    @Mock private CoverLetterContentRepository coverLetterContentRepository;
    @Mock private DocumentFeedbackRepository documentFeedbackRepository;
    @Mock private FileValidator fileValidator;
    @Mock private S3Uploader s3Uploader;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Spy  private ObjectMapper objectMapper;

    @InjectMocks
    private ResumeServiceImpl resumeService;

    @Test
    @DisplayName("DocumentFeedback이 없으면 scores·feedbackDetails가 null인 응답을 반환한다")
    void getFeedback_noFeedback_returnsNullScores() {
        UUID memberId = UUID.randomUUID();
        UUID documentId = UUID.randomUUID();
        Document document = Document.ofResume(memberId, "https://s3.example.com/file.pdf", "이력서.pdf");

        when(documentRepository.findByDocumentIdAndMemberId(documentId, memberId))
                .thenReturn(Optional.of(document));
        when(documentFeedbackRepository.findByDocumentId(documentId))
                .thenReturn(Optional.empty());

        ResumeDTO.ResponseFeedback response = resumeService.getFeedback(memberId, documentId);

        assertThat(response.scores()).isNull();
        assertThat(response.feedbackDetails()).isNull();
        assertThat(response.overallReview()).isNull();
        assertThat(response.status()).isEqualTo(DocumentStatus.UPLOADED.name());
    }

    @Test
    @DisplayName("DocumentFeedback이 있으면 scores·feedbackDetails가 정상 반환된다")
    void getFeedback_withFeedback_returnsScoresAndDetails() {
        UUID memberId = UUID.randomUUID();
        UUID documentId = UUID.randomUUID();
        Document document = Document.ofResume(memberId, "https://s3.example.com/file.pdf", "이력서.pdf");
        document.updateStatus(DocumentStatus.COMPLETED);

        DocumentFeedback feedback = DocumentFeedback.of(
                documentId, 85, 90, 75, 80, 82,
                "전반적으로 우수합니다.",
                "[{\"sectionNumber\":1,\"question\":\"지원동기\",\"originalText\":\"원문\",\"goodPoint\":\"good\",\"badPoint\":\"bad\",\"improvedText\":\"improved\"}]"
        );

        when(documentRepository.findByDocumentIdAndMemberId(documentId, memberId))
                .thenReturn(Optional.of(document));
        when(documentFeedbackRepository.findByDocumentId(documentId))
                .thenReturn(Optional.of(feedback));

        ResumeDTO.ResponseFeedback response = resumeService.getFeedback(memberId, documentId);

        assertThat(response.scores()).isNotNull();
        assertThat(response.scores().jobFitness()).isEqualTo(85);
        assertThat(response.scores().total()).isEqualTo(82);
        assertThat(response.overallReview()).isEqualTo("전반적으로 우수합니다.");
        assertThat(response.feedbackDetails()).hasSize(1);
        assertThat(response.feedbackDetails().get(0).sectionNumber()).isEqualTo(1);
    }

    @Test
    @DisplayName("존재하지 않는 documentId로 조회 시 DOCUMENT_NOT_FOUND 예외가 발생한다")
    void getFeedback_notFound_throwsException() {
        UUID memberId = UUID.randomUUID();
        UUID documentId = UUID.randomUUID();

        when(documentRepository.findByDocumentIdAndMemberId(documentId, memberId))
                .thenReturn(Optional.empty());
        when(documentRepository.findById(documentId))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> resumeService.getFeedback(memberId, documentId))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(ResumeErrorCode.DOCUMENT_NOT_FOUND));
    }

    @Test
    @DisplayName("다른 회원의 documentId로 조회 시 DOCUMENT_ACCESS_DENIED 예외가 발생한다")
    void getFeedback_accessDenied_throwsException() {
        UUID memberId = UUID.randomUUID();
        UUID documentId = UUID.randomUUID();
        Document otherDocument = Document.ofResume(UUID.randomUUID(), "url", "name.pdf");

        when(documentRepository.findByDocumentIdAndMemberId(documentId, memberId))
                .thenReturn(Optional.empty());
        when(documentRepository.findById(documentId))
                .thenReturn(Optional.of(otherDocument));

        assertThatThrownBy(() -> resumeService.getFeedback(memberId, documentId))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(ResumeErrorCode.DOCUMENT_ACCESS_DENIED));
    }
}
