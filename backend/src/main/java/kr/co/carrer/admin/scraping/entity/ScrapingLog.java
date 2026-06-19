package kr.co.carrer.admin.scraping.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import kr.co.carrer.admin.scraping.type.ScrapingStatusType;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;

@Entity
@Table(name = "scraping_logs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ScrapingLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "scraping_log_id")
    private Long scrapingLogId;

    @Column(name = "scraping_pipeline_id", nullable = false)
    private Long scrapingPipelineId;

    @Column(name = "target_site", nullable = false, length = 50)
    private String targetSite;

    @Enumerated(EnumType.STRING)
    @Column(name = "scraping_status", nullable = false, length = 20)
    private ScrapingStatusType scrapingStatus;

    @Column(name = "total_count")
    private Integer totalCount;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "executed_at", nullable = false)
    private ZonedDateTime executedAt;
}
