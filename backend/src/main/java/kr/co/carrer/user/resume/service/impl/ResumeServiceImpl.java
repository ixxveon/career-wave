package kr.co.carrer.user.resume.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.global.s3.S3Uploader;
import kr.co.carrer.user.billing.service.EntitlementService;
import kr.co.carrer.user.billing.type.ResourceType;
import kr.co.carrer.user.resume.dto.ResumeDTO;
import kr.co.carrer.user.resume.entity.CoverLetterContent;
import kr.co.carrer.user.resume.entity.CoverLetterMeta;
import kr.co.carrer.user.resume.entity.Document;
import kr.co.carrer.user.resume.entity.DocumentFeedback;
import kr.co.carrer.user.resume.event.DocumentAnalysisCompletedEvent;
import kr.co.carrer.user.resume.event.DocumentAnalysisTriggerEvent;
import kr.co.carrer.user.resume.exception.ResumeErrorCode;
import kr.co.carrer.user.resume.repository.CoverLetterContentRepository;
import kr.co.carrer.user.resume.repository.CoverLetterMetaRepository;
import kr.co.carrer.user.resume.repository.DocumentFeedbackRepository;
import kr.co.carrer.user.resume.repository.DocumentRepository;
import kr.co.carrer.user.resume.service.DocumentStatusService;
import kr.co.carrer.user.resume.service.FileValidator;
import kr.co.carrer.user.resume.service.ResumeService;
import kr.co.carrer.user.resume.type.DocumentStatus;
import kr.co.carrer.user.resume.type.FileType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

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
    private final ObjectMapper objectMapper;
    private final DocumentStatusService documentStatusService;
    private final ApplicationEventPublisher eventPublisher;
    private final EntitlementService entitlementService;

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

        entitlementService.reserve(memberId, "document-coaching", ResourceType.DOCUMENT, document.getDocumentId());

        eventPublisher.publishEvent(DocumentAnalysisTriggerEvent.ofResume(document.getDocumentId(), fileUrl, originalName));

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
        Set<Integer> orderSet = new HashSet<>();
        dto.content().forEach(item -> {
            if (!orderSet.add(item.order())) {
                throw new CustomException(ResumeErrorCode.DUPLICATE_CONTENT_ORDER);
            }
        });

        Document document = Document.ofCoverLetter(memberId);
        documentRepository.save(document);

        entitlementService.reserve(memberId, "document-coaching", ResourceType.DOCUMENT, document.getDocumentId());

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

        eventPublisher.publishEvent(DocumentAnalysisTriggerEvent.ofCoverLetter(
                document.getDocumentId(), dto.company(), dto.job(), dto.content()
        ));

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

    @Transactional
    @Override
    public void receiveWebhook(UUID documentId, String webhookSecret, ResumeDTO.RequestWebhook dto) {
        if (!configuredWebhookSecret.equals(webhookSecret)) {
            throw new CustomException(ResumeErrorCode.WEBHOOK_SECRET_INVALID);
        }

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new CustomException(ResumeErrorCode.DOCUMENT_NOT_FOUND));

        // 멱등성 처리 — 이미 최종 상태면 DB 갱신 없이 반환
        if (document.getStatus() == DocumentStatus.COMPLETED || document.getStatus() == DocumentStatus.FAILED) {
            log.info("[Webhook 멱등성] 이미 처리된 documentId: {}, 현재 상태: {}", documentId, document.getStatus());
            return;
        }

        if ("PENDING".equals(dto.status()) || "ANALYZING".equals(dto.status())) {
            // 중간 상태 — DB 갱신 없이 WebSocket 브로드캐스트만
            log.info("[Webhook] 중간 상태 수신 — documentId: {}, status: {}", documentId, dto.status());
            eventPublisher.publishEvent(new DocumentAnalysisCompletedEvent(documentId, dto.status()));
            return;
        }

        if ("COMPLETED".equals(dto.status())) {
            DocumentFeedback feedback = DocumentFeedback.of(
                    documentId,
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
            entitlementService.consume(ResourceType.DOCUMENT, documentId);
        } else if ("FAILED".equals(dto.status())) {
            document.markFailed(dto.errorMessage());
            entitlementService.release(ResourceType.DOCUMENT, documentId);
        } else {
            throw new CustomException(ResumeErrorCode.WEBHOOK_INVALID_STATUS);
        }

        // DB 커밋 후 WebSocket 브로드캐스트
        eventPublisher.publishEvent(new DocumentAnalysisCompletedEvent(documentId, dto.status()));
    }

    @Override
    @Transactional(readOnly = true)
    public ResumeDTO.ResponseQuota getQuota(UUID memberId) {
        ZonedDateTime firstDayOfMonth = ZonedDateTime.now(ZoneId.of("Asia/Seoul")).withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
        int usedCount = documentRepository.countUsedThisMonth(memberId, firstDayOfMonth, DocumentStatus.FAILED);
        return new ResumeDTO.ResponseQuota(usedCount, 30);
    }

    private List<ResumeDTO.ResponseFeedback.FeedbackDetail> parseFeedbackDetails(String feedbackText, UUID documentId) {
        if (feedbackText == null) {
            log.error("[피드백 파싱 실패] feedbackText가 null입니다 — documentId: {}", documentId);
            throw new CustomException(ResumeErrorCode.FEEDBACK_PARSE_ERROR);
        }
        try {
            return List.of(objectMapper.readValue(feedbackText, ResumeDTO.ResponseFeedback.FeedbackDetail[].class));
        } catch (JsonProcessingException e) {
            log.error("[피드백 파싱 실패] documentId: {}, 원인: {}", documentId, e.getMessage());
            throw new CustomException(ResumeErrorCode.FEEDBACK_PARSE_ERROR);
        }
    }
}
