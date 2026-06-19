package kr.co.carrer.admin.scraping.entity;

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
import kr.co.carrer.admin.scraping.type.ScrapingPipelineStatusType;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.ZoneId;
import java.time.ZonedDateTime;

@Entity
@Table(name = "scraping_pipelines")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ScrapingPipeline {

    private static final ZoneId SERVICE_ZONE_ID = ZoneId.of("Asia/Seoul");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "scraping_pipeline_id")
    private Long scrapingPipelineId;

    @Column(name = "source_name", nullable = false, unique = true, length = 50)
    private String sourceName;

    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(name = "pipeline_status", nullable = false, length = 20)
    private ScrapingPipelineStatusType pipelineStatus;

    @Column(name = "is_enabled", nullable = false)
    private Boolean isEnabled = true;

    @Column(name = "last_started_at")
    private ZonedDateTime lastStartedAt;

    @Column(name = "last_success_at")
    private ZonedDateTime lastSuccessAt;

    @Column(name = "last_failed_at")
    private ZonedDateTime lastFailedAt;

    @Column(name = "last_duration_ms")
    private Integer lastDurationMs;

    @Column(name = "last_total_count")
    private Integer lastTotalCount;

    @Column(name = "last_error_message", columnDefinition = "TEXT")
    private String lastErrorMessage;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private ZonedDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        ZonedDateTime now = ZonedDateTime.now(SERVICE_ZONE_ID);
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = ZonedDateTime.now(SERVICE_ZONE_ID);
    }
}
