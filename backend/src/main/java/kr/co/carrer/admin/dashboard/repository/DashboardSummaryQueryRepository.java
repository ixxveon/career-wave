package kr.co.carrer.admin.dashboard.repository;

import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.List;

@Repository
public class DashboardSummaryQueryRepository {

    public AdminAccountMetrics fetchAdminAccountMetrics(DashboardQueryWindow queryWindow) {
        return new AdminAccountMetrics(0L, 0L, 0L);
    }

    public List<AuditAlertRow> findAuditAlerts(DashboardQueryWindow queryWindow, int limit) {
        return List.of();
    }

    public List<RecentActivityRow> findRecentActivities(DashboardQueryWindow queryWindow, int limit) {
        return List.of();
    }

    public AiUsageMetrics fetchAiUsageMetrics(DashboardQueryWindow queryWindow) {
        return new AiUsageMetrics(0L, BigDecimal.ZERO, true, 0, true);
    }

    public RagDocumentMetrics fetchRagDocumentMetrics(DashboardQueryWindow queryWindow) {
        return new RagDocumentMetrics(0L, 0L, 0L, 0);
    }

    public ScrapingStatusMetrics fetchScrapingStatusMetrics(DashboardQueryWindow queryWindow) {
        return new ScrapingStatusMetrics(0L, 0L, 0L, 0L);
    }

    public List<ScrapingAlertRow> findScrapingAlerts(DashboardQueryWindow queryWindow, int limit) {
        return List.of();
    }

    public record AdminAccountMetrics(
            long newAdminCount,
            long activeAdminCount,
            long recentLoginCount
    ) {
    }

    public record AuditAlertRow(
            Long id,
            String title,
            String message,
            ZonedDateTime createdAt
    ) {
    }

    public record RecentActivityRow(
            Long id,
            ZonedDateTime occurredAt,
            String adminLoginId,
            String message,
            String targetPath
    ) {
    }

    public record AiUsageMetrics(
            long interviewSessionCount,
            BigDecimal todayRevenue,
            boolean alertEnabled,
            int alertThreshold,
            boolean rateLimitEnabled
    ) {
    }

    public record RagDocumentMetrics(
            long totalDocumentCount,
            long completedDocumentCount,
            long failedDocumentCount,
            int highestIndexingProgress
    ) {
    }

    public record ScrapingStatusMetrics(
            long totalPipelineCount,
            long runningPipelineCount,
            long failedPipelineCount,
            long successPipelineCount
    ) {
    }

    public record ScrapingAlertRow(
            Long id,
            String title,
            String message,
            ZonedDateTime createdAt
    ) {
    }
}
