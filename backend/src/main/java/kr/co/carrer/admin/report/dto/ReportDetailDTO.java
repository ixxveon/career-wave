package kr.co.carrer.admin.report.dto;

import kr.co.carrer.admin.report.type.ReportReason;
import kr.co.carrer.admin.report.type.ReportStatus;
import kr.co.carrer.admin.report.type.TargetType;

import java.time.ZonedDateTime;

public class ReportDetailDTO {

    public record ResponseList(
        Long reportId,
        TargetType targetType,
        ReportReason reason,
        ReportStatus reportStatus,
        String reporterName,
        String reportedName,
        String contentTitle,
        ZonedDateTime createdAt
    ) {}

    public record ResponseSummary(
        long totalCount,
        long pendingCount,
        long blindedCount,
        long highRiskCount
    ) {}

    public record ResponseDetail(
        Long reportId,
        TargetType targetType,
        Long targetId,
        ReportReason reason,
        ReportStatus reportStatus,
        String reporterName,
        String reportedName,
        String contentTitle,
        String contentBody,
        ZonedDateTime createdAt,
        ZonedDateTime processedAt,
        Long processedBy
    ) {}

    public record ResponseProcess(
        Long reportId,
        ReportStatus reportStatus,
        ZonedDateTime processedAt
    ) {}
}
