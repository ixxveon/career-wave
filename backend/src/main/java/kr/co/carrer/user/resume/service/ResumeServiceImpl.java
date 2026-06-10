package kr.co.carrer.user.resume.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.global.s3.S3Uploader;
import kr.co.carrer.user.resume.dto.ResumeDTO;
import kr.co.carrer.user.resume.entity.CoverLetterContent;
import kr.co.carrer.user.resume.entity.CoverLetterMeta;
import kr.co.carrer.user.resume.entity.Document;
import kr.co.carrer.user.resume.entity.DocumentFeedback;
import kr.co.carrer.user.resume.event.DocumentAnalysisCompletedEvent;
import kr.co.carrer.user.resume.exception.ResumeErrorCode;
import kr.co.carrer.user.resume.repository.CoverLetterContentRepository;
import kr.co.carrer.user.resume.repository.CoverLetterMetaRepository;
import kr.co.carrer.user.resume.repository.DocumentFeedbackRepository;
import kr.co.carrer.user.resume.repository.DocumentRepository;
import kr.co.carrer.user.resume.type.DocumentStatus;
import kr.co.carrer.user.resume.type.FileType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

@Slf4j
@Service
@RequiredArgsConstructor
public class ResumeServiceImpl implements ResumeService {

    private final DocumentRepository documentRepository;
    private final CoverLetterMetaRepository coverLetterMetaRepository;
    private final CoverLetterContentRepository coverLetterContentRepository;
    private final DocumentFeedbackRepository documentFeedbackRepository;
    private final FileValidator fileValidator;
    private final S3Uploader s3Uploader;
    private final FastApiClient fastApiClient;
    private final ObjectMapper objectMapper;
    private final ApplicationEventPublisher eventPublisher;

    @Value("${webhook.secret}")
    private String configuredWebhookSecret;

    @Transactional
    @Override
    public ResumeDTO.ResponseUpload uploadResume(UUID memberId, MultipartFile file) {
        fileValidator.validate(file);
        String extension = fileValidator.extractExtension(file);

        String fileUrl = s3Uploader.upload(file, extension);
        String originalName = file.getOriginalFilename();

        Document document = Document.ofResume(memberId, fileUrl, originalName);
        documentRepository.save(document);

        fastApiClient.triggerAnalysis(
                document.getDocumentId(),
                FileType.RESUME.name(),
                () -> markDocumentFailed(document.getDocumentId(), "FastAPI 분석 트리거 실패")
        );

        return new ResumeDTO.ResponseUpload(
                document.getDocumentId(),
                document.getStatus().name(),
                document.getFileUrl(),
                document.getOriginalName(),
                document.getFileType().name(),
                document.getCreatedAt()
        );
    }

    @Transactional
    @Override
    public ResumeDTO.ResponseCoverLetter submitCoverLetter(UUID memberId, ResumeDTO.RequestCoverLetter dto) {
        Document document = Document.ofCoverLetter(memberId);
        documentRepository.save(document);

        CoverLetterMeta meta = CoverLetterMeta.of(document.getDocumentId(), dto.company(), dto.job());
        coverLetterMetaRepository.save(meta);

        List<CoverLetterContent> contents = dto.content().stream()
                .map(item -> CoverLetterContent.of(
                        document.getDocumentId(),
                        item.order(),
                        item.question(),
                        item.answer()
                ))
                .toList();
        coverLetterContentRepository.saveAll(contents);

        fastApiClient.triggerAnalysis(
                document.getDocumentId(),
                FileType.COVER_LETTER.name(),
                () -> markDocumentFailed(document.getDocumentId(), "FastAPI 분석 트리거 실패")
        );

        return new ResumeDTO.ResponseCoverLetter(
                document.getDocumentId(),
                document.getStatus().name(),
                document.getFileType().name(),
                document.getCreatedAt()
        );
    }

