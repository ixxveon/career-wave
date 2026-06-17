package kr.co.carrer.user.interview.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.interview.dto.InterviewDTO;
import kr.co.carrer.user.interview.entity.AIInterviewFeedback;
import kr.co.carrer.user.interview.entity.InterviewSession;
import kr.co.carrer.user.interview.exception.InterviewErrorCode;
import kr.co.carrer.user.interview.repository.AIInterviewFeedbackRepository;
import kr.co.carrer.user.interview.repository.InterviewSessionRepository;
import kr.co.carrer.user.interview.type.SessionType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class InterviewReportServiceImplTest {

    @InjectMocks
    private InterviewReportServiceImpl interviewReportService;

    @Mock private InterviewSessionRepository sessionRepository;
    @Mock private AIInterviewFeedbackRepository feedbackRepository;

    @Nested
    @DisplayName("리포트 조회 - getReport()")
    class GetReport {

        @Test
        @DisplayName("voiceQualityRatio = 50.00이면 deliveryScore / fluencyScore를 정상 반환한다")
        void getReport_voiceQuality50_returnsScores() {
            UUID memberId = UUID.randomUUID();
            UUID sessionId = UUID.randomUUID();
            InterviewSession session = InterviewSession.create(memberId, null, SessionType.VOICE, null, null);
            AIInterviewFeedback feedback = AIInterviewFeedback.create(
                    sessionId, 1, "질문", "답변", 80, 70, 75, 65,
                    new BigDecimal("50.00"), "피드백"
            );

            given(sessionRepository.findBySessionIdAndMemberId(sessionId, memberId)).willReturn(Optional.of(session));
            given(feedbackRepository.existsBySessionId(sessionId)).willReturn(true);
            given(feedbackRepository.findBySessionIdOrderByQuestionOrderAsc(sessionId)).willReturn(List.of(feedback));

            InterviewDTO.ResponseReport result = interviewReportService.getReport(memberId, sessionId);

            assertThat(result.feedbacks()).hasSize(1);
            assertThat(result.feedbacks().get(0).deliveryScore()).isEqualTo(75);
            assertThat(result.feedbacks().get(0).fluencyScore()).isEqualTo(65);
        }

        @Test
        @DisplayName("voiceQualityRatio = 49.99이면 deliveryScore / fluencyScore가 null이다")
        void getReport_voiceQualityBelow50_masksScores() {
            UUID memberId = UUID.randomUUID();
            UUID sessionId = UUID.randomUUID();
            InterviewSession session = InterviewSession.create(memberId, null, SessionType.VOICE, null, null);
            AIInterviewFeedback feedback = AIInterviewFeedback.create(
                    sessionId, 1, "질문", "답변", 80, 70, 75, 65,
                    new BigDecimal("49.99"), "피드백"
            );

            given(sessionRepository.findBySessionIdAndMemberId(sessionId, memberId)).willReturn(Optional.of(session));
            given(feedbackRepository.existsBySessionId(sessionId)).willReturn(true);
            given(feedbackRepository.findBySessionIdOrderByQuestionOrderAsc(sessionId)).willReturn(List.of(feedback));

            InterviewDTO.ResponseReport result = interviewReportService.getReport(memberId, sessionId);

            assertThat(result.feedbacks().get(0).deliveryScore()).isNull();
            assertThat(result.feedbacks().get(0).fluencyScore()).isNull();
        }

        @Test
        @DisplayName("voiceQualityRatio가 null이면 deliveryScore / fluencyScore가 null이다")
        void getReport_voiceQualityNull_masksScores() {
            UUID memberId = UUID.randomUUID();
            UUID sessionId = UUID.randomUUID();
            InterviewSession session = InterviewSession.create(memberId, null, SessionType.TEXT, null, null);
            AIInterviewFeedback feedback = AIInterviewFeedback.create(
                    sessionId, 1, "질문", "답변", 80, 70, null, null,
                    null, "피드백"
            );

            given(sessionRepository.findBySessionIdAndMemberId(sessionId, memberId)).willReturn(Optional.of(session));
            given(feedbackRepository.existsBySessionId(sessionId)).willReturn(true);
            given(feedbackRepository.findBySessionIdOrderByQuestionOrderAsc(sessionId)).willReturn(List.of(feedback));

            InterviewDTO.ResponseReport result = interviewReportService.getReport(memberId, sessionId);

            assertThat(result.feedbacks().get(0).deliveryScore()).isNull();
            assertThat(result.feedbacks().get(0).fluencyScore()).isNull();
        }

        @Test
        @DisplayName("리포트 미완료 시 INTERVIEW_REPORT_NOT_READY(409)를 던진다")
        void getReport_notReady_throwsException() {
            UUID memberId = UUID.randomUUID();
            UUID sessionId = UUID.randomUUID();
            InterviewSession session = InterviewSession.create(memberId, null, SessionType.VOICE, null, null);

            given(sessionRepository.findBySessionIdAndMemberId(sessionId, memberId)).willReturn(Optional.of(session));
            given(feedbackRepository.existsBySessionId(sessionId)).willReturn(false);

            assertThatThrownBy(() -> interviewReportService.getReport(memberId, sessionId))
                    .isInstanceOf(CustomException.class)
                    .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                            .isEqualTo(InterviewErrorCode.INTERVIEW_REPORT_NOT_READY));
        }

        @Test
        @DisplayName("타인 세션 조회 시 INTERVIEW_SESSION_FORBIDDEN(403)을 던진다")
        void getReport_forbidden_throwsException() {
            UUID memberId = UUID.randomUUID();
            UUID sessionId = UUID.randomUUID();

            given(sessionRepository.findBySessionIdAndMemberId(sessionId, memberId)).willReturn(Optional.empty());

            assertThatThrownBy(() -> interviewReportService.getReport(memberId, sessionId))
                    .isInstanceOf(CustomException.class)
                    .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                            .isEqualTo(InterviewErrorCode.INTERVIEW_SESSION_FORBIDDEN));
        }
    }
}
