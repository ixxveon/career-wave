package kr.co.carrer.admin.scraping.infrastructure.fastapi;

import com.fasterxml.jackson.annotation.JsonAlias;
import kr.co.carrer.admin.scraping.type.ScrapingPipelineStatusType;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;

public class ScrapingFastApiResponse {

    private ScrapingFastApiResponse() {
    }

    public record Summary(
            @JsonAlias("total_count")
            long totalCount,
            @JsonAlias("idle_count")
            long idleCount,
            @JsonAlias("running_count")
            long runningCount,
            @JsonAlias("success_count")
            long successCount,
            @JsonAlias("failed_count")
            long failedCount,
            @JsonAlias("enabled_count")
            long enabledCount,
            @JsonAlias("disabled_count")
            long disabledCount
    ) {
    }

    public record PipelineDetail(
            @JsonAlias("scraping_pipeline_id")
            Long scrapingPipelineId,
            @JsonAlias("source_name")
            String sourceName,
            @JsonAlias("display_name")
            String displayName,
            @JsonAlias("pipeline_status")
            ScrapingPipelineStatusType pipelineStatus,
            @JsonAlias("is_enabled")
            boolean isEnabled,
            @JsonAlias("last_started_at")
            ZonedDateTime lastStartedAt,
            @JsonAlias("last_success_at")
            ZonedDateTime lastSuccessAt,
            @JsonAlias("last_failed_at")
            ZonedDateTime lastFailedAt,
            @JsonAlias("last_duration_ms")
            Integer lastDurationMs,
            @JsonAlias("last_total_count")
            Integer lastTotalCount,
            @JsonAlias("last_error_message")
            String lastErrorMessage,
            @JsonAlias("created_at")
            ZonedDateTime createdAt,
            @JsonAlias("updated_at")
            ZonedDateTime updatedAt
    ) {
    }

    public record RunAction(
            String sourceName,
            boolean accepted,
            String runId,
            ZonedDateTime requestedAt
    ) {
    }

    public record RetryAction(
            String sourceName,
            boolean accepted,
            String runId,
            ZonedDateTime requestedAt
    ) {
    }

    public record TestAction(
            String sourceName,
            boolean accepted,
            String runId,
            ZonedDateTime requestedAt
    ) {
    }

    public record BatchAction(
            String actionType,
            int requestedCount,
            int acceptedCount,
            ZonedDateTime requestedAt,
            List<BatchActionItem> results
    ) {
    }

    public record BatchActionItem(
            String sourceName,
            boolean accepted,
            String message
    ) {
    }

    public record LogPage(
            List<LogItem> content,
            int page,
            int size,
            @JsonAlias("total_elements")
            long totalElements,
            @JsonAlias("total_pages")
            int totalPages
    ) {
    }

    public record LogItem(
            @JsonAlias("scraping_log_id")
            Long logId,
            @JsonAlias("executed_at")
            ZonedDateTime occurredAt,
            @JsonAlias({"source_name", "target_site"})
            String sourceName,
            @JsonAlias("scraping_status")
            String status,
            String message,
            @JsonAlias("error_message")
            String detail,
            String runId
    ) {
    }

    public record Error(
            boolean success,
            String errorCode,
            String message,
            Map<String, Object> detail
    ) {
    }

    public record PipelinePage(
            List<PipelineItem> content,
            int page,
            int size,
            @JsonAlias("total_elements")
            long totalElements,
            @JsonAlias("total_pages")
            int totalPages
    ) {
    }

    public record PipelineItem(
            @JsonAlias("scraping_pipeline_id")
            Long scrapingPipelineId,
            @JsonAlias("source_name")
            String sourceName,
            @JsonAlias("display_name")
            String displayName,
            @JsonAlias("pipeline_status")
            ScrapingPipelineStatusType pipelineStatus,
            @JsonAlias("is_enabled")
            boolean isEnabled,
            @JsonAlias("last_started_at")
            ZonedDateTime lastStartedAt,
            @JsonAlias("last_success_at")
            ZonedDateTime lastSuccessAt,
            @JsonAlias("last_failed_at")
            ZonedDateTime lastFailedAt,
            @JsonAlias("last_duration_ms")
            Integer lastDurationMs,
            @JsonAlias("last_total_count")
            Integer lastTotalCount,
            @JsonAlias("last_error_message")
            String lastErrorMessage,
            @JsonAlias("created_at")
            ZonedDateTime createdAt,
            @JsonAlias("updated_at")
            ZonedDateTime updatedAt
    ) {
    }
}
