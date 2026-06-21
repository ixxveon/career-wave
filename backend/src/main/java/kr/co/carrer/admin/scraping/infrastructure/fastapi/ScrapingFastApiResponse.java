package kr.co.carrer.admin.scraping.infrastructure.fastapi;

import kr.co.carrer.admin.scraping.type.ScrapingPipelineStatusType;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;

public class ScrapingFastApiResponse {

    private ScrapingFastApiResponse() {
    }

    public record Summary(
            long totalCount,
            long idleCount,
            long runningCount,
            long successCount,
            long failedCount,
            long enabledCount,
            long disabledCount
    ) {
    }

    public record PipelineDetail(
            Long scrapingPipelineId,
            String sourceName,
            String displayName,
            ScrapingPipelineStatusType pipelineStatus,
            boolean isEnabled,
            ZonedDateTime lastStartedAt,
            ZonedDateTime lastSuccessAt,
            ZonedDateTime lastFailedAt,
            Integer lastDurationMs,
            Integer lastTotalCount,
            String lastErrorMessage,
            ZonedDateTime createdAt,
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
            long totalElements,
            int totalPages
    ) {
    }

    public record LogItem(
            Long logId,
            ZonedDateTime occurredAt,
            String sourceName,
            String status,
            String message,
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
            long totalElements,
            int totalPages
    ) {
    }

    public record PipelineItem(
            Long scrapingPipelineId,
            String sourceName,
            String displayName,
            ScrapingPipelineStatusType pipelineStatus,
            boolean isEnabled,
            ZonedDateTime lastStartedAt,
            ZonedDateTime lastSuccessAt,
            ZonedDateTime lastFailedAt,
            Integer lastDurationMs,
            Integer lastTotalCount,
            String lastErrorMessage,
            ZonedDateTime createdAt,
            ZonedDateTime updatedAt
    ) {
    }
}
