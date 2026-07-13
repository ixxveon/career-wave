package kr.co.carrer.admin.scraping.dto;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import kr.co.carrer.admin.scraping.type.ScrapingActionType;
import kr.co.carrer.admin.scraping.type.ScrapingPipelineStatusType;

import java.time.ZonedDateTime;
import java.util.List;

public class ScrapingPipelineDTO {

    private ScrapingPipelineDTO() {
    }

    @Schema(description = "Scraping pipeline list request")
    public record RequestList(
            @Schema(description = "Search keyword", example = "wanted")
            String keyword,

            @Schema(description = "Pipeline status", allowableValues = {"IDLE", "RUNNING", "SUCCESS", "FAILED"})
            ScrapingPipelineStatusType status,

            @Min(1)
            @Schema(description = "Page number (1-based)", example = "1")
            Integer page,

            @Min(1)
            @Max(100)
            @Schema(description = "Page size", example = "20")
            Integer size
    ) {
    }

    @Schema(description = "Single scraping action request")
    public record RequestAction(
            @NotNull
            @Schema(description = "Action type", allowableValues = {"RUN", "RETRY", "TEST"})
            ScrapingActionType actionType,

            @NotBlank
            @Schema(description = "Action request reason", example = "Manual retry request")
            String reason
    ) {
    }

    @Schema(description = "Batch scraping action request")
    public record RequestBatchAction(
            @NotNull
            @Schema(description = "Batch action type", allowableValues = {"RUN", "RETRY", "TEST"})
            ScrapingActionType actionType,

            @NotBlank
            @Schema(description = "Batch action request reason", example = "Batch retry request")
            String reason,

            @NotEmpty
            @ArraySchema(schema = @Schema(description = "Target source name", example = "wanted"))
            List<@NotBlank String> sourceNames
    ) {
    }

    @Schema(description = "Scraping pipeline list item")
    public record ResponsePipelineItem(
            @Schema(description = "Scraping pipeline ID")
            Long scrapingPipelineId,

            @Schema(description = "Source name")
            String sourceName,

            @Schema(description = "Display name")
            String displayName,

            @Schema(description = "Pipeline status", allowableValues = {"IDLE", "RUNNING", "SUCCESS", "FAILED"})
            ScrapingPipelineStatusType pipelineStatus,

            @Schema(description = "Enabled flag")
            boolean isEnabled,

            @Schema(description = "Automatic scraping interval in minutes", example = "360")
            int scheduleIntervalMinutes,

            @Schema(description = "Last started at")
            ZonedDateTime lastStartedAt,

            @Schema(description = "Last success at")
            ZonedDateTime lastSuccessAt,

            @Schema(description = "Last failed at")
            ZonedDateTime lastFailedAt,

            @Schema(description = "Last duration in milliseconds")
            Integer lastDurationMs,

            @Schema(description = "Last total count")
            Integer lastTotalCount,

            @Schema(description = "Last error message")
            String lastErrorMessage,

            @Schema(description = "Created at")
            ZonedDateTime createdAt,

            @Schema(description = "Updated at")
            ZonedDateTime updatedAt
    ) {
    }

    @Schema(description = "Scraping pipeline list response")
    public record ResponsePipelinePage(
            @Schema(description = "List content")
            List<ResponsePipelineItem> content,

            @Schema(description = "Current page (1-based)")
            int page,

            @Schema(description = "Page size")
            int size,

            @Schema(description = "Total element count")
            long totalElements,

            @Schema(description = "Total page count")
            int totalPages
    ) {
    }

    @Schema(description = "Scraping pipeline summary response")
    public record ResponseSummary(
            @Schema(description = "Total pipeline count")
            long totalCount,

            @Schema(description = "Idle pipeline count")
            long idleCount,

            @Schema(description = "Running pipeline count")
            long runningCount,

            @Schema(description = "Success pipeline count")
            long successCount,

            @Schema(description = "Failed pipeline count")
            long failedCount,

            @Schema(description = "Enabled pipeline count")
            long enabledCount,

            @Schema(description = "Disabled pipeline count")
            long disabledCount
    ) {
    }

    @Schema(description = "Scraping pipeline detail response")
    public record ResponseDetail(
            @Schema(description = "Scraping pipeline ID")
            Long scrapingPipelineId,

            @Schema(description = "Source name")
            String sourceName,

            @Schema(description = "Display name")
            String displayName,

            @Schema(description = "Pipeline status", allowableValues = {"IDLE", "RUNNING", "SUCCESS", "FAILED"})
            ScrapingPipelineStatusType pipelineStatus,

            @Schema(description = "Enabled flag")
            boolean isEnabled,

            @Schema(description = "Automatic scraping interval in minutes", example = "360")
            int scheduleIntervalMinutes,

            @Schema(description = "Last started at")
            ZonedDateTime lastStartedAt,

            @Schema(description = "Last success at")
            ZonedDateTime lastSuccessAt,

            @Schema(description = "Last failed at")
            ZonedDateTime lastFailedAt,

            @Schema(description = "Last duration in milliseconds")
            Integer lastDurationMs,

            @Schema(description = "Last total count")
            Integer lastTotalCount,

            @Schema(description = "Last error message")
            String lastErrorMessage,

            @Schema(description = "Created at")
            ZonedDateTime createdAt,

            @Schema(description = "Updated at")
            ZonedDateTime updatedAt
    ) {
    }

    @Schema(description = "Single scraping action response")
    public record ResponseAction(
            @Schema(description = "Source name")
            String sourceName,

            @Schema(description = "Requested action type", allowableValues = {"RUN", "RETRY", "TEST"})
            ScrapingActionType requestedAction,

            @Schema(description = "Accepted flag")
            boolean accepted,

            @Schema(description = "Run identifier")
            String runId,

            @Schema(description = "Requested at")
            ZonedDateTime requestedAt
    ) {
    }

    @Schema(description = "Batch scraping action response")
    public record ResponseBatchAction(
            @Schema(description = "Requested count")
            int requestedCount,

            @Schema(description = "Accepted count")
            int acceptedCount,

            @Schema(description = "Failed count")
            int failedCount,

            @Schema(description = "Per-source results")
            List<ResponseBatchActionResult> results
    ) {
    }

    @Schema(description = "Batch scraping action result item")
    public record ResponseBatchActionResult(
            @Schema(description = "Source name")
            String sourceName,

            @Schema(description = "Accepted flag")
            boolean accepted,

            @Schema(description = "Result message")
            String message
    ) {
    }
}
