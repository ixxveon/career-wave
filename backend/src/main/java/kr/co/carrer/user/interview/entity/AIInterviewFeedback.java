package kr.co.carrer.user.interview.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.UUID;

@Getter
@Entity
@Table(name = "ai_interview_feedbacks")
@org.hibernate.annotations.Check(constraints =
        "(relevance_score IS NULL OR (relevance_score >= 0 AND relevance_score <= 100)) AND " +
        "(depth_score IS NULL OR (depth_score >= 0 AND depth_score <= 100)) AND " +
        "(delivery_score IS NULL OR (delivery_score >= 0 AND delivery_score <= 100)) AND " +
        "(fluency_score IS NULL OR (fluency_score >= 0 AND fluency_score <= 100)) AND " +
        "(voice_quality_ratio IS NULL OR (voice_quality_ratio >= 0.00 AND voice_quality_ratio <= 100.00))"
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AIInterviewFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "interview_feedback_id")
    private Long interviewFeedbackId;

    @Column(name = "session_id", columnDefinition = "uuid", nullable = false)
    private UUID sessionId;

    @Column(name = "question_order", nullable = false)
    private Integer questionOrder;

    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    private String questionText;

    @Column(name = "answer_text", nullable = false, columnDefinition = "TEXT")
    private String answerText;

    @Column(name = "relevance_score")
    private Integer relevanceScore;

    @Column(name = "depth_score")
    private Integer depthScore;

    @Column(name = "delivery_score")
    private Integer deliveryScore;

    @Column(name = "fluency_score")
    private Integer fluencyScore;

    @Column(name = "voice_quality_ratio", precision = 5, scale = 2)
    private BigDecimal voiceQualityRatio;

    @Column(name = "ai_feedback", columnDefinition = "TEXT")
    private String aiFeedback;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = ZonedDateTime.now();
    }

    public static AIInterviewFeedback create(
            UUID sessionId,
            Integer questionOrder,
            String questionText,
            String answerText,
            Integer relevanceScore,
            Integer depthScore,
            Integer deliveryScore,
            Integer fluencyScore,
            BigDecimal voiceQualityRatio,
            String aiFeedback
    ) {
        AIInterviewFeedback feedback = new AIInterviewFeedback();
        feedback.sessionId = sessionId;
        feedback.questionOrder = questionOrder;
        feedback.questionText = questionText;
        feedback.answerText = answerText;
        feedback.relevanceScore = relevanceScore;
        feedback.depthScore = depthScore;
        feedback.deliveryScore = deliveryScore;
        feedback.fluencyScore = fluencyScore;
        feedback.voiceQualityRatio = voiceQualityRatio;
        feedback.aiFeedback = aiFeedback;
        return feedback;
    }

    public void maskVoiceScores() {
        this.deliveryScore = null;
        this.fluencyScore = null;
    }
}
