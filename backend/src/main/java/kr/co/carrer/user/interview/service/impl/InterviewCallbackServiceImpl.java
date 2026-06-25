package kr.co.carrer.user.interview.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import kr.co.carrer.user.billing.service.EntitlementService;
import kr.co.carrer.user.billing.type.ResourceType;
import kr.co.carrer.user.interview.dto.InterviewDTO;
import kr.co.carrer.user.interview.entity.AIInterviewFeedback;
import kr.co.carrer.user.interview.entity.CareerHistory;
import kr.co.carrer.user.interview.entity.InterviewMessage;
import kr.co.carrer.user.interview.entity.InterviewSession;
import kr.co.carrer.user.interview.exception.InterviewErrorCode;
import kr.co.carrer.user.interview.repository.AIInterviewFeedbackRepository;
import kr.co.carrer.user.interview.repository.CareerHistoryRepository;
import kr.co.carrer.user.interview.repository.InterviewMessageRepository;
import kr.co.carrer.user.interview.repository.InterviewSessionRepository;
import kr.co.carrer.user.interview.service.InterviewCallbackService;
import kr.co.carrer.user.interview.type.MessageSender;
import kr.co.carrer.user.interview.websocket.WebSocketMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
public class InterviewCallbackServiceImpl implements InterviewCallbackService {

    private final InterviewSessionRepository sessionRepository;
    private final AIInterviewFeedbackRepository feedbackRepository;
    private final CareerHistoryRepository careerHistoryRepository;
    private final InterviewMessageRepository messageRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final EntitlementService entitlementService;

    // SimpMessagingTemplate은 WebSocket 브로커 초기화 이후에만 사용 가능하므로 @Lazy 주입
    @Autowired
    public InterviewCallbackServiceImpl(
            InterviewSessionRepository sessionRepository,
            AIInterviewFeedbackRepository feedbackRepository,
            CareerHistoryRepository careerHistoryRepository,
            InterviewMessageRepository messageRepository,
            @Lazy SimpMessagingTemplate messagingTemplate,
            EntitlementService entitlementService
    ) {
        this.sessionRepository = sessionRepository;
        this.feedbackRepository = feedbackRepository;
        this.careerHistoryRepository = careerHistoryRepository;
        this.messageRepository = messageRepository;
        this.messagingTemplate = messagingTemplate;
        this.entitlementService = entitlementService;
    }

    @Override
    @Transactional
    public void processQuestionCallback(UUID sessionId, InterviewDTO.RequestQuestionCallback dto) {
        boolean alreadySaved = messageRepository.existsBySessionIdAndSenderAndQuestionOrder(
                sessionId, MessageSender.AI, dto.questionOrder());
        if (alreadySaved) {
            log.info("Question callback deduplicated (idempotent): sessionId={}, order={}", sessionId, dto.questionOrder());
            return;
        }
        try {
            messageRepository.save(InterviewMessage.createQuestion(sessionId, dto.questionOrder(), dto.questionText()));
        } catch (DataIntegrityViolationException e) {
            // 동시 요청으로 유니크 제약 위반 — 멱등 처리
            log.info("Question callback deduplicated (concurrent): sessionId={}, order={}", sessionId, dto.questionOrder());
            return;
        }
        messagingTemplate.convertAndSend(
                "/topic/interview/" + sessionId,
                WebSocketMessage.question(dto.questionOrder(), dto.questionText(), dto.questionType())
        );
        log.info("QUESTION saved & sent via STOMP: sessionId={}, order={}, type={}", sessionId, dto.questionOrder(), dto.questionType());
    }

    @Override
    @Transactional
    public void processReportCallback(UUID sessionId, InterviewDTO.RequestReportCallback dto) {
        String reportUrl = "/api/v1/user/interview/sessions/" + sessionId + "/report";

        boolean alreadyProcessed = feedbackRepository.existsBySessionId(sessionId);

        if (alreadyProcessed) {
            log.info("Report callback already processed (idempotent): sessionId={}", sessionId);
        } else {
            saveReportData(sessionId, dto);
            try {
                entitlementService.consume(ResourceType.INTERVIEW_SESSION, sessionId);
            } catch (CustomException e) {
                if (e.getErrorCode() == BillingErrorCode.SERVICE_USAGE_NOT_RESERVED) {
                    log.warn("Late report callback: consume skipped (already released or timeout). sessionId={}", sessionId);
                } else {
                    throw e;
                }
            }
        }

        // 신규 처리일 때만 REPORT_READY 전송 — 멱등 경로 중복 전송 방지
        if (!alreadyProcessed) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    sendReportReady(sessionId, reportUrl);
                }
            });
        }
    }

    private void sendReportReady(UUID sessionId, String reportUrl) {
        // /user/queue/interview/{sessionId} 구독자에게 전송
        messagingTemplate.convertAndSend(
                "/topic/interview/" + sessionId,
                WebSocketMessage.reportReady(reportUrl)
        );
        log.info("REPORT_READY sent: sessionId={}", sessionId);
    }

    private void saveReportData(UUID sessionId, InterviewDTO.RequestReportCallback dto) {
        InterviewSession session = sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new CustomException(InterviewErrorCode.INTERVIEW_SESSION_NOT_FOUND));

        List<AIInterviewFeedback> feedbacks = dto.feedbacks().stream()
                .map(f -> AIInterviewFeedback.create(
                        sessionId,
                        f.questionOrder(),
                        f.questionText(),
                        f.answerText(),
                        f.relevanceScore(),
                        f.depthScore(),
                        f.deliveryScore(),
                        f.fluencyScore(),
                        f.voiceQualityRatio(),
                        f.aiFeedback()
                )).toList();

        feedbackRepository.saveAll(feedbacks);
        session.updateTotalScore(dto.totalScore());

        CareerHistory history = CareerHistory.create(
                session.getMemberId(),
                sessionId,
                session.getDocumentId(),
                dto.totalScore(),
                null
        );
        careerHistoryRepository.save(history);

        log.info("Report saved: sessionId={}, feedbacks={}", sessionId, feedbacks.size());
    }
}
