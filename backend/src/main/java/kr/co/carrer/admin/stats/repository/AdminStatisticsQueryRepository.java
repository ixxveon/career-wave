package kr.co.carrer.admin.stats.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import kr.co.carrer.admin.stats.dto.StatisticsDTO;
import org.springframework.stereotype.Repository;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;

@Repository
public class AdminStatisticsQueryRepository {

    private static final ZoneId SERVICE_ZONE_ID = ZoneId.of("Asia/Seoul");

    @PersistenceContext
    private EntityManager em;

    public long sumPaidAmountByMonth(int yearOffset, int monthOffset) {
        String sql = """
            SELECT COALESCE(SUM(amount), 0)
            FROM payments
            WHERE payment_status = 'PAID'
              AND DATE_TRUNC('month', approved_at AT TIME ZONE 'Asia/Seoul')
                = DATE_TRUNC('month', (NOW() AT TIME ZONE 'Asia/Seoul')
                    + CAST(? || ' years' AS INTERVAL)
                    + CAST(? || ' months' AS INTERVAL))
            """;
        Query query = em.createNativeQuery(sql);
        query.setParameter(1, yearOffset);
        query.setParameter(2, monthOffset);
        return ((Number) query.getSingleResult()).longValue();
    }

    public long sumPaidAmountTotal() {
        String sql = "SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payment_status = 'PAID'";
        return ((Number) em.createNativeQuery(sql).getSingleResult()).longValue();
    }

    public long countMembers() {
        return ((Number) em.createNativeQuery("SELECT COUNT(*) FROM members").getSingleResult()).longValue();
    }

    public long countNewMembersByMonth(int monthOffset) {
        String sql = """
            SELECT COUNT(*)
            FROM members
            WHERE DATE_TRUNC('month', created_at AT TIME ZONE 'Asia/Seoul')
                = DATE_TRUNC('month', (NOW() AT TIME ZONE 'Asia/Seoul')
                    + CAST(? || ' months' AS INTERVAL))
            """;
        Query query = em.createNativeQuery(sql);
        query.setParameter(1, monthOffset);
        return ((Number) query.getSingleResult()).longValue();
    }

