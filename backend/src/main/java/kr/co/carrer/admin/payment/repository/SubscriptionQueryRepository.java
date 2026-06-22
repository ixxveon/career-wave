package kr.co.carrer.admin.payment.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import kr.co.carrer.admin.payment.dto.SubscriptionDTO;
import kr.co.carrer.admin.payment.type.SubscriptionStatus;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import org.springframework.stereotype.Repository;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;

@Repository
public class SubscriptionQueryRepository {

    @PersistenceContext
    private EntityManager em;

    private static final ZoneId SERVICE_ZONE_ID = ZoneId.of("Asia/Seoul");

    private ZonedDateTime toZdt(Object value) {
        if (value == null) return null;
        if (value instanceof java.sql.Timestamp ts) return ts.toInstant().atZone(SERVICE_ZONE_ID);
        if (value instanceof java.time.Instant instant) return instant.atZone(SERVICE_ZONE_ID);
        if (value instanceof java.time.OffsetDateTime odt) return odt.atZoneSameInstant(SERVICE_ZONE_ID);
        throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR);
    }

    public List<SubscriptionDTO.ResponseList> findSubscriptions(SubscriptionStatus status, int offset, int size) {
        StringBuilder sql = new StringBuilder("""
            SELECT s.subscription_id, m.name AS member_name, pl.plan_name,
                   s.started_at, s.current_period_end, s.subscription_status, s.auto_renew
            FROM subscriptions s
            JOIN members m ON m.member_id = s.member_id
            JOIN plans pl  ON pl.plan_id  = s.plan_id
            WHERE 1=1
            """);

        List<Object> params = new ArrayList<>();

        if (status != null) {
            sql.append(" AND s.subscription_status = ?").append(params.size() + 1);
            params.add(status.name());
        }

        sql.append(" ORDER BY s.created_at DESC LIMIT ?").append(params.size() + 1)
           .append(" OFFSET ?").append(params.size() + 2);
        params.add(size);
        params.add(offset);

        Query query = em.createNativeQuery(sql.toString());
        for (int i = 0; i < params.size(); i++) query.setParameter(i + 1, params.get(i));

        @SuppressWarnings("unchecked")
        List<Object[]> rows = query.getResultList();
        List<SubscriptionDTO.ResponseList> result = new ArrayList<>();
        for (Object[] row : rows) {
            result.add(new SubscriptionDTO.ResponseList(
                row[0].toString(),
                (String) row[1],
                (String) row[2],
                toZdt(row[3]),
                toZdt(row[4]),
                SubscriptionStatus.valueOf((String) row[5]),
                (Boolean) row[6]
            ));
        }
        return result;
    }

    public SubscriptionDTO.ResponseCounts countSubscriptionKpi() {
        String sql = """
            SELECT
              COUNT(*) FILTER (WHERE s.subscription_status = 'ACTIVE') AS active,
              COUNT(*) FILTER (WHERE s.subscription_status = 'RENEWAL_SCHEDULED') AS renewal_scheduled,
              COUNT(*) FILTER (WHERE s.subscription_status = 'CANCEL_SCHEDULED') AS cancel_scheduled,
              COUNT(*) FILTER (WHERE s.subscription_status = 'AT_RISK') AS at_risk
            FROM subscriptions s
            """;
        Object[] row = (Object[]) em.createNativeQuery(sql).getSingleResult();
        return new SubscriptionDTO.ResponseCounts(
            ((Number) row[0]).longValue(),
            ((Number) row[1]).longValue(),
            ((Number) row[2]).longValue(),
            ((Number) row[3]).longValue()
        );
    }

    public long countSubscriptions(SubscriptionStatus status) {
        StringBuilder sql = new StringBuilder("SELECT COUNT(*) FROM subscriptions s WHERE 1=1");
        List<Object> params = new ArrayList<>();

        if (status != null) {
            sql.append(" AND s.subscription_status = ?").append(params.size() + 1);
            params.add(status.name());
        }

        Query query = em.createNativeQuery(sql.toString());
        for (int i = 0; i < params.size(); i++) query.setParameter(i + 1, params.get(i));
        return ((Number) query.getSingleResult()).longValue();
    }
}
