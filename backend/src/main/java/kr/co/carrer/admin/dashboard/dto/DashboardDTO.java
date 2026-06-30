package kr.co.carrer.admin.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import kr.co.carrer.admin.dashboard.type.DashboardAlertLevelType;
import kr.co.carrer.admin.dashboard.type.DashboardDomainType;
import kr.co.carrer.admin.dashboard.type.DashboardKpiKeyType;
import kr.co.carrer.admin.dashboard.type.DashboardPaymentMethod;
import kr.co.carrer.admin.dashboard.type.DashboardRangeType;
import kr.co.carrer.admin.dashboard.type.DashboardSeverityType;
import kr.co.carrer.admin.dashboard.type.DashboardSystemStatusType;

import java.time.ZonedDateTime;
import java.util.List;

public class DashboardDTO {

    private DashboardDTO() {
    }

    @Schema(description = "Dashboard summary request")
    public record RequestSummary(
            @Schema(description = "Dashboard range", allowableValues = {"TODAY", "7D", "30D"}, example = "TODAY")
            DashboardRangeType range
    ) {
    }

    @Schema(description = "Dashboard summary response")
    public record ResponseSummary(
            @Schema(description = "Aggregation base date time")
            ZonedDateTime baseDateTime,

            @Schema(description = "Applied dashboard range", allowableValues = {"TODAY", "7D", "30D"})
            DashboardRangeType range,

            @Schema(description = "Dashboard KPI list")
            List<Kpi> kpis,

            @Schema(description = "Dashboard alert list")
            List<Alert> alerts,

            @Schema(description = "Weekly signup points")
            List<WeeklySignup> weeklySignups,

            @Schema(description = "Payment ratio list")
            List<PaymentRatio> paymentRatio,

            @Schema(description = "Service card list")
            List<ServiceCard> serviceCards,

            @Schema(description = "System status list")
            List<SystemStatus> systemStatus,

            @Schema(description = "Recent activity list")
            List<RecentActivity> recentActivities
    ) {
    }

    @Schema(description = "Dashboard KPI item")
    public record Kpi(
            @Schema(description = "KPI key", allowableValues = {
                    "TODAY_NEW_ADMINS",
                    "REALTIME_ACTIVE_ADMINS",
                    "AI_INTERVIEW_SESSIONS",
                    "TODAY_REVENUE"
            })
            DashboardKpiKeyType key,

            @Schema(description = "KPI title")
            String title,

            @Schema(description = "KPI value")
            long value,

            @Schema(description = "KPI unit")
            String unit,

            @Schema(description = "KPI delta text")
            String deltaText,

            @Schema(description = "KPI severity", allowableValues = {"NORMAL", "WARNING", "CRITICAL"})
            DashboardSeverityType severity,

            @Schema(description = "Target admin route path")
            String targetPath
    ) {
    }

    @Schema(description = "Dashboard alert item")
    public record Alert(
            @Schema(description = "Alert identifier")
            Long id,

            @Schema(description = "Alert level", allowableValues = {"URGENT", "WARNING", "NORMAL"})
            DashboardAlertLevelType level,

            @Schema(description = "Alert domain", allowableValues = {
                    "ADMIN",
                    "MEMBER",
                    "REPORT",
                    "CS",
                    "PAYMENT",
                    "STATISTICS",
                    "AI_METRICS",
                    "SCRAPING",
                    "AUDIT_LOG"
            })
            DashboardDomainType domain,

            @Schema(description = "Alert title")
            String title,

            @Schema(description = "Alert message")
            String message,

            @Schema(description = "Target admin route path")
            String targetPath,

            @Schema(description = "Alert created at")
            ZonedDateTime createdAt
    ) {
    }

    @Schema(description = "Weekly signup item")
    public record WeeklySignup(
            @Schema(description = "Weekday label")
            String label,

            @Schema(description = "Signup count")
            long count
    ) {
    }

    @Schema(description = "Payment ratio item")
    public record PaymentRatio(
            @Schema(description = "Payment method", allowableValues = {"CARD", "OTHER"})
            DashboardPaymentMethod method,

            @Schema(description = "Payment method label")
            String label,

            @Schema(description = "Payment ratio")
            int ratio
    ) {
    }

    @Schema(description = "Dashboard service card item")
    public record ServiceCard(
            @Schema(description = "Service card key")
            String key,

            @Schema(description = "Service card title")
            String title,

            @Schema(description = "Service card description")
            String description,

            @Schema(description = "Service card summary text")
            String summaryText,

            @Schema(description = "Target admin route path")
            String targetPath
    ) {
    }

    @Schema(description = "Dashboard system status item")
    public record SystemStatus(
            @Schema(description = "System status key")
            String key,

            @Schema(description = "System status label")
            String label,

            @Schema(description = "System status value", allowableValues = {"NORMAL", "WARNING", "CRITICAL"})
            DashboardSystemStatusType status,

            @Schema(description = "System status display text")
            String valueText
    ) {
    }

    @Schema(description = "Dashboard recent activity item")
    public record RecentActivity(
            @Schema(description = "Recent activity identifier")
            Long id,

            @Schema(description = "Activity occurred at")
            ZonedDateTime occurredAt,

            @Schema(description = "Admin login identifier")
            String adminId,

            @Schema(description = "Activity message")
            String message,

            @Schema(description = "Target admin route path")
            String targetPath
    ) {
    }
}
