package kr.co.carrer.admin.dashboard.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import kr.co.carrer.admin.dashboard.type.DashboardAlertLevelType;
import kr.co.carrer.admin.dashboard.type.DashboardPaymentMethod;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Repository
public class DashboardSummaryQueryRepository {

    private static final ZoneId SERVICE_ZONE_ID = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter WEEKLY_SIGNUP_LABEL_FORMATTER = DateTimeFormatter.ofPattern("MM/dd");
    private static final String PAID_STATUS = "PAID";
    private static final String CARD_PAYMENT_METHOD = "CARD";

    @PersistenceContext
    private EntityManager entityManager;

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public DashboardSummaryQueryRepository(ObjectProvider<NamedParameterJdbcTemplate> jdbcTemplateProvider) {
        this.jdbcTemplate = jdbcTemplateProvider.getIfAvailable();
    }

    public AdminAccountMetrics fetchAdminAccountMetrics(DashboardQueryWindow queryWindow) {
        if (jdbcTemplate == null) {
            return new AdminAccountMetrics(0L, 0L, 0L);
        }

        String sql = """
            SELECT
                COUNT(*) FILTER (
                    WHERE created_at >= :rangeStartInclusive
                      AND created_at < :rangeEndExclusive
                ) AS new_admin_count,
                COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active_admin_count,
                COUNT(*) FILTER (
                    WHERE last_login_at >= :rangeStartInclusive
                      AND last_login_at < :rangeEndExclusive
                ) AS recent_login_count
            FROM admins
            """;

        MapSqlParameterSource params = windowParams(queryWindow);
        return jdbcTemplate.query(sql, params, rs -> {
            if (!rs.next()) {
                return new AdminAccountMetrics(0L, 0L, 0L);
            }
            return new AdminAccountMetrics(
                    rs.getLong("new_admin_count"),
                    rs.getLong("active_admin_count"),
                    rs.getLong("recent_login_count")
            );
        });
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
                        DashboardAlertLevelType.WARNING,
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
        if (jdbcTemplate == null) {
            return new AiUsageMetrics(0L, BigDecimal.ZERO, true, 0, true);
        }

        String sql = """
            SELECT
                (
                    SELECT COUNT(*)
                    FROM interview_sessions
                    WHERE created_at >= :rangeStartInclusive
                      AND created_at < :rangeEndExclusive
                ) AS interview_session_count,
                (
                    SELECT COALESCE(SUM(amount), 0)
                    FROM payments
                    WHERE payment_status = :paidStatus
                      AND approved_at >= :todayStartInclusive
                      AND approved_at < :todayEndExclusive
                ) AS today_revenue
            """;

        MapSqlParameterSource params = windowParams(queryWindow)
                .addValue("paidStatus", PAID_STATUS)
                .addValue("todayStartInclusive", Timestamp.from(todayStartInclusive(queryWindow).toInstant()))
                .addValue("todayEndExclusive", Timestamp.from(queryWindow.rangeEndExclusive().toInstant()));

        return jdbcTemplate.query(sql, params, rs -> {
            if (!rs.next()) {
                return new AiUsageMetrics(0L, BigDecimal.ZERO, true, 0, true);
            }
            return new AiUsageMetrics(
                    rs.getLong("interview_session_count"),
                    rs.getBigDecimal("today_revenue"),
                    true,
                    0,
                    true
            );
        });
    }

    public List<WeeklySignupRow> findWeeklySignups(DashboardQueryWindow queryWindow) {
        LocalDate endDate = queryWindow.rangeEndExclusive()
                .minusNanos(1)
                .withZoneSameInstant(SERVICE_ZONE_ID)
                .toLocalDate();
        LocalDate startDate = endDate.minusDays(6);
        Map<LocalDate, Long> countsByDate = new LinkedHashMap<>();
        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            countsByDate.put(date, 0L);
        }

        if (jdbcTemplate == null) {
            return toWeeklySignupRows(countsByDate);
        }

        ZonedDateTime startInclusive = startDate.atStartOfDay(SERVICE_ZONE_ID).withZoneSameInstant(ZoneId.of("UTC"));
        String sql = """
            SELECT DATE(created_at AT TIME ZONE 'Asia/Seoul') AS signup_date,
                   COUNT(*) AS signup_count
            FROM members
            WHERE created_at >= :startInclusive
              AND created_at < :endExclusive
            GROUP BY signup_date
            ORDER BY signup_date ASC
            """;

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("startInclusive", Timestamp.from(startInclusive.toInstant()))
                .addValue("endExclusive", Timestamp.from(queryWindow.rangeEndExclusive().toInstant()));

