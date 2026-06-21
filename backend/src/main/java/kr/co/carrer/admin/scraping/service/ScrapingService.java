package kr.co.carrer.admin.scraping.service;

import kr.co.carrer.admin.scraping.type.ScrapingActionType;
import kr.co.carrer.admin.scraping.type.ScrapingPipelineStatusType;
import kr.co.carrer.admin.scraping.type.ScrapingStatusType;

import java.time.ZonedDateTime;
import java.util.List;

public interface ScrapingService {

    ResponsePipelinePage getPipelines(String keyword, ScrapingPipelineStatusType status, int page, int size);

    ResponseSummary getSummary();

    ResponseDetail getPipelineDetail(String sourceName);

    ResponseLogPage getLogs(String sourceName, ScrapingStatusType status, int page, int size);

    ResponseAction requestAction(String sourceName, RequestAction command, Long actorAdminId, String ipAddress);

    ResponseBatchAction requestBatchAction(RequestBatchAction command, Long actorAdminId, String ipAddress);

    record RequestAction(
            ScrapingActionType actionType,
            String reason
    ) {
    }

    record RequestBatchAction(
            ScrapingActionType actionType,
            String reason,
            List<String> sourceNames
    ) {
    }

    record ResponsePipelinePage(
            List<ResponsePipelineItem> content,
            int page,
            int size,
            long totalElements,
            int totalPages
    ) {
    }

    record ResponsePipelineItem(
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

    record ResponseSummary(
            long totalCount,
            long idleCount,
            long runningCount,
            long successCount,
            long failedCount,
            long enabledCount,
            long disabledCount
    ) {
    }

    record ResponseDetail(
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

    record ResponseAction(
            String sourceName,
            ScrapingActionType requestedAction,
            boolean accepted,
            String runId,
            ZonedDateTime requestedAt
    ) {
    }

    record ResponseBatchAction(
            int requestedCount,
            int acceptedCount,
            int failedCount,
            List<ResponseBatchActionResult> results
    ) {
    }

    record ResponseBatchActionResult(
            String sourceName,
            boolean accepted,
            String message
    ) {
    }

    record ResponseLogPage(
            List<ResponseLogItem> content,
            int page,
            int size,
            long totalElements,
            int totalPages
    ) {
    }

    record ResponseLogItem(
            Long logId,
            ZonedDateTime occurredAt,
            String sourceName,
            ScrapingStatusType status,
            String message,
            String detail,
            String runId
    ) {
    }
}
