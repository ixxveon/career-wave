package kr.co.carrer.admin.report.entity;

import jakarta.persistence.*;
import kr.co.carrer.admin.report.type.ReportReason;
import kr.co.carrer.admin.report.type.ReportStatus;
import kr.co.carrer.admin.report.type.TargetType;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "reports")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "report_id")
    private Long reportId;

    @Column(name = "member_id", nullable = false, columnDefinition = "UUID")
    private UUID memberId;

    @Column(name = "reporter_id", nullable = false, columnDefinition = "UUID")
    private UUID reporterId;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 20)
    private TargetType targetType;

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason", nullable = false, length = 30)
    private ReportReason reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "report_status", nullable = false, length = 20)
    private ReportStatus reportStatus;

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

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = ZonedDateTime.now();
    }

    public void updateAiSuggestion(String aiSuggestion) {
        this.aiSuggestion = aiSuggestion;
    }

    public void blind(Long adminId) {
        this.reportStatus = ReportStatus.BLINDED;
        this.processedBy = adminId;
        this.processedAt = ZonedDateTime.now();
    }

    public void dismiss(Long adminId) {
        this.reportStatus = ReportStatus.DISMISSED;
        this.processedBy = adminId;
        this.processedAt = ZonedDateTime.now();
    }
}
