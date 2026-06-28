package kr.co.carrer.admin.dashboard.repository;

import kr.co.carrer.admin.dashboard.type.DashboardAlertLevelType;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

@Repository
public class DashboardSummaryQueryRepository {

    private static final ZoneId SERVICE_ZONE_ID = ZoneId.of("Asia/Seoul");
    private static final String AUDIT_LOG_TARGET_PATH = "/admin/log";
    private static final int SCRAPING_RUNNING_ALERT_MINUTES = 30;

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public DashboardSummaryQueryRepository(ObjectProvider<NamedParameterJdbcTemplate> jdbcTemplateProvider) {
        this.jdbcTemplate = jdbcTemplateProvider.getIfAvailable();
    }

    public AdminAccountMetrics fetchAdminAccountMetrics(DashboardQueryWindow queryWindow) {
        return new AdminAccountMetrics(0L, 0L, 0L);
    }

    public List<AuditAlertRow> findAuditAlerts(DashboardQueryWindow queryWindow, int limit) {
        if (jdbcTemplate == null || limit <= 0) {
            return List.of();
        }

        String sql = """
            SELECT audit_log_id,
                   severity,
                   log_type,
                   action,
                   target_type,
                   target_id,
                   detail,
                   created_at
            FROM audit_logs
            WHERE severity IN ('WARN', 'ERROR')
              AND created_at >= :rangeStartInclusive
              AND created_at < :rangeEndExclusive
            ORDER BY CASE severity WHEN 'ERROR' THEN 0 ELSE 1 END,
                     created_at DESC,
                     audit_log_id DESC
            LIMIT :limit
            """;

        return jdbcTemplate.query(sql, windowParams(queryWindow, limit), (rs, rowNum) -> {
            String severity = rs.getString("severity");
            String logType = rs.getString("log_type");
            String action = rs.getString("action");
            String targetType = rs.getString("target_type");
            String targetId = rs.getString("target_id");
            String detail = rs.getString("detail");
            return new AuditAlertRow(
                    rs.getLong("audit_log_id"),
                    "ERROR".equals(severity) ? DashboardAlertLevelType.URGENT : DashboardAlertLevelType.WARNING,
                    auditAlertTitle(severity, logType),
                    auditMessage(action, targetType, targetId, detail),
                    toZonedDateTime(rs.getObject("created_at"))
            );
        });
    }

    public List<RecentActivityRow> findRecentActivities(DashboardQueryWindow queryWindow, int limit) {
        if (jdbcTemplate == null || limit <= 0) {
            return List.of();
        }

        String sql = """
            SELECT al.audit_log_id,
                   al.created_at,
                   COALESCE(a.login_id, 'system') AS admin_login_id,
                   al.log_type,
                   al.action,
                   al.target_type,
                   al.target_id,
                   al.detail
            FROM audit_logs al
            LEFT JOIN admins a ON a.admin_id = al.admin_id
            WHERE al.created_at >= :rangeStartInclusive
              AND al.created_at < :rangeEndExclusive
            ORDER BY al.created_at DESC,
                     al.audit_log_id DESC
            LIMIT :limit
            """;

        return jdbcTemplate.query(sql, windowParams(queryWindow, limit), (rs, rowNum) -> new RecentActivityRow(
                rs.getLong("audit_log_id"),
                toZonedDateTime(rs.getObject("created_at")),
                rs.getString("admin_login_id"),
                activityMessage(
                        rs.getString("log_type"),
                        rs.getString("action"),
                        rs.getString("target_type"),
                        rs.getString("target_id"),
                        rs.getString("detail")
                ),
                AUDIT_LOG_TARGET_PATH
        ));
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
        if (jdbcTemplate == null || limit <= 0) {
            return List.of();
        }

        String sql = """
            SELECT id,
                   level,
                   title,
                   message,
                   created_at
            FROM (
                SELECT sp.scraping_pipeline_id AS id,
                       'URGENT' AS level,
                       '스크래핑 파이프라인 실패' AS title,
                       CONCAT(sp.display_name, ' 파이프라인이 실패했습니다',
                              CASE WHEN NULLIF(sp.last_error_message, '') IS NULL
                                   THEN ''
                                   ELSE CONCAT(': ', sp.last_error_message)
                              END) AS message,
                       COALESCE(sp.last_failed_at, sp.updated_at) AS created_at,
                       0 AS priority
                FROM scraping_pipelines sp
                WHERE sp.pipeline_status = 'FAILED'
                  AND COALESCE(sp.last_failed_at, sp.updated_at) >= :rangeStartInclusive
                  AND COALESCE(sp.last_failed_at, sp.updated_at) < :rangeEndExclusive

                UNION ALL

                SELECT sp.scraping_pipeline_id AS id,
                       'WARNING' AS level,
                       '스크래핑 장시간 실행' AS title,
                       CONCAT(sp.display_name, ' 파이프라인이 ', :runningAlertMinutes, '분 이상 실행 중입니다') AS message,
                       sp.last_started_at AS created_at,
                       1 AS priority
                FROM scraping_pipelines sp
                WHERE sp.pipeline_status = 'RUNNING'
                  AND sp.last_started_at IS NOT NULL
                  AND sp.last_started_at < :runningAlertStartedBefore

                UNION ALL

                SELECT sl.scraping_log_id AS id,
                       'URGENT' AS level,
                       '스크래핑 실행 실패' AS title,
                       CONCAT(sl.target_site, ' 스크래핑 실행이 실패했습니다',
                              CASE WHEN NULLIF(sl.error_message, '') IS NULL
                                   THEN ''
                                   ELSE CONCAT(': ', sl.error_message)
                              END) AS message,
                       sl.executed_at AS created_at,
                       0 AS priority
                FROM scraping_logs sl
                WHERE sl.scraping_status = 'FAILED'
                  AND sl.executed_at >= :rangeStartInclusive
                  AND sl.executed_at < :rangeEndExclusive
            ) alerts
            ORDER BY priority ASC,
                     created_at DESC,
                     id DESC
            LIMIT :limit
            """;

        MapSqlParameterSource params = windowParams(queryWindow, limit)
                .addValue("runningAlertMinutes", SCRAPING_RUNNING_ALERT_MINUTES)
                .addValue(
                        "runningAlertStartedBefore",
                        Timestamp.from(queryWindow.rangeEndExclusive()
                                .minusMinutes(SCRAPING_RUNNING_ALERT_MINUTES)
                                .toInstant())
                );

        return jdbcTemplate.query(sql, params, (rs, rowNum) -> new ScrapingAlertRow(
                rs.getLong("id"),
                DashboardAlertLevelType.valueOf(rs.getString("level")),
                rs.getString("title"),
                rs.getString("message"),
                toZonedDateTime(rs.getObject("created_at"))
        ));
    }

