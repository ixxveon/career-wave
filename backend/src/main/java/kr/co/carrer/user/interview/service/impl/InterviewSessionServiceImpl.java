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
import org.springframework.web.multipart.MultipartFile;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InterviewSessionServiceImpl implements InterviewSessionService {

    private final InterviewSessionRepository sessionRepository;
    private final InterviewMessageRepository messageRepository;
    private final DocumentRepository documentRepository;
    private final InterviewFastApiClient fastApiClient;

    @Override
    public InterviewDTO.ResponseStartSession startSession(UUID memberId, InterviewDTO.RequestStartSession dto) {
        SessionType sessionType = parseSessionType(dto.sessionType());
        InterviewType interviewType = parseInterviewType(dto.interviewType());
        UUID documentId = parseDocumentId(dto.documentId());

        InterviewSession saved = saveNewSession(memberId, documentId, sessionType, interviewType, dto.targetCompany());

        if (documentId != null) {
            fastApiClient.triggerRagContext(saved.getSessionId(), documentId);
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
    public InterviewDTO.ResponseSubmitTextAnswer submitTextAnswer(UUID memberId, UUID sessionId, InterviewDTO.RequestSubmitTextAnswer dto) {
        InterviewMessage saved = saveAnswerMessage(memberId, sessionId, dto);
        fastApiClient.triggerLlmPipeline(sessionId, dto.questionOrder());
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

    private static final List<String> ALLOWED_AUDIO_TYPES = List.of("audio/webm", "audio/mp4", "audio/ogg");

    @Override
    public InterviewDTO.ResponseSubmitVoiceChunk submitVoiceChunk(UUID memberId, UUID sessionId, MultipartFile audioChunk, int questionOrder, int chunkIndex, boolean isFinal) {
        validateAudioContentType(audioChunk);
        validateSessionOwnership(memberId, sessionId);
        fastApiClient.triggerSttPipeline(sessionId, audioChunk, questionOrder, chunkIndex, isFinal);
        return new InterviewDTO.ResponseSubmitVoiceChunk(chunkIndex, true);
    }

    @Transactional(readOnly = true)
    protected void validateSessionOwnership(UUID memberId, UUID sessionId) {
        InterviewSession session = sessionRepository.findBySessionIdAndMemberId(sessionId, memberId)
                .orElseThrow(() -> new CustomException(InterviewErrorCode.INTERVIEW_SESSION_FORBIDDEN));
        if (!session.isInProgress()) {
            throw new CustomException(InterviewErrorCode.INTERVIEW_SESSION_ALREADY_ENDED);
        }
    }

    private void validateAudioContentType(MultipartFile audioChunk) {
        String contentType = audioChunk.getContentType();
        if (contentType == null || !ALLOWED_AUDIO_TYPES.contains(contentType)) {
            throw new CustomException(InterviewErrorCode.INTERVIEW_INVALID_AUDIO_FORMAT);
        }
    }

    @Override
    public InterviewDTO.ResponseEndSession endSession(UUID memberId, UUID sessionId) {
        ZonedDateTime endedAt = completeSession(memberId, sessionId);
        fastApiClient.triggerReportGeneration(sessionId);
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