    @Transactional(readOnly = true)
    @Override
    public ResumeDTO.ResponseFeedback getFeedback(UUID memberId, UUID documentId) {
        Document document = documentRepository.findByDocumentIdAndMemberId(documentId, memberId)
                .orElseThrow(() -> {
                    // documentId 자체가 없는지, 소유자 불일치인지 구분 없이 보안상 동일 처리
                    boolean exists = documentRepository.findById(documentId).isPresent();
                    return exists
                            ? new CustomException(ResumeErrorCode.DOCUMENT_ACCESS_DENIED)
                            : new CustomException(ResumeErrorCode.DOCUMENT_NOT_FOUND);
                });

        Optional<DocumentFeedback> feedbackOpt = documentFeedbackRepository.findByDocumentId(documentId);

        if (feedbackOpt.isEmpty()) {
            return new ResumeDTO.ResponseFeedback(
                    document.getDocumentId(),
                    document.getStatus().name(),
                    null, null, null,
                    document.getErrorMessage(),
                    document.getCreatedAt()
            );
        }

        DocumentFeedback feedback = feedbackOpt.get();
        ResumeDTO.ResponseFeedback.ScoreDTO scores = new ResumeDTO.ResponseFeedback.ScoreDTO(
                feedback.getScoreJobFitness(),
                feedback.getScoreTechStack(),
                feedback.getScoreQuantified(),
                feedback.getScoreLogical(),
                feedback.getScoreTotal()
        );

        List<ResumeDTO.ResponseFeedback.FeedbackDetail> feedbackDetails = parseFeedbackDetails(
                feedback.getFeedbackText(), documentId
        );

        return new ResumeDTO.ResponseFeedback(
                document.getDocumentId(),
                document.getStatus().name(),
                scores,
                feedback.getOverallReview(),
                feedbackDetails,
                document.getErrorMessage(),
                feedback.getCreatedAt()
        );
    }

    @Transactional(readOnly = true)
    @Override
    public PaginationResponse<ResumeDTO.HistoryItem> getHistory(UUID memberId, int page, int size) {
        Page<ResumeDTO.HistoryItem> result = documentRepository.findHistoryByMemberId(
                memberId, PageRequest.of(page, size)
        );
        return PaginationResponse.of(result.getContent(), page, size, result.getTotalElements());
    }

    private List<ResumeDTO.ResponseFeedback.FeedbackDetail> parseFeedbackDetails(String feedbackText, UUID documentId) {
        try {
            return List.of(objectMapper.readValue(feedbackText, ResumeDTO.ResponseFeedback.FeedbackDetail[].class));
        } catch (JsonProcessingException e) {
            log.error("[피드백 파싱 실패] documentId: {}, 원인: {}", documentId, e.getMessage());
            throw new CustomException(ResumeErrorCode.FEEDBACK_PARSE_ERROR);
        }
    }

    @Transactional
    @Override
    public void receiveWebhook(String webhookSecret, ResumeDTO.RequestWebhook dto) {
        if (!configuredWebhookSecret.equals(webhookSecret)) {
            throw new CustomException(ResumeErrorCode.WEBHOOK_SECRET_INVALID);
        }

        Document document = documentRepository.findById(dto.documentId())
                .orElseThrow(() -> new CustomException(ResumeErrorCode.DOCUMENT_NOT_FOUND));

        // 멱등성 처리 — 이미 최종 상태면 DB 갱신 없이 반환
        if (document.getStatus() == DocumentStatus.COMPLETED || document.getStatus() == DocumentStatus.FAILED) {
            log.info("[Webhook 멱등성] 이미 처리된 documentId: {}, 현재 상태: {}", dto.documentId(), document.getStatus());
            return;
        }

        if ("COMPLETED".equals(dto.status())) {
            DocumentFeedback feedback = DocumentFeedback.of(
                    dto.documentId(),
                    dto.scoreJobFitness(),
                    dto.scoreTechStack(),
                    dto.scoreQuantified(),
                    dto.scoreLogical(),
                    dto.scoreTotal(),
                    dto.overallReview(),
                    dto.feedbackText()
            );
            documentFeedbackRepository.save(feedback);
            document.updateStatus(DocumentStatus.COMPLETED);
        } else {
            document.markFailed(dto.errorMessage());
        }

        // DB 커밋 후 WebSocket 브로드캐스트 (Phase 7에서 리스너 구현)
        eventPublisher.publishEvent(new DocumentAnalysisCompletedEvent(dto.documentId(), dto.status()));
    }

    @Transactional
    @Override
    public void markDocumentFailed(UUID documentId, String errorMessage) {
        documentRepository.findById(documentId).ifPresent(doc -> {
            doc.markFailed(errorMessage);
            log.warn("[분석 실패 마킹] documentId: {}, 원인: {}", documentId, errorMessage);
        });
    }
}
