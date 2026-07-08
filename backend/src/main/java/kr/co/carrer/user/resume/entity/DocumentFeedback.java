package kr.co.carrer.user.resume.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "document_feedbacks",
    uniqueConstraints = @UniqueConstraint(name = "uq_document_feedbacks_document_id", columnNames = "document_id")
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DocumentFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "document_feedback_id")
    private Long documentFeedbackId;

    @Column(name = "document_id", nullable = false, columnDefinition = "UUID")
    private UUID documentId;

    @Column(name = "score_job_fitness")
    private Integer scoreJobFitness;

    @Column(name = "score_tech_stack")
    private Integer scoreTechStack;

    @Column(name = "score_quantified")
    private Integer scoreQuantified;

    @Column(name = "score_logical")
    private Integer scoreLogical;

    @Column(name = "score_total")
    private Integer scoreTotal;

    @Column(name = "overall_review", columnDefinition = "TEXT")
    private String overallReview;

    @Column(name = "feedback_text", nullable = false, columnDefinition = "TEXT")
    private String feedbackText;

    @Column(name = "recommended_keywords", columnDefinition = "TEXT")
    private String recommendedKeywords;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    public static DocumentFeedback of(
            UUID documentId,
            Integer scoreJobFitness,
            Integer scoreTechStack,
            Integer scoreQuantified,
            Integer scoreLogical,
            Integer scoreTotal,
            String overallReview,
            String feedbackText,
            String recommendedKeywords
    ) {
        DocumentFeedback feedback = new DocumentFeedback();
        feedback.documentId = documentId;
        feedback.scoreJobFitness = scoreJobFitness;
        feedback.scoreTechStack = scoreTechStack;
        feedback.scoreQuantified = scoreQuantified;
        feedback.scoreLogical = scoreLogical;
        feedback.scoreTotal = scoreTotal;
        feedback.overallReview = overallReview;
        feedback.feedbackText = feedbackText;
        feedback.recommendedKeywords = recommendedKeywords;
        feedback.createdAt = ZonedDateTime.now();
        return feedback;
    }
}
