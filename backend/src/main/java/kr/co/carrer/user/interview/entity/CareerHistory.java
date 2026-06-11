package kr.co.carrer.user.interview.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.UUID;

@Getter
@Entity
@Table(name = "career_histories")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CareerHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "career_history_id")
    private Long careerHistoryId;

    @Column(name = "member_id", columnDefinition = "uuid", nullable = false)
    private UUID memberId;

    @Column(name = "session_id", columnDefinition = "uuid", nullable = false)
    private UUID sessionId;

    @Column(name = "document_id", columnDefinition = "uuid")
    private UUID documentId;

    @Column(name = "total_score")
    private Integer totalScore;

    @Column(name = "feedback", columnDefinition = "TEXT")
    private String feedback;

    @Column(name = "pdf_url", length = 500)
    private String pdfUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = ZonedDateTime.now();
    }

    public static CareerHistory create(UUID memberId, UUID sessionId, UUID documentId, Integer totalScore, String feedback) {
        CareerHistory history = new CareerHistory();
        history.memberId = memberId;
        history.sessionId = sessionId;
        history.documentId = documentId;
        history.totalScore = totalScore;
        history.feedback = feedback;
        return history;
    }
}
