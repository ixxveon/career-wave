package kr.co.carrer.user.resume.entity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class DocumentFeedbackTest {

    @Test
    @DisplayName("DocumentFeedback 생성 시 모든 점수 컬럼과 feedbackText가 올바르게 저장된다")
    void of_shouldSetAllFields() {
        UUID documentId = UUID.randomUUID();
        String feedbackText = "[{\"sectionNumber\":1,\"question\":\"자기소개\"}]";
        String overallReview = "전반적으로 우수한 이력서입니다.";

        DocumentFeedback feedback = DocumentFeedback.of(
                documentId, 85, 90, 75, 80, 82, overallReview, feedbackText
        );

        assertThat(feedback.getDocumentId()).isEqualTo(documentId);
        assertThat(feedback.getScoreJobFitness()).isEqualTo(85);
        assertThat(feedback.getScoreTechStack()).isEqualTo(90);
        assertThat(feedback.getScoreQuantified()).isEqualTo(75);
        assertThat(feedback.getScoreLogical()).isEqualTo(80);
        assertThat(feedback.getScoreTotal()).isEqualTo(82);
        assertThat(feedback.getOverallReview()).isEqualTo(overallReview);
        assertThat(feedback.getFeedbackText()).isEqualTo(feedbackText);
        assertThat(feedback.getCreatedAt()).isNotNull();
    }

    @Test
    @DisplayName("점수 컬럼이 null인 DocumentFeedback을 생성할 수 있다 (분석 미완료 대응)")
    void of_withNullScores_shouldBeAllowed() {
        UUID documentId = UUID.randomUUID();

        DocumentFeedback feedback = DocumentFeedback.of(
                documentId, null, null, null, null, null, null, "[]"
        );

        assertThat(feedback.getScoreJobFitness()).isNull();
        assertThat(feedback.getScoreTotal()).isNull();
        assertThat(feedback.getOverallReview()).isNull();
    }
}
