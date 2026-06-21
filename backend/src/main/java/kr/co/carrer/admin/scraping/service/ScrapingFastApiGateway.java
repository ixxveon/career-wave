package kr.co.carrer.admin.scraping.service;

import kr.co.carrer.admin.scraping.type.ScrapingPipelineStatusType;
import kr.co.carrer.admin.scraping.type.ScrapingActionType;
import kr.co.carrer.admin.scraping.type.ScrapingStatusType;

import java.time.ZonedDateTime;
import java.util.List;

public interface ScrapingFastApiGateway {

    PipelinePageResponse getPipelines(PipelineSearchRequest request);

    SummaryResponse getSummary();

    DetailResponse getPipelineDetail(String sourceName);

    LogPageResponse getLogs(LogSearchRequest request);

    ActionResponse runPipeline(ActionRequest request);

    ActionResponse retryPipeline(ActionRequest request);

    ActionResponse testPipeline(ActionRequest request);

    BatchActionResponse batchRunPipelines(BatchActionRequest request);

    record PipelineSearchRequest(
            String keyword,
            ScrapingPipelineStatusType status,
            int page,
            int size
    ) {
    }

    record LogSearchRequest(
            String sourceName,
            ScrapingStatusType status,
            int page,
            int size
    ) {
    }

    record ActionRequest(
            String sourceName,
            String requestedBy
    ) {
    }

    record BatchActionRequest(
            ScrapingActionType actionType,
            List<String> sourceNames,
            String requestedBy
    ) {
    }

    record PipelinePageResponse(
            List<PipelineItemResponse> content,
            int page,
            int size,
            long totalElements,
            int totalPages
    ) {
    }

    record PipelineItemResponse(
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

    record SummaryResponse(
            long totalCount,
            long idleCount,
            long runningCount,
            long successCount,
            long failedCount,
            long enabledCount,
            long disabledCount
    ) {
    }

    record DetailResponse(
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

    record LogPageResponse(
            List<LogItemResponse> content,
            int page,
            int size,
            long totalElements,
            int totalPages
    ) {
    }

    record LogItemResponse(
            Long logId,
            ZonedDateTime occurredAt,
            String sourceName,
            ScrapingStatusType status,
            String message,
            String detail,
            String runId
    ) {
    }

    record ActionResponse(
            String sourceName,
            boolean accepted,
            String runId,
            ZonedDateTime requestedAt
    ) {
    }

    record BatchActionResponse(
            String actionType,
            int requestedCount,
            int acceptedCount,
            ZonedDateTime requestedAt,
            List<BatchActionItemResponse> results
    ) {
    }

    record BatchActionItemResponse(
            String sourceName,
            boolean accepted,
            String message
    ) {
    }
}
