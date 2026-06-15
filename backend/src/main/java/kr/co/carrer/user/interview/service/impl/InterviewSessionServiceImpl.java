package kr.co.carrer.user.interview.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.interview.client.InterviewFastApiClient;
import kr.co.carrer.user.interview.dto.InterviewDTO;
import kr.co.carrer.user.interview.entity.InterviewMessage;
import kr.co.carrer.user.interview.entity.InterviewSession;
import kr.co.carrer.user.interview.exception.InterviewErrorCode;
import kr.co.carrer.user.interview.repository.InterviewMessageRepository;
import kr.co.carrer.user.interview.repository.InterviewSessionRepository;
import kr.co.carrer.user.interview.service.InterviewSessionService;
import kr.co.carrer.user.interview.type.InterviewType;
import kr.co.carrer.user.interview.type.SessionType;
import kr.co.carrer.user.resume.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.ZonedDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InterviewSessionServiceImpl implements InterviewSessionService {

    private final InterviewSessionRepository sessionRepository;
    private final InterviewMessageRepository messageRepository;
    private final DocumentRepository documentRepository;
    private final InterviewFastApiClient fastApiClient;

    @Override
    @Transactional
    public InterviewDTO.ResponseStartSession startSession(UUID memberId, InterviewDTO.RequestStartSession dto) {
        SessionType sessionType = parseSessionType(dto.sessionType());
        InterviewType interviewType = parseInterviewType(dto.interviewType());
        UUID documentId = parseDocumentId(dto.documentId());

        InterviewSession saved = saveNewSession(memberId, documentId, sessionType, interviewType, dto.targetCompany());

        if (documentId != null) {
            UUID sessionId = saved.getSessionId();
            UUID finalDocumentId = documentId;
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    fastApiClient.triggerRagContext(sessionId, finalDocumentId);
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
        if (documentId != null) {
            documentRepository.findByDocumentIdAndMemberId(documentId, memberId)
                    .orElseThrow(() -> new CustomException(InterviewErrorCode.INTERVIEW_DOCUMENT_NOT_FOUND));
        }

        sessionRepository.findInProgressByMemberId(memberId)
                .ifPresent(s -> { throw new CustomException(InterviewErrorCode.INTERVIEW_SESSION_DUPLICATE); });

        InterviewSession session = InterviewSession.create(memberId, documentId, sessionType, interviewType, targetCompany);
        return sessionRepository.save(session);
    }

    @Override
    @Transactional
    public InterviewDTO.ResponseSubmitTextAnswer submitTextAnswer(UUID memberId, UUID sessionId, InterviewDTO.RequestSubmitTextAnswer dto) {
        InterviewMessage saved = saveAnswerMessage(memberId, sessionId, dto);
        int questionOrder = dto.questionOrder();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                fastApiClient.triggerLlmPipeline(sessionId, questionOrder);
            }
        });
        return new InterviewDTO.ResponseSubmitTextAnswer(saved.getMessageId(), saved.getCreatedAt());
    }

    @Transactional
    protected InterviewMessage saveAnswerMessage(UUID memberId, UUID sessionId, InterviewDTO.RequestSubmitTextAnswer dto) {
        InterviewSession session = sessionRepository.findBySessionIdAndMemberId(sessionId, memberId)
                .orElseThrow(() -> new CustomException(InterviewErrorCode.INTERVIEW_SESSION_FORBIDDEN));

        if (!session.isInProgress()) {
            throw new CustomException(InterviewErrorCode.INTERVIEW_SESSION_ALREADY_ENDED);
        }

        InterviewMessage message = InterviewMessage.createAnswer(sessionId, dto.messageContent());
        return messageRepository.save(message);
    }

    @Override
    @Transactional
    public InterviewDTO.ResponseEndSession endSession(UUID memberId, UUID sessionId) {
        ZonedDateTime endedAt = completeSession(memberId, sessionId);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                fastApiClient.triggerReportGeneration(sessionId);
            }
        });
        return new InterviewDTO.ResponseEndSession(sessionId.toString(), "COMPLETED", endedAt);
    }

    @Transactional
    protected ZonedDateTime completeSession(UUID memberId, UUID sessionId) {
        InterviewSession session = sessionRepository.findBySessionIdAndMemberId(sessionId, memberId)
                .orElseThrow(() -> new CustomException(InterviewErrorCode.INTERVIEW_SESSION_FORBIDDEN));

        if (session.isEnded()) {
            throw new CustomException(InterviewErrorCode.INTERVIEW_SESSION_ALREADY_ENDED);
        }

        ZonedDateTime endedAt = ZonedDateTime.now();
        session.complete(endedAt);
        return endedAt;
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
