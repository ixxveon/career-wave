package kr.co.carrer.admin.dashboard.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;

@Repository
public class DashboardSummaryQueryRepository {

    private static final ZoneId SERVICE_ZONE_ID = ZoneId.of("Asia/Seoul");

    @PersistenceContext
    private EntityManager entityManager;

    public AdminAccountMetrics fetchAdminAccountMetrics(DashboardQueryWindow queryWindow) {
        String sql = """
                SELECT
                    COALESCE(SUM(CASE WHEN created_at >= ?1 AND created_at < ?2 THEN 1 ELSE 0 END), 0) AS new_admin_count,
                    COALESCE(SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END), 0) AS active_admin_count,
                    COALESCE(SUM(CASE WHEN last_login_at >= ?1 AND last_login_at < ?2 THEN 1 ELSE 0 END), 0) AS recent_login_count
                FROM admins
                """;
        Object[] row = singleRow(createWindowQuery(sql, queryWindow));
        return new AdminAccountMetrics(longValue(row, 0), longValue(row, 1), longValue(row, 2));
    }

    public List<AuditAlertRow> findAuditAlerts(DashboardQueryWindow queryWindow, int limit) {
        String sql = """
                SELECT
                    audit_log_id,
                    action,
                    COALESCE(NULLIF(detail, ''), CONCAT(COALESCE(target_type, 'SYSTEM'), ' ', COALESCE(target_id, ''))) AS message,
                    created_at
                FROM audit_logs
                WHERE severity IN ('WARN', 'ERROR')
                  AND created_at >= ?1
                  AND created_at < ?2
                ORDER BY created_at DESC, audit_log_id DESC
                LIMIT ?3
                """;
        Query query = createWindowQuery(sql, queryWindow);
        query.setParameter(3, limit);
        return resultRows(query).stream()
                .map(row -> new AuditAlertRow(
                        longObjectValue(row, 0),
                        stringValue(row, 1),
                        stringValue(row, 2),
                        zonedDateTimeValue(row, 3)
                ))
                .toList();
    }

    public List<RecentActivityRow> findRecentActivities(DashboardQueryWindow queryWindow, int limit) {
        String sql = """
                SELECT
                    l.audit_log_id,
                    l.created_at,
                    COALESCE(a.login_id, CAST(l.admin_id AS TEXT), 'system') AS admin_login_id,
                    CONCAT(l.action, CASE WHEN l.target_type IS NULL THEN '' ELSE CONCAT(' - ', l.target_type) END) AS message,
                    '/admin/log' AS target_path
                FROM audit_logs l
                LEFT JOIN admins a ON a.admin_id = l.admin_id
                WHERE l.created_at >= ?1
                  AND l.created_at < ?2
                ORDER BY l.created_at DESC, l.audit_log_id DESC
                LIMIT ?3
                """;
        Query query = createWindowQuery(sql, queryWindow);
        query.setParameter(3, limit);
        return resultRows(query).stream()
                .map(row -> new RecentActivityRow(
                        longObjectValue(row, 0),
                        zonedDateTimeValue(row, 1),
                        stringValue(row, 2),
                        stringValue(row, 3),
                        stringValue(row, 4)
                ))
                .toList();
    }

    public AiUsageMetrics fetchAiUsageMetrics(DashboardQueryWindow queryWindow) {
        String sql = """
                SELECT
                    COALESCE(SUM(CASE WHEN feature_type IN ('INTERVIEW', 'INTERVIEW_STT', 'INTERVIEW_TTS') THEN 1 ELSE 0 END), 0) AS interview_session_count,
                    COALESCE(SUM(cost), 0) AS total_cost,
                    COALESCE((SELECT alert_enabled FROM ai_ops_settings WHERE ai_ops_setting_id = 1), true) AS alert_enabled,
                    COALESCE((SELECT alert_threshold FROM ai_ops_settings WHERE ai_ops_setting_id = 1), 0) AS alert_threshold,
                    COALESCE((SELECT rate_limit_enabled FROM ai_ops_settings WHERE ai_ops_setting_id = 1), true) AS rate_limit_enabled
                FROM ai_usage_logs
                WHERE created_at >= ?1
                  AND created_at < ?2
                """;
        Object[] row = singleRow(createWindowQuery(sql, queryWindow));
        return new AiUsageMetrics(
                longValue(row, 0),
                bigDecimalValue(row, 1),
                booleanValue(row, 2, true),
                intValue(row, 3),
                booleanValue(row, 4, true)
        );
    }

    public RagDocumentMetrics fetchRagDocumentMetrics(DashboardQueryWindow queryWindow) {
        String sql = """
                SELECT
                    COUNT(*) AS total_document_count,
                    COALESCE(SUM(CASE WHEN status IN ('COMPLETED', 'SYNCED') THEN 1 ELSE 0 END), 0) AS completed_document_count,
                    COALESCE(SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END), 0) AS failed_document_count,
                    COALESCE(MAX(indexing_progress), 0) AS highest_indexing_progress
                FROM rag_documents
                """;
        Object[] row = singleRow(entityManager.createNativeQuery(sql));
        return new RagDocumentMetrics(longValue(row, 0), longValue(row, 1), longValue(row, 2), intValue(row, 3));
    }

