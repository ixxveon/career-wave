package kr.co.carrer.admin.scraping.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import kr.co.carrer.admin.scraping.type.ScrapingStatusType;

import java.time.ZonedDateTime;
import java.util.List;

public class ScrapingLogDTO {

    private ScrapingLogDTO() {
    }

    @Schema(description = "Scraping log list request")
    public record RequestList(
            @Schema(description = "Source name", example = "wanted")
            String sourceName,

            @Schema(description = "Execution status", allowableValues = {"SUCCESS", "FAILED"})
            ScrapingStatusType status,

            @Min(1)
            @Schema(description = "Page number (1-based)", example = "1")
            Integer page,

            @Min(1)
            @Max(100)
            @Schema(description = "Page size", example = "20")
            Integer size
    ) {
    }

    @Schema(description = "Scraping log item response")
    public record ResponseLogItem(
            @Schema(description = "Log ID")
            Long logId,

            @Schema(description = "Occurred at")
            ZonedDateTime occurredAt,

            @Schema(description = "Source name")
            String sourceName,

            @Schema(description = "Execution status", allowableValues = {"SUCCESS", "FAILED"})
            ScrapingStatusType status,

            @Schema(description = "Summary message")
            String message,

            @Schema(description = "Detail message")
            String detail,

            @Schema(description = "Run identifier")
            String runId
    ) {
    }

    @Schema(description = "Scraping log page response")
    public record ResponseLogPage(
            @Schema(description = "List content")
            List<ResponseLogItem> content,

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
}
