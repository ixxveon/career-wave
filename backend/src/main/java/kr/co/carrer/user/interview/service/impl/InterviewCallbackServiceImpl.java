package kr.co.carrer.user.interview.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.interview.dto.InterviewDTO;
import kr.co.carrer.user.interview.entity.AIInterviewFeedback;
import kr.co.carrer.user.interview.entity.CareerHistory;
import kr.co.carrer.user.interview.entity.InterviewSession;
import kr.co.carrer.user.interview.exception.InterviewErrorCode;
import kr.co.carrer.user.interview.repository.AIInterviewFeedbackRepository;
import kr.co.carrer.user.interview.repository.CareerHistoryRepository;
import kr.co.carrer.user.interview.repository.InterviewSessionRepository;
import kr.co.carrer.user.interview.service.InterviewCallbackService;
import kr.co.carrer.user.interview.websocket.InterviewWebSocketHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class InterviewCallbackServiceImpl implements InterviewCallbackService {

    private final InterviewSessionRepository sessionRepository;
    private final AIInterviewFeedbackRepository feedbackRepository;
    private final CareerHistoryRepository careerHistoryRepository;
    private final InterviewWebSocketHandler webSocketHandler;

    @Override
    public void processReportCallback(UUID sessionId, InterviewDTO.RequestReportCallback dto) {
        String reportUrl = "/api/v1/user/interview/sessions/" + sessionId + "/report";

        // 멱등성 체크 — 이미 저장된 피드백이 있으면 REPORT_READY만 재전송
        if (feedbackRepository.existsBySessionId(sessionId)) {
            log.info("Report callback already processed (idempotent): sessionId={}", sessionId);
            webSocketHandler.sendReportReady(sessionId.toString(), reportUrl);
            return;
        }

        saveReportData(sessionId, dto);
        webSocketHandler.sendReportReady(sessionId.toString(), reportUrl);
    }

    @Transactional
    protected void saveReportData(UUID sessionId, InterviewDTO.RequestReportCallback dto) {
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
