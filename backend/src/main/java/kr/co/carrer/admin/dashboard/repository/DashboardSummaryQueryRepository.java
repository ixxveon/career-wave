package kr.co.carrer.admin.dashboard.repository;

import kr.co.carrer.admin.dashboard.type.DashboardPaymentMethod;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
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
                ) AS new_member_count,
                COUNT(*) FILTER (WHERE member_status = 'ACTIVE') AS active_member_count,
                COUNT(*) FILTER (
                    WHERE last_login_at >= :rangeStartInclusive
                      AND last_login_at < :rangeEndExclusive
                ) AS recent_login_count
            FROM members
            """;

        MapSqlParameterSource params = windowParams(queryWindow);
        return jdbcTemplate.query(sql, params, rs -> {
            if (!rs.next()) {
                return new AdminAccountMetrics(0L, 0L, 0L);
            }
            return new AdminAccountMetrics(
                    rs.getLong("new_member_count"),
                    rs.getLong("active_member_count"),
                    rs.getLong("recent_login_count")
            );
        });
    }

    public List<AuditAlertRow> findAuditAlerts(DashboardQueryWindow queryWindow, int limit) {
        return List.of();
    }

    public List<RecentActivityRow> findRecentActivities(DashboardQueryWindow queryWindow, int limit) {
        return List.of();
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
        LocalDate endDate = queryWindow.rangeEndExclusive().withZoneSameInstant(SERVICE_ZONE_ID).toLocalDate();
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