    public record AdminAccountMetrics(
            long newAdminCount,
            long activeAdminCount,
            long recentLoginCount
    ) {
    }

    public record AuditAlertRow(
            Long id,
            DashboardAlertLevelType level,
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
            DashboardAlertLevelType level,
            String title,
            String message,
            ZonedDateTime createdAt
    ) {
    }

    private MapSqlParameterSource windowParams(DashboardQueryWindow queryWindow, int limit) {
        return new MapSqlParameterSource()
                .addValue("rangeStartInclusive", Timestamp.from(queryWindow.rangeStartInclusive().toInstant()))
                .addValue("rangeEndExclusive", Timestamp.from(queryWindow.rangeEndExclusive().toInstant()))
                .addValue("limit", limit);
    }

    private ZonedDateTime toZonedDateTime(Object value) {
        if (value instanceof ZonedDateTime zonedDateTime) {
            return zonedDateTime.withZoneSameInstant(SERVICE_ZONE_ID);
        }
        if (value instanceof java.time.OffsetDateTime offsetDateTime) {
            return offsetDateTime.atZoneSameInstant(SERVICE_ZONE_ID);
        }
        if (value instanceof java.time.Instant instant) {
            return instant.atZone(SERVICE_ZONE_ID);
        }
        if (value instanceof Timestamp timestamp) {
            return timestamp.toInstant().atZone(SERVICE_ZONE_ID);
        }
        return null;
    }

    private String auditAlertTitle(String severity, String logType) {
        String domain = switch (logType) {
            case "ADMIN_MANAGEMENT" -> "관리자 관리";
            case "AI_METRICS_SYSTEM" -> "AI Metrics";
            case "SCRAPING_SYSTEM" -> "스크래핑";
            default -> "관리자 활동";
        };
        return "ERROR".equals(severity) ? domain + " 오류 감지" : domain + " 경고 감지";
    }

    private String auditMessage(String action, String targetType, String targetId, String detail) {
        StringBuilder message = new StringBuilder();
        message.append(blankToDefault(action, "관리자 작업"));
        if (targetType != null && !targetType.isBlank()) {
            message.append(" / 대상: ").append(targetType);
            if (targetId != null && !targetId.isBlank()) {
                message.append("(").append(targetId).append(")");
            }
        }
        if (detail != null && !detail.isBlank()) {
            message.append(" / ").append(detail);
        }
        return message.toString();
    }

    private String activityMessage(String logType, String action, String targetType, String targetId, String detail) {
        String domain = switch (logType) {
            case "ADMIN_MANAGEMENT" -> "관리자 관리";
            case "AI_METRICS_SYSTEM" -> "AI Metrics";
            case "SCRAPING_SYSTEM" -> "스크래핑 관리";
            default -> "관리자 활동";
        };
        return domain + " - " + auditMessage(action, targetType, targetId, detail);
    }

    private String blankToDefault(String value, String defaultValue) {
        return value == null || value.isBlank() ? defaultValue : value;
    }
}
