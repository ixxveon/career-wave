package kr.co.carrer.admin.audit.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import kr.co.carrer.admin.audit.type.AuditLogSeverity;
import kr.co.carrer.admin.audit.type.AuditLogType;

import java.time.ZonedDateTime;
import java.util.List;

public class AuditLogDTO {

    @Schema(description = "Audit log summary request")
    public record RequestSummary(
        @Schema(description = "Summary range start", example = "2026-06-10T00:00:00Z")
        ZonedDateTime from,

        @Schema(description = "Summary range end", example = "2026-06-16T23:59:59Z")
        ZonedDateTime to
    ) {}

    @Schema(description = "Audit log list request")
    public record RequestList(
        @Schema(
            description = "Audit log type",
            allowableValues = {"ADMIN_ACTIVITY", "ADMIN_MANAGEMENT", "AI_METRICS_SYSTEM", "SCRAPING_SYSTEM"}
        )
        String logType,

        @Schema(
            description = "Audit log severity",
            allowableValues = {"INFO", "WARN", "ERROR", "SUCCESS"}
        )
        String severity,

        @Size(max = 100)
        @Schema(description = "Search keyword", example = "UPDATE_ADMIN_ROLE")
        String keyword,

        @Schema(description = "Actor admin ID", example = "1")
        @Min(1)
        Long adminId,

        @Size(max = 50)
        @Schema(description = "Target type", example = "MEMBER")
        String targetType,

        @Schema(description = "List range start", example = "2026-06-10T00:00:00Z")
        ZonedDateTime from,

        @Schema(description = "List range end", example = "2026-06-16T23:59:59Z")
        ZonedDateTime to,

        @Min(1)
        @Schema(description = "Page number (1-based)", example = "1")
        Integer page,

        @Min(1)
        @Max(100)
        @Schema(description = "Page size", example = "20")
        Integer size
    ) {}

    @Schema(description = "Audit log summary response")
    public record ResponseSummary(
        @Schema(description = "Total audit log count")
        long totalCount,

        @Schema(description = "ADMIN_ACTIVITY count")
        long adminActivityCount,

        @Schema(description = "ADMIN_MANAGEMENT count")
        long adminManagementCount,

        @Schema(description = "AI_METRICS_SYSTEM count")
        long aiMetricsSystemCount,

        @Schema(description = "SCRAPING_SYSTEM count")
        long scrapingSystemCount,

        @Schema(description = "INFO count")
        long infoCount,

        @Schema(description = "WARN count")
        long warnCount,

        @Schema(description = "ERROR count")
        long errorCount,

        @Schema(description = "SUCCESS count")
        long successCount
    ) {}

    @Schema(description = "Audit log list item")
    public record ResponseItem(
        @Schema(description = "Audit log ID")
        Long auditLogId,

        @Schema(description = "Admin ID")
        Long adminId,

        @Schema(
            description = "Audit log type",
            allowableValues = {"ADMIN_ACTIVITY", "ADMIN_MANAGEMENT", "AI_METRICS_SYSTEM", "SCRAPING_SYSTEM"}
        )
        AuditLogType logType,

        @Schema(description = "Action")
        String action,

        @Schema(description = "Target type")
        String targetType,

        @Schema(description = "Target ID")
        String targetId,

        @Schema(description = "Request IP address")
        String ipAddress,

        @Schema(
            description = "Audit log severity",
            allowableValues = {"INFO", "WARN", "ERROR", "SUCCESS"}
        )
        AuditLogSeverity severity,

        @Schema(description = "Detail")
        String detail,

        @Schema(description = "Created at")
        ZonedDateTime createdAt
    ) {}

    @Schema(description = "Audit log detail response")
    public record ResponseDetail(
        @Schema(description = "Audit log ID")
        Long auditLogId,

        @Schema(description = "Admin ID")
        Long adminId,

        @Schema(
            description = "Audit log type",
            allowableValues = {"ADMIN_ACTIVITY", "ADMIN_MANAGEMENT", "AI_METRICS_SYSTEM", "SCRAPING_SYSTEM"}
        )
        AuditLogType logType,

        @Schema(description = "Action")
        String action,

        @Schema(description = "Target type")
        String targetType,

        @Schema(description = "Target ID")
        String targetId,

        @Schema(description = "Request IP address")
        String ipAddress,

        @Schema(
            description = "Audit log severity",
            allowableValues = {"INFO", "WARN", "ERROR", "SUCCESS"}
        )
        AuditLogSeverity severity,

        @Schema(description = "Detail")
        String detail,

        @Schema(description = "Created at")
        ZonedDateTime createdAt
    ) {}

    @Schema(description = "Audit log list response")
    public record ResponseList(
        @Schema(description = "List content")
        List<ResponseItem> content,

        @Schema(description = "Current page (1-based)")
        int page,

        @Schema(description = "Page size")
        int size,

        @Schema(description = "Total element count")
        long totalElements,

        @Schema(description = "Total page count")
        int totalPages
    ) {}
}
