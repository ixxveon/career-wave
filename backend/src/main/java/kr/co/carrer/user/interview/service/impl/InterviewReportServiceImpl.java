package kr.co.carrer.user.interview.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.interview.dto.InterviewDTO;
import kr.co.carrer.user.interview.entity.AIInterviewFeedback;
import kr.co.carrer.user.interview.entity.InterviewSession;
import kr.co.carrer.user.interview.exception.InterviewErrorCode;
import kr.co.carrer.user.interview.repository.AIInterviewFeedbackRepository;
import kr.co.carrer.user.interview.repository.InterviewSessionRepository;
import kr.co.carrer.user.interview.service.InterviewReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InterviewReportServiceImpl implements InterviewReportService {

    private static final BigDecimal VOICE_QUALITY_THRESHOLD = new BigDecimal("50.00");

    private final InterviewSessionRepository sessionRepository;
    private final AIInterviewFeedbackRepository feedbackRepository;

    @Override
    @Transactional(readOnly = true)
    public InterviewDTO.ResponseReport getReport(UUID memberId, UUID sessionId) {
        InterviewSession session = sessionRepository.findBySessionIdAndMemberId(sessionId, memberId)
                .orElseThrow(() -> new CustomException(InterviewErrorCode.INTERVIEW_SESSION_FORBIDDEN));

        if (!feedbackRepository.existsBySessionId(sessionId)) {
            throw new CustomException(
                    InterviewErrorCode.INTERVIEW_REPORT_NOT_READY,
                    new InterviewDTO.ResponseReportNotReady("ANALYZING", 15)
            );
        }

        List<AIInterviewFeedback> feedbacks = feedbackRepository.findBySessionIdOrderByQuestionOrderAsc(sessionId);

        List<InterviewDTO.FeedbackItem> feedbackItems = feedbacks.stream()
                .map(this::toFeedbackItem)
                .toList();

        return new InterviewDTO.ResponseReport(
                session.getSessionId().toString(),
                session.getSessionStatus().name(),
                session.getSessionType().name(),
                session.getTotalScore(),
                feedbackItems,
                session.getCreatedAt()
        );
    }

    private InterviewDTO.FeedbackItem toFeedbackItem(AIInterviewFeedback feedback) {
        boolean voiceQualityInsufficient = feedback.getVoiceQualityRatio() == null
                || feedback.getVoiceQualityRatio().compareTo(VOICE_QUALITY_THRESHOLD) < 0;

        return new InterviewDTO.FeedbackItem(
                feedback.getQuestionOrder(),
                feedback.getQuestionText(),
                feedback.getAnswerText(),
                feedback.getRelevanceScore(),
                feedback.getDepthScore(),
                voiceQualityInsufficient ? null : feedback.getDeliveryScore(),
                voiceQualityInsufficient ? null : feedback.getFluencyScore(),
                feedback.getVoiceQualityRatio(),
                feedback.getAiFeedback(),
                feedback.getCreatedAt()
        );
    }
}