        jdbcTemplate.query(sql, params, rs -> {
            while (rs.next()) {
                LocalDate signupDate = toLocalDate(rs.getObject("signup_date"));
                if (countsByDate.containsKey(signupDate)) {
                    countsByDate.put(signupDate, rs.getLong("signup_count"));
                }
            }
            return null;
        });

        return toWeeklySignupRows(countsByDate);
    }

    public List<PaymentRatioRow> findPaymentRatios(DashboardQueryWindow queryWindow) {
        if (jdbcTemplate == null) {
            return List.of();
        }

        String sql = """
            SELECT
                COUNT(*) AS total_count,
                COUNT(*) FILTER (
                    WHERE UPPER(COALESCE(payment_method, '')) = :cardPaymentMethod
                ) AS card_count
            FROM payments
            WHERE payment_status = :paidStatus
              AND approved_at >= :rangeStartInclusive
              AND approved_at < :rangeEndExclusive
            """;

        MapSqlParameterSource params = windowParams(queryWindow)
                .addValue("paidStatus", PAID_STATUS)
                .addValue("cardPaymentMethod", CARD_PAYMENT_METHOD);

        return jdbcTemplate.query(sql, params, rs -> {
            if (!rs.next()) {
                return List.of();
            }

            long totalCount = rs.getLong("total_count");
            long cardCount = rs.getLong("card_count");
            if (totalCount <= 0L) {
                return List.of();
            }

            long otherCount = Math.max(totalCount - cardCount, 0L);
            List<PaymentRatioRow> ratios = new ArrayList<>();
            if (cardCount > 0L) {
                int cardRatio = otherCount > 0L
                        ? (int) Math.round((cardCount * 100.0d) / totalCount)
                        : 100;
                ratios.add(new PaymentRatioRow(DashboardPaymentMethod.CARD, "카드", cardRatio));
            }
            if (otherCount > 0L) {
                int otherRatio = 100 - ratios.stream().mapToInt(PaymentRatioRow::ratio).sum();
                ratios.add(new PaymentRatioRow(DashboardPaymentMethod.OTHER, "기타", otherRatio));
            }
            return ratios;
        });
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
                    COALESCE(SUM(CASE WHEN pipeline_status = 'SUCCESS' THEN 1 ELSE 0 END), 0) AS success_pipeline_count,
                    COALESCE(SUM(CASE WHEN pipeline_status = 'IDLE' THEN 1 ELSE 0 END), 0) AS idle_pipeline_count
                FROM scraping_pipelines
                """;
        Object[] row = singleRow(entityManager.createNativeQuery(sql));
        return new ScrapingStatusMetrics(longValue(row, 0), longValue(row, 1), longValue(row, 2), longValue(row, 3),
                longValue(row, 4));
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
                        DashboardAlertLevelType.URGENT,
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
            return new BigDecimal(number.toString());
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
            DashboardAlertLevelType level,
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
            long successPipelineCount,
            long idlePipelineCount
    ) {
    }

    public record ScrapingAlertRow(
            Long id,
            String title,
            String message,
            DashboardAlertLevelType level,
            ZonedDateTime createdAt
    ) {
    }

    public record WeeklySignupRow(
            String label,
            long count
    ) {
    }

    public record PaymentRatioRow(
            DashboardPaymentMethod method,
            String label,
            int ratio
    ) {
    }

    private MapSqlParameterSource windowParams(DashboardQueryWindow queryWindow) {
        return new MapSqlParameterSource()
                .addValue("rangeStartInclusive", Timestamp.from(queryWindow.rangeStartInclusive().toInstant()))
                .addValue("rangeEndExclusive", Timestamp.from(queryWindow.rangeEndExclusive().toInstant()));
    }

    private ZonedDateTime todayStartInclusive(DashboardQueryWindow queryWindow) {
        return queryWindow.rangeEndExclusive()
                .minusNanos(1)
                .withZoneSameInstant(SERVICE_ZONE_ID)
                .toLocalDate()
                .atStartOfDay(SERVICE_ZONE_ID)
                .withZoneSameInstant(ZoneId.of("UTC"));
    }

    private LocalDate toLocalDate(Object value) {
        if (value instanceof LocalDate localDate) {
            return localDate;
        }
        if (value instanceof Date date) {
            return date.toLocalDate();
        }
        return LocalDate.parse(String.valueOf(value));
    }

    private List<WeeklySignupRow> toWeeklySignupRows(Map<LocalDate, Long> countsByDate) {
        return countsByDate.entrySet().stream()
                .map(entry -> new WeeklySignupRow(
                        entry.getKey().format(WEEKLY_SIGNUP_LABEL_FORMATTER),
                        entry.getValue()
                ))
                .toList();
    }
}
