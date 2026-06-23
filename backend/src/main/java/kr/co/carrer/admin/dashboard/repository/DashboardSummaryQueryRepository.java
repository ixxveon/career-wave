package kr.co.carrer.admin.dashboard.repository;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.List;

public interface DashboardSummaryQueryRepository {

    AdminAccountMetrics fetchAdminAccountMetrics(DashboardQueryWindow queryWindow);

    List<AuditAlertRow> findAuditAlerts(DashboardQueryWindow queryWindow, int limit);

    List<RecentActivityRow> findRecentActivities(DashboardQueryWindow queryWindow, int limit);

    AiUsageMetrics fetchAiUsageMetrics(DashboardQueryWindow queryWindow);

    RagDocumentMetrics fetchRagDocumentMetrics(DashboardQueryWindow queryWindow);

    ScrapingStatusMetrics fetchScrapingStatusMetrics(DashboardQueryWindow queryWindow);

    List<ScrapingAlertRow> findScrapingAlerts(DashboardQueryWindow queryWindow, int limit);

    record AdminAccountMetrics(
            long newAdminCount,
            long activeAdminCount,
            long recentLoginCount
    ) {
    }

    record AuditAlertRow(
            Long id,
            String title,
            String message,
            ZonedDateTime createdAt
    ) {
    }

    record RecentActivityRow(
            Long id,
            ZonedDateTime occurredAt,
            String adminLoginId,
            String message,
            String targetPath
    ) {
    }

    record AiUsageMetrics(
            long interviewSessionCount,
            BigDecimal todayRevenue,
            boolean alertEnabled,
            int alertThreshold,
            boolean rateLimitEnabled
    ) {
    }

    record RagDocumentMetrics(
            long totalDocumentCount,
            long completedDocumentCount,
            long failedDocumentCount,
            int highestIndexingProgress
    ) {
    }

    record ScrapingStatusMetrics(
            long totalPipelineCount,
            long runningPipelineCount,
            long failedPipelineCount,
            long successPipelineCount
    ) {
    }

    record ScrapingAlertRow(
            Long id,
            String title,
            String message,
            ZonedDateTime createdAt
    ) {
    }
}
