package kr.co.carrer.admin.audit.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import kr.co.carrer.admin.audit.type.AuditLogSeverity;
import kr.co.carrer.admin.audit.type.AuditLogType;

import java.time.ZonedDateTime;
import java.util.List;

public class AuditLogDTO {

    @Schema(description = "감사 로그 요약 조회 요청")
    public record RequestSummary(
        @Schema(description = "조회 시작 일시", example = "2026-06-10T00:00:00Z")
        ZonedDateTime from,

        @Schema(description = "조회 종료 일시", example = "2026-06-16T23:59:59Z")
        ZonedDateTime to
    ) {}

    @Schema(description = "감사 로그 목록 조회 요청")
    public record RequestList(
        @Schema(description = "로그 유형", allowableValues = {"ADMIN_ACTIVITY", "ADMIN_MANAGEMENT", "AI_METRICS_SYSTEM", "SCRAPING_SYSTEM"})
        String logType,

        @Schema(description = "심각도", allowableValues = {"INFO", "WARN", "ERROR", "SUCCESS"})
        String severity,

        @Size(max = 100)
        @Schema(description = "검색어", example = "UPDATE_ADMIN_ROLE")
        String keyword,

        @Schema(description = "조회 시작 일시", example = "2026-06-10T00:00:00Z")
        ZonedDateTime from,

        @Schema(description = "조회 종료 일시", example = "2026-06-16T23:59:59Z")
        ZonedDateTime to,

        @Min(1)
        @Schema(description = "페이지 번호(1-based)", example = "1")
        Integer page,

        @Min(1)
        @Schema(description = "페이지 크기", example = "20")
        Integer size
    ) {}

    @Schema(description = "감사 로그 요약 응답")
    public record ResponseSummary(
        @Schema(description = "전체 감사 로그 수")
        long totalCount,

        @Schema(description = "관리자 활동 로그 수")
        long adminActivityCount,

        @Schema(description = "AI Metrics 시스템 로그 수")
        long aiMetricsSystemCount,

        @Schema(description = "스크래핑 시스템 로그 수")
        long scrapingSystemCount,

        @Schema(description = "INFO 로그 수")
        long infoCount,

        @Schema(description = "WARN 로그 수")
        long warnCount,

        @Schema(description = "ERROR 로그 수")
        long errorCount,

        @Schema(description = "SUCCESS 로그 수")
        long successCount
    ) {}

    @Schema(description = "감사 로그 목록 아이템")
    public record ResponseItem(
        @Schema(description = "감사 로그 ID")
        Long auditLogId,

        @Schema(description = "작업 관리자 ID")
        Long adminId,

        @Schema(description = "로그 유형", allowableValues = {"ADMIN_ACTIVITY", "ADMIN_MANAGEMENT", "AI_METRICS_SYSTEM", "SCRAPING_SYSTEM"})
        AuditLogType logType,

        @Schema(description = "작업 액션")
        String action,

        @Schema(description = "대상 유형")
        String targetType,

        @Schema(description = "대상 식별자")
        String targetId,

        @Schema(description = "요청 IP 주소")
        String ipAddress,

        @Schema(description = "심각도", allowableValues = {"INFO", "WARN", "ERROR", "SUCCESS"})
        AuditLogSeverity severity,

        @Schema(description = "상세 내용")
        String detail,

        @Schema(description = "발생 시각")
        ZonedDateTime createdAt
    ) {}

    @Schema(description = "감사 로그 상세 응답")
    public record ResponseDetail(
        @Schema(description = "감사 로그 ID")
        Long auditLogId,

        @Schema(description = "작업 관리자 ID")
        Long adminId,

        @Schema(description = "로그 유형", allowableValues = {"ADMIN_ACTIVITY", "ADMIN_MANAGEMENT", "AI_METRICS_SYSTEM", "SCRAPING_SYSTEM"})
        AuditLogType logType,

        @Schema(description = "작업 액션")
        String action,

        @Schema(description = "대상 유형")
        String targetType,

        @Schema(description = "대상 식별자")
        String targetId,

        @Schema(description = "요청 IP 주소")
        String ipAddress,

        @Schema(description = "심각도", allowableValues = {"INFO", "WARN", "ERROR", "SUCCESS"})
        AuditLogSeverity severity,

        @Schema(description = "상세 내용")
        String detail,

        @Schema(description = "발생 시각")
        ZonedDateTime createdAt
    ) {}

    @Schema(description = "감사 로그 목록 응답")
    public record ResponseList(
        @Schema(description = "목록 데이터")
        List<ResponseItem> content,

        @Schema(description = "현재 페이지(1-based)")
        int page,

        @Schema(description = "페이지 크기")
        int size,

        @Schema(description = "전체 건수")
        long totalElements,

        @Schema(description = "전체 페이지 수")
        int totalPages
    ) {}
}
