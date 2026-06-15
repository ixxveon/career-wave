package kr.co.carrer.user.interview.entity;

import jakarta.persistence.*;
import kr.co.carrer.user.interview.type.InterviewType;
import kr.co.carrer.user.interview.type.SessionStatus;
import kr.co.carrer.user.interview.type.SessionType;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.UUID;

@Getter
@Entity
@Table(name = "interview_sessions")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InterviewSession {

    @Id
    @Column(name = "session_id", columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID sessionId;

    @Column(name = "member_id", columnDefinition = "uuid")
    private UUID memberId;

    @Column(name = "document_id", columnDefinition = "uuid")
    private UUID documentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "session_type", nullable = false, length = 10)
    private SessionType sessionType;

    @Enumerated(EnumType.STRING)
    @Column(name = "session_status", nullable = false, length = 20)
    private SessionStatus sessionStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "interview_type", length = 20)
    private InterviewType interviewType;

    @Column(name = "target_company", length = 100)
    private String targetCompany;

    @Column(name = "total_score")
    private Integer totalScore;

    @Column(name = "started_at")
    private ZonedDateTime startedAt;

    @Column(name = "ended_at")
    private ZonedDateTime endedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private ZonedDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (sessionId == null) {
            sessionId = UUID.randomUUID();
        }
        ZonedDateTime now = ZonedDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = ZonedDateTime.now();
    }

    public static InterviewSession create(
            UUID memberId,
            UUID documentId,
            SessionType sessionType,
            InterviewType interviewType,
            String targetCompany
    ) {
        InterviewSession session = new InterviewSession();
        session.sessionId = UUID.randomUUID();
        session.memberId = memberId;
        session.documentId = documentId;
        session.sessionType = sessionType;
        session.sessionStatus = SessionStatus.IN_PROGRESS;
        session.interviewType = interviewType;
        session.targetCompany = targetCompany;
        session.startedAt = ZonedDateTime.now();
        session.createdAt = ZonedDateTime.now();
        return session;
    }

    public void complete(ZonedDateTime endedAt) {
        this.sessionStatus = SessionStatus.COMPLETED;
        this.endedAt = endedAt;
    }

    public void fail(ZonedDateTime endedAt) {
        this.sessionStatus = SessionStatus.FAILED;
        this.endedAt = endedAt;
    }

    public void updateTotalScore(Integer totalScore) {
        this.totalScore = totalScore;
    }

    public boolean isInProgress() {
        return SessionStatus.IN_PROGRESS == this.sessionStatus;
    }

    public boolean isCompleted() {
        return SessionStatus.COMPLETED == this.sessionStatus;
    }

    public boolean isEnded() {
        return sessionStatus == SessionStatus.COMPLETED || sessionStatus == SessionStatus.FAILED;
    }
}
