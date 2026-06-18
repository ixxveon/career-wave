package kr.co.carrer.admin.payment.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import kr.co.carrer.admin.payment.dto.PaymentDTO;
import kr.co.carrer.admin.payment.type.PaymentStatus;
import kr.co.carrer.admin.payment.type.RefundStatus;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import org.springframework.stereotype.Repository;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class PaymentQueryRepository {

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

    public List<PaymentDTO.ResponseList> findPayments(String keyword, PaymentStatus status, int offset, int size) {
        StringBuilder sql = new StringBuilder("""
            SELECT p.payment_id, p.order_id,
                   m.name AS member_name,
                   pl.plan_name,
                   p.approved_at, p.amount, p.payment_status,
                   r.refund_status
            FROM payments p
            JOIN members m   ON m.member_id = p.member_id
            JOIN plans pl    ON pl.plan_id  = p.plan_id
            LEFT JOIN refunds r ON r.payment_id = p.payment_id
            WHERE 1=1
            """);

        List<Object> params = new ArrayList<>();

        if (keyword != null && !keyword.isBlank()) {
            int idx = params.size() + 1;
            sql.append(" AND (CAST(p.payment_id AS TEXT) ILIKE ?").append(idx)
               .append(" OR p.order_id ILIKE ?").append(idx + 1)
               .append(" OR m.name ILIKE ?").append(idx + 2).append(")");
            params.add("%" + keyword + "%");
            params.add("%" + keyword + "%");
            params.add("%" + keyword + "%");
        }
        if (status != null) {
            sql.append(" AND p.payment_status = ?").append(params.size() + 1);
            params.add(status.name());
        }

        sql.append(" ORDER BY p.created_at DESC LIMIT ?").append(params.size() + 1)
           .append(" OFFSET ?").append(params.size() + 2);
        params.add(size);
        params.add(offset);

        Query query = em.createNativeQuery(sql.toString());
        for (int i = 0; i < params.size(); i++) query.setParameter(i + 1, params.get(i));

        @SuppressWarnings("unchecked")
        List<Object[]> rows = query.getResultList();
        List<PaymentDTO.ResponseList> result = new ArrayList<>();
        for (Object[] row : rows) {
            result.add(new PaymentDTO.ResponseList(
                row[0].toString(),
                (String) row[1],
                (String) row[2],
                (String) row[3],
                toZdt(row[4]),
                ((Number) row[5]).intValue(),
                PaymentStatus.valueOf((String) row[6]),
                row[7] != null ? RefundStatus.valueOf((String) row[7]) : null
            ));
        }
        return result;
    }

    public long countPayments(String keyword, PaymentStatus status) {
        StringBuilder sql = new StringBuilder("""
            SELECT COUNT(*)
            FROM payments p
            JOIN members m ON m.member_id = p.member_id
            WHERE 1=1
            """);

        List<Object> params = new ArrayList<>();

        if (keyword != null && !keyword.isBlank()) {
            int idx = params.size() + 1;
            sql.append(" AND (CAST(p.payment_id AS TEXT) ILIKE ?").append(idx)
               .append(" OR p.order_id ILIKE ?").append(idx + 1)
               .append(" OR m.name ILIKE ?").append(idx + 2).append(")");
            params.add("%" + keyword + "%");
            params.add("%" + keyword + "%");
            params.add("%" + keyword + "%");
        }
        if (status != null) {
            sql.append(" AND p.payment_status = ?").append(params.size() + 1);
            params.add(status.name());
        }

        Query query = em.createNativeQuery(sql.toString());
        for (int i = 0; i < params.size(); i++) query.setParameter(i + 1, params.get(i));
        return ((Number) query.getSingleResult()).longValue();
    }

    public Optional<PaymentDTO.ResponseDetail> findPaymentDetail(UUID paymentId) {
        String sql = """
            SELECT p.payment_id, p.order_id,
                   m.name AS member_name, m.email AS member_email,
                   pl.plan_name,
                   p.approved_at, p.amount, p.payment_status, p.payment_method,
                   r.refund_status
            FROM payments p
            JOIN members m   ON m.member_id = p.member_id
            JOIN plans pl    ON pl.plan_id  = p.plan_id
            LEFT JOIN refunds r ON r.payment_id = p.payment_id
            WHERE p.payment_id = ?1
            """;

        Query query = em.createNativeQuery(sql);
        query.setParameter(1, paymentId);

        List<?> rows = query.getResultList();
        if (rows.isEmpty()) return Optional.empty();

        Object[] row = (Object[]) rows.get(0);
        return Optional.of(new PaymentDTO.ResponseDetail(
            row[0].toString(),
            (String) row[1],
            (String) row[2],
            (String) row[3],
            (String) row[4],
            toZdt(row[5]),
            ((Number) row[6]).intValue(),
            PaymentStatus.valueOf((String) row[7]),
            (String) row[8],
            row[9] != null ? RefundStatus.valueOf((String) row[9]) : null,
            null
        ));
    }

    public PaymentDTO.ResponseDetail.AiUsage findAiUsage(UUID paymentId) {
        String sql = """
            SELECT a.feature_type, COUNT(*) AS cnt
            FROM ai_usage_logs a
            JOIN payments p ON p.member_id = a.member_id
            WHERE p.payment_id = ?1
            GROUP BY a.feature_type
            """;

        Query query = em.createNativeQuery(sql);
        query.setParameter(1, paymentId);

        @SuppressWarnings("unchecked")
        List<Object[]> rows = query.getResultList();

        int documentCount = 0;
        int interviewCount = 0;
        for (Object[] row : rows) {
            String featureType = (String) row[0];
            int cnt = ((Number) row[1]).intValue();
            if ("DOCUMENT".equals(featureType)) documentCount = cnt;
            else if ("INTERVIEW".equals(featureType)) interviewCount = cnt;
        }
        return new PaymentDTO.ResponseDetail.AiUsage(documentCount, interviewCount);
    }
}