    public List<StatisticsDTO.MonthlyRevenue> findMonthlyRevenue() {
        String sql = """
            SELECT TO_CHAR(gs.month, 'YYYY-MM') AS month,
                   COALESCE(SUM(p.amount), 0) AS total
            FROM GENERATE_SERIES(
                DATE_TRUNC('month', (NOW() AT TIME ZONE 'Asia/Seoul') - INTERVAL '5 months'),
                DATE_TRUNC('month', NOW() AT TIME ZONE 'Asia/Seoul'),
                INTERVAL '1 month'
            ) AS gs(month)
            LEFT JOIN payments p
                ON DATE_TRUNC('month', p.approved_at AT TIME ZONE 'Asia/Seoul') = gs.month
               AND p.payment_status = 'PAID'
            GROUP BY gs.month
            ORDER BY gs.month ASC
            """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql).getResultList();
        List<StatisticsDTO.MonthlyRevenue> result = new ArrayList<>();
        for (Object[] row : rows) {
            result.add(new StatisticsDTO.MonthlyRevenue(
                (String) row[0],
                ((Number) row[1]).longValue()
            ));
        }
        return result;
    }

    public List<StatisticsDTO.MonthlySubscribers> findMonthlySubscribers() {
        String sql = """
            SELECT TO_CHAR(gs.month, 'YYYY-MM') AS month,
                   COALESCE(SUM(CASE WHEN DATE_TRUNC('month', s.started_at AT TIME ZONE 'Asia/Seoul') = gs.month THEN 1 ELSE 0 END), 0) AS new_subs,
                   COALESCE(SUM(CASE WHEN s.cancelled_at IS NOT NULL
                                      AND DATE_TRUNC('month', s.cancelled_at AT TIME ZONE 'Asia/Seoul') = gs.month THEN 1 ELSE 0 END), 0) AS churned
            FROM GENERATE_SERIES(
                DATE_TRUNC('month', (NOW() AT TIME ZONE 'Asia/Seoul') - INTERVAL '5 months'),
                DATE_TRUNC('month', NOW() AT TIME ZONE 'Asia/Seoul'),
                INTERVAL '1 month'
            ) AS gs(month)
            LEFT JOIN subscriptions s
                ON DATE_TRUNC('month', s.started_at AT TIME ZONE 'Asia/Seoul') = gs.month
                OR (s.cancelled_at IS NOT NULL AND DATE_TRUNC('month', s.cancelled_at AT TIME ZONE 'Asia/Seoul') = gs.month)
            GROUP BY gs.month
            ORDER BY gs.month ASC
            """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql).getResultList();
        List<StatisticsDTO.MonthlySubscribers> result = new ArrayList<>();
        for (Object[] row : rows) {
            result.add(new StatisticsDTO.MonthlySubscribers(
                (String) row[0],
                ((Number) row[1]).longValue(),
                ((Number) row[2]).longValue()
            ));
        }
        return result;
    }

    public List<StatisticsDTO.RevenueBreakdownItem> findRevenueBreakdown() {
        String sql = """
            SELECT
              p.payment_type,
              COALESCE(SUM(p.amount) FILTER (WHERE DATE_TRUNC('month', p.approved_at AT TIME ZONE 'Asia/Seoul') = DATE_TRUNC('month', NOW() AT TIME ZONE 'Asia/Seoul')), 0) AS current_amount,
              COALESCE(SUM(p.amount) FILTER (WHERE DATE_TRUNC('month', p.approved_at AT TIME ZONE 'Asia/Seoul') = DATE_TRUNC('month', (NOW() AT TIME ZONE 'Asia/Seoul') - INTERVAL '1 month')), 0) AS prev_amount
            FROM payments p
            WHERE p.payment_status = 'PAID'
              AND p.approved_at >= DATE_TRUNC('month', (NOW() AT TIME ZONE 'Asia/Seoul') - INTERVAL '1 month')
            GROUP BY p.payment_type
            ORDER BY p.payment_type
            """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql).getResultList();
        return rows.stream().map(row -> {
            String type        = (String) row[0];
            long current       = ((Number) row[1]).longValue();
            long prev          = ((Number) row[2]).longValue();
            double growth      = prev == 0 ? 0.0
                : Math.round((double)(current - prev) / prev * 10000.0) / 100.0;
            String label       = "AUTO_RENEWAL".equals(type) ? "자동 갱신" : "직접 결제";
            return new StatisticsDTO.RevenueBreakdownItem(type, label, current, growth);
        }).toList();
    }

    public List<Object[]> findRecentSubscribers() {
        String sql = """
            SELECT CAST(m.member_id AS TEXT), m.name, s.subscription_status, pl.plan_name, s.created_at
            FROM subscriptions s
            JOIN members m  ON m.member_id  = s.member_id
            JOIN plans pl   ON pl.plan_id   = s.plan_id
            WHERE s.subscription_status = 'ACTIVE'
            ORDER BY s.created_at DESC
            LIMIT 5
            """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql).getResultList();
        return rows;
    }

    private ZonedDateTime toZdt(Object value) {
        if (value == null) return null;
        if (value instanceof java.sql.Timestamp ts) return ts.toInstant().atZone(SERVICE_ZONE_ID);
        if (value instanceof java.time.Instant instant) return instant.atZone(SERVICE_ZONE_ID);
        if (value instanceof java.time.OffsetDateTime odt) return odt.atZoneSameInstant(SERVICE_ZONE_ID);
        return null;
    }

    public ZonedDateTime toZdtPublic(Object value) {
        return toZdt(value);
    }
}
