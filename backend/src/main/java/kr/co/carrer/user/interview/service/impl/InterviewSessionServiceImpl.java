package kr.co.carrer.user.interview.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.service.EntitlementService;
import kr.co.carrer.user.billing.type.ResourceType;
import kr.co.carrer.user.interview.client.InterviewFastApiClient;
import kr.co.carrer.user.interview.dto.InterviewDTO;
import kr.co.carrer.user.interview.entity.InterviewMessage;
import kr.co.carrer.user.interview.entity.InterviewSession;
import kr.co.carrer.user.interview.exception.InterviewErrorCode;
import kr.co.carrer.user.interview.repository.InterviewMessageRepository;
import kr.co.carrer.user.interview.repository.InterviewSessionRepository;
import kr.co.carrer.user.interview.type.MessageSender;
import kr.co.carrer.user.interview.type.MessageType;
import kr.co.carrer.user.interview.service.InterviewSessionService;
import kr.co.carrer.user.interview.type.InterviewType;
import kr.co.carrer.user.interview.type.MessageSender;
import kr.co.carrer.user.interview.type.MessageType;
import kr.co.carrer.user.interview.type.SessionStatus;
import kr.co.carrer.user.interview.type.SessionType;
import kr.co.carrer.user.resume.entity.Document;
import kr.co.carrer.user.resume.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class InterviewSessionServiceImpl implements InterviewSessionService {

    private final InterviewSessionRepository sessionRepository;
    private final InterviewMessageRepository messageRepository;
    private final DocumentRepository documentRepository;
    private final InterviewFastApiClient fastApiClient;
    private final EntitlementService entitlementService;

    @Override
    @Transactional
    public InterviewDTO.ResponseStartSession startSession(UUID memberId, InterviewDTO.RequestStartSession dto) {
        SessionType sessionType = parseSessionType(dto.sessionType());
        InterviewType interviewType = parseInterviewType(dto.interviewType());
        UUID documentId = parseDocumentId(dto.documentId());

        sessionRepository.findInProgressByMemberId(memberId, SessionStatus.IN_PROGRESS)
                .ifPresent(s -> {
                    s.fail(ZonedDateTime.now(ZoneId.of("Asia/Seoul")));
                    log.info("기존 진행 중인 세션 자동 종료: sessionId={}", s.getSessionId());
                });

        String fileUrl = null;
        if (documentId != null) {
            Document document = documentRepository.findByDocumentIdAndMemberId(documentId, memberId)
                    .orElseThrow(() -> new CustomException(InterviewErrorCode.INTERVIEW_DOCUMENT_NOT_FOUND));
            fileUrl = document.getFileUrl();
        }

        InterviewSession saved = saveNewSession(memberId, documentId, sessionType, interviewType, dto.targetCompany());

        entitlementService.reserve(memberId, "interview", ResourceType.INTERVIEW_SESSION, saved.getSessionId());

        UUID sessionId = saved.getSessionId();
        String finalSessionType = sessionType.name();
        String finalInterviewType = interviewType != null ? interviewType.name() : null;
        UUID finalDocumentId = documentId;
        String finalFileUrl = fileUrl;

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    if (finalDocumentId != null) {
                        fastApiClient.triggerRagContext(sessionId, memberId, finalDocumentId, finalFileUrl);
                    }

                    fastApiClient.triggerLlmPipeline(
                            sessionId,
                            memberId,
                            0,
                            "",
                            "",
                            finalSessionType,
                            finalInterviewType
                    );
                }
            });
        }

        return new InterviewDTO.ResponseStartSession(
                saved.getSessionId().toString(),
                saved.getSessionStatus().name(),
                saved.getSessionType().name(),
                documentId != null ? documentId.toString() : null,
                saved.getCreatedAt()
        );
    }

    @Transactional
    protected InterviewSession saveNewSession(UUID memberId, UUID documentId, SessionType sessionType, InterviewType interviewType, String targetCompany) {
        InterviewSession session = InterviewSession.create(memberId, documentId, sessionType, interviewType, targetCompany);
        return sessionRepository.save(session);
    }

    @Override
    @Transactional
    public InterviewDTO.ResponseSubmitTextAnswer submitTextAnswer(UUID memberId, UUID sessionId, InterviewDTO.RequestSubmitTextAnswer dto) {
        InterviewSession session = sessionRepository.findBySessionIdAndMemberId(sessionId, memberId)
                .orElseThrow(() -> new CustomException(InterviewErrorCode.INTERVIEW_SESSION_FORBIDDEN));

        if (!session.isInProgress()) {
            throw new CustomException(InterviewErrorCode.INTERVIEW_SESSION_ALREADY_ENDED);
        }

        InterviewMessage saved = messageRepository.save(InterviewMessage.createAnswer(sessionId, dto.messageContent()));

        int questionOrder = dto.questionOrder();
        String answerText = dto.messageContent();
        String sessionType = session.getSessionType().name();
        String interviewType = session.getInterviewType() != null ? session.getInterviewType().name() : null;
        String questionText = messageRepository
                .findTopBySessionIdAndSenderAndMessageTypeOrderByCreatedAtDesc(sessionId, MessageSender.AI, MessageType.QUESTION)
                .map(InterviewMessage::getMessageContent)
                .orElse("");

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    fastApiClient.triggerLlmPipeline(sessionId, memberId, questionOrder, answerText, questionText, sessionType, interviewType);
                }
            });
        }

        return new InterviewDTO.ResponseSubmitTextAnswer(saved.getMessageId(), saved.getCreatedAt());
    }

    private static final List<String> ALLOWED_AUDIO_TYPES = List.of("audio/webm", "audio/mp4", "audio/ogg");

    @Override
    public InterviewDTO.ResponseSubmitVoiceChunk submitVoiceChunk(UUID memberId, UUID sessionId, MultipartFile audioChunk, int questionOrder, int chunkIndex, boolean isFinal) {
        validateAudioContentType(audioChunk);
        validateSessionOwnership(memberId, sessionId);
        fastApiClient.triggerSttPipeline(sessionId, audioChunk, questionOrder, chunkIndex, isFinal);
        return new InterviewDTO.ResponseSubmitVoiceChunk(chunkIndex, true);
    }

    @Override
    @Transactional(readOnly = true)
    public void verifySessionOwnership(UUID memberId, UUID sessionId) {
        validateSessionOwnership(memberId, sessionId);
    }

    @Transactional(readOnly = true)
    protected void validateSessionOwnership(UUID memberId, UUID sessionId) {
        InterviewSession session = sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new CustomException(InterviewErrorCode.INTERVIEW_SESSION_NOT_FOUND));
        if (!session.getMemberId().equals(memberId)) {
            throw new CustomException(InterviewErrorCode.INTERVIEW_SESSION_FORBIDDEN);
        }
        if (!session.isInProgress()) {
            throw new CustomException(InterviewErrorCode.INTERVIEW_SESSION_ALREADY_ENDED);
        }
    }

    private void validateAudioContentType(MultipartFile audioChunk) {
        if (audioChunk.isEmpty()) {
            throw new CustomException(InterviewErrorCode.INTERVIEW_INVALID_AUDIO_FORMAT);
        }
        String contentType = audioChunk.getContentType();
        boolean allowed = contentType != null && ALLOWED_AUDIO_TYPES.stream()
                .anyMatch(contentType::startsWith);
        if (!allowed) {
            throw new CustomException(InterviewErrorCode.INTERVIEW_INVALID_AUDIO_FORMAT);
        }
    }

    @Override
    @Transactional
    public InterviewDTO.ResponseEndSession endSession(UUID memberId, UUID sessionId) {
        InterviewSession session = sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new CustomException(InterviewErrorCode.INTERVIEW_SESSION_NOT_FOUND));

        if (!session.getMemberId().equals(memberId)) {
            throw new CustomException(InterviewErrorCode.INTERVIEW_SESSION_FORBIDDEN);
        }

        if (session.isEnded()) {
            throw new CustomException(InterviewErrorCode.INTERVIEW_SESSION_ALREADY_ENDED);
        }

        ZonedDateTime endedAt = ZonedDateTime.now(ZoneId.of("Asia/Seoul"));
        session.complete(endedAt);

        String sessionType = session.getSessionType().name();

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    fastApiClient.triggerReportGeneration(sessionId, memberId, sessionType);
                }
            });
        }

        return new InterviewDTO.ResponseEndSession(sessionId.toString(), SessionStatus.COMPLETED.name(), endedAt);
    }

    private SessionType parseSessionType(String sessionType) {
        try {
            return SessionType.valueOf(sessionType);
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new CustomException(InterviewErrorCode.INTERVIEW_INVALID_SESSION_TYPE);
        }
    }

    private InterviewType parseInterviewType(String interviewType) {
        if (interviewType == null || interviewType.isBlank()) return null;
        try {
            return InterviewType.valueOf(interviewType);
        } catch (IllegalArgumentException e) {
            throw new CustomException(InterviewErrorCode.INTERVIEW_INVALID_SESSION_TYPE);
        }
    }

    private UUID parseDocumentId(String documentId) {
        if (documentId == null || documentId.isBlank()) return null;
        try {
            return UUID.fromString(documentId);
        } catch (IllegalArgumentException e) {
            throw new CustomException(InterviewErrorCode.INTERVIEW_DOCUMENT_NOT_FOUND);
        }
    }
}