    public ScrapingStatusMetrics fetchScrapingStatusMetrics(DashboardQueryWindow queryWindow) {
        String sql = """
                SELECT
                    COUNT(*) AS total_pipeline_count,
                    COALESCE(SUM(CASE WHEN pipeline_status = 'RUNNING' THEN 1 ELSE 0 END), 0) AS running_pipeline_count,
                    COALESCE(SUM(CASE WHEN pipeline_status = 'FAILED' THEN 1 ELSE 0 END), 0) AS failed_pipeline_count,
                    COALESCE(SUM(CASE WHEN pipeline_status = 'SUCCESS' THEN 1 ELSE 0 END), 0) AS success_pipeline_count
                FROM scraping_pipelines
                """;
        Object[] row = singleRow(entityManager.createNativeQuery(sql));
        return new ScrapingStatusMetrics(longValue(row, 0), longValue(row, 1), longValue(row, 2), longValue(row, 3));
    }

    public List<ScrapingAlertRow> findScrapingAlerts(DashboardQueryWindow queryWindow, int limit) {
        String sql = """
                SELECT
                    scraping_log_id,
                    CONCAT('Scraping failed: ', target_site) AS title,
                    COALESCE(NULLIF(error_message, ''), 'Scraping pipeline failed.') AS message,
                    executed_at
                FROM scraping_logs
                WHERE scraping_status = 'FAILED'
                  AND executed_at >= ?1
                  AND executed_at < ?2
                ORDER BY executed_at DESC, scraping_log_id DESC
                LIMIT ?3
                """;
        Query query = createWindowQuery(sql, queryWindow);
        query.setParameter(3, limit);
        return resultRows(query).stream()
                .map(row -> new ScrapingAlertRow(
                        longObjectValue(row, 0),
                        stringValue(row, 1),
                        stringValue(row, 2),
                        zonedDateTimeValue(row, 3)
                ))
                .toList();
    }

    private Query createWindowQuery(String sql, DashboardQueryWindow queryWindow) {
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter(1, queryWindow.rangeStartInclusive());
        query.setParameter(2, queryWindow.rangeEndExclusive());
        return query;
    }

    private Object[] singleRow(Query query) {
        Object row = query.getSingleResult();
        if (row instanceof Object[] values) {
            return values;
        }
        return new Object[]{row};
    }

    private List<Object[]> resultRows(Query query) {
        List<?> rows = query.getResultList();
        List<Object[]> result = new ArrayList<>();
        for (Object row : rows) {
            if (row instanceof Object[] values) {
                result.add(values);
            } else {
                result.add(new Object[]{row});
            }
        }
        return result;
    }

    private long longValue(Object[] row, int index) {
        Object value = rowValue(row, index);
        return value instanceof Number number ? number.longValue() : 0L;
    }

    private Long longObjectValue(Object[] row, int index) {
        Object value = rowValue(row, index);
        return value instanceof Number number ? number.longValue() : null;
    }

    private int intValue(Object[] row, int index) {
        Object value = rowValue(row, index);
        return value instanceof Number number ? number.intValue() : 0;
    }

    private BigDecimal bigDecimalValue(Object[] row, int index) {
        Object value = rowValue(row, index);
        if (value instanceof BigDecimal decimal) {
            return decimal;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        return BigDecimal.ZERO;
    }

    private boolean booleanValue(Object[] row, int index, boolean defaultValue) {
        Object value = rowValue(row, index);
        if (value instanceof Boolean bool) {
            return bool;
        }
        if (value instanceof Number number) {
            return number.intValue() != 0;
        }
        return defaultValue;
    }

    private String stringValue(Object[] row, int index) {
        Object value = rowValue(row, index);
        return value == null ? null : String.valueOf(value);
    }

    private ZonedDateTime zonedDateTimeValue(Object[] row, int index) {
        Object value = rowValue(row, index);
        if (value == null) {
            return null;
        }
        if (value instanceof ZonedDateTime zonedDateTime) {
            return zonedDateTime;
        }
        if (value instanceof OffsetDateTime offsetDateTime) {
            return offsetDateTime.atZoneSameInstant(SERVICE_ZONE_ID);
        }
        if (value instanceof Timestamp timestamp) {
            return timestamp.toInstant().atZone(SERVICE_ZONE_ID);
        }
        if (value instanceof Instant instant) {
            return instant.atZone(SERVICE_ZONE_ID);
        }
        return null;
    }

    private Object rowValue(Object[] row, int index) {
        return row != null && index < row.length ? row[index] : null;
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
