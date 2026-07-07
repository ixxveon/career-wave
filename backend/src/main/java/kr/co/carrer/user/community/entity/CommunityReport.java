package kr.co.carrer.user.community.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import kr.co.carrer.user.community.type.ReportReason;
import kr.co.carrer.user.community.type.ReportStatus;
import kr.co.carrer.user.community.type.ReportTargetType;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;

@Entity(name = "CommunityReport")
@Table(
        name = "reports",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_reports_reporter_target",
                columnNames = {"reporter_id", "target_type", "target_id"}
        )
)
public class CommunityReport {

    private static final ZoneId SEOUL_ZONE = ZoneId.of("Asia/Seoul");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "report_id")
    private Long reportId;

    @Column(name = "member_id", columnDefinition = "uuid", nullable = false)
    private UUID memberId;

    @Column(name = "reporter_id", columnDefinition = "uuid", nullable = false)
    private UUID reporterId;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 20)
    private ReportTargetType targetType;

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ReportReason reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "report_status", nullable = false, length = 20)
    private ReportStatus reportStatus = ReportStatus.PENDING;

    @Column(name = "ai_suggestion", columnDefinition = "TEXT")
    private String aiSuggestion;

    @Column(name = "processed_by")
    private Long processedBy;

    @Column(name = "processed_at")
    private ZonedDateTime processedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private ZonedDateTime updatedAt;

    protected CommunityReport() {
    }

    public CommunityReport(UUID memberId, UUID reporterId, ReportTargetType targetType, Long targetId, ReportReason reason) {
        this.memberId = memberId;
        this.reporterId = reporterId;
        this.targetType = targetType;
        this.targetId = targetId;
        this.reason = reason;
        this.reportStatus = ReportStatus.PENDING;
    }

    @PrePersist
    protected void onCreate() {
        ZonedDateTime now = ZonedDateTime.now(SEOUL_ZONE);
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = ZonedDateTime.now(SEOUL_ZONE);
    }

    public Long getReportId() {
        return reportId;
    }

    public UUID getMemberId() {
        return memberId;
    }

    public UUID getReporterId() {
        return reporterId;
    }

    public ReportTargetType getTargetType() {
        return targetType;
    }

    public Long getTargetId() {
        return targetId;
    }

    public ReportReason getReason() {
        return reason;
    }

    public ReportStatus getReportStatus() {
        return reportStatus;
    }

    public String getAiSuggestion() {
        return aiSuggestion;
    }

    public Long getProcessedBy() {
        return processedBy;
    }

    public ZonedDateTime getProcessedAt() {
        return processedAt;
    }

    public ZonedDateTime getCreatedAt() {
        return createdAt;
    }

    public ZonedDateTime getUpdatedAt() {
        return updatedAt;
    }
}