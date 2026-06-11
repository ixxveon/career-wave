package kr.co.carrer.user.interview.entity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class AIInterviewFeedbackTest {

    @Nested
    @DisplayName("피드백 생성 - create()")
    class Create {

        @Test
        @DisplayName("create() 호출 시 모든 필드가 정상 설정된다")
        void create_shouldSetAllFields() {
            UUID sessionId = UUID.randomUUID();

            AIInterviewFeedback feedback = AIInterviewFeedback.create(
                    sessionId, 1, "질문 내용", "답변 내용",
                    85, 70, 80, 75,
                    new BigDecimal("92.50"), "잘 답변했습니다."
            );

            assertThat(feedback.getSessionId()).isEqualTo(sessionId);
            assertThat(feedback.getQuestionOrder()).isEqualTo(1);
            assertThat(feedback.getRelevanceScore()).isEqualTo(85);
            assertThat(feedback.getDepthScore()).isEqualTo(70);
            assertThat(feedback.getDeliveryScore()).isEqualTo(80);
            assertThat(feedback.getFluencyScore()).isEqualTo(75);
            assertThat(feedback.getVoiceQualityRatio()).isEqualByComparingTo(new BigDecimal("92.50"));
        }
    }

    @Nested
    @DisplayName("음성 점수 마스킹 - maskVoiceScores()")
    class MaskVoiceScores {

        @Test
        @DisplayName("maskVoiceScores() 호출 시 deliveryScore와 fluencyScore가 null이 된다")
        void maskVoiceScores_shouldNullifyDeliveryAndFluency() {
            AIInterviewFeedback feedback = AIInterviewFeedback.create(
                    UUID.randomUUID(), 1, "질문", "답변",
                    85, 70, 80, 75,
                    new BigDecimal("40.00"), "피드백"
            );

            feedback.maskVoiceScores();

            assertThat(feedback.getDeliveryScore()).isNull();
            assertThat(feedback.getFluencyScore()).isNull();
            assertThat(feedback.getRelevanceScore()).isEqualTo(85);
            assertThat(feedback.getDepthScore()).isEqualTo(70);
        }
    }
}
