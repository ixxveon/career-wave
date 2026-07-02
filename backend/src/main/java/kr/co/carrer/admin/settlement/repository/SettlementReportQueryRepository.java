package kr.co.carrer.admin.settlement.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import kr.co.carrer.admin.settlement.dto.SettlementDTO;
import kr.co.carrer.admin.settlement.type.SettlementItemType;
import kr.co.carrer.admin.settlement.type.SettlementStatus;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class SettlementReportQueryRepository {

    @PersistenceContext
    private EntityManager em;

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private ZonedDateTime toZdt(Object value) {
        if (value == null) return null;
        if (value instanceof java.sql.Timestamp ts) return ts.toInstant().atZone(KST);
        if (value instanceof java.time.Instant instant) return instant.atZone(KST);
        if (value instanceof java.time.OffsetDateTime odt) return odt.atZoneSameInstant(KST);
        throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR);
    }

    private LocalDate toLocalDate(Object value) {
        if (value == null) return null;
        if (value instanceof java.sql.Date d) return d.toLocalDate();
        if (value instanceof LocalDate ld) return ld;
        throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR);
    }

    public List<SettlementDTO.ResponseList> findSettlements(SettlementStatus status, int offset, int size) {
        StringBuilder sql = new StringBuilder("""
            SELECT s.settlement_id, s.settlement_period_start, s.settlement_period_end,
                   s.total_sales_amount, s.total_refund_amount, s.net_sales_amount,
                   s.total_transaction_count, s.settlement_status, s.created_at
            FROM settlement_reports s
            WHERE 1=1
            """);

        List<Object> params = new ArrayList<>();

        if (status != null) {
            sql.append(" AND s.settlement_status = ?").append(params.size() + 1);
            params.add(status.name());
        }

        sql.append(" ORDER BY s.settlement_period_start DESC")
           .append(" LIMIT ?").append(params.size() + 1)
           .append(" OFFSET ?").append(params.size() + 2);
        params.add(size);
        params.add(offset);

        Query query = em.createNativeQuery(sql.toString());
        for (int i = 0; i < params.size(); i++) query.setParameter(i + 1, params.get(i));

        @SuppressWarnings("unchecked")
        List<Object[]> rows = query.getResultList();
        List<SettlementDTO.ResponseList> result = new ArrayList<>();
        for (Object[] row : rows) {
            result.add(new SettlementDTO.ResponseList(
                ((Number) row[0]).longValue(),
                toLocalDate(row[1]),
                toLocalDate(row[2]),
                ((Number) row[3]).longValue(),
                ((Number) row[4]).longValue(),
                ((Number) row[5]).longValue(),
                ((Number) row[6]).intValue(),
                SettlementStatus.valueOf((String) row[7]),
                toZdt(row[8])
            ));
        }
        return result;
    }

    public long countSettlements(SettlementStatus status) {
        StringBuilder sql = new StringBuilder("""
            SELECT COUNT(*) FROM settlement_reports s WHERE 1=1
            """);

        List<Object> params = new ArrayList<>();

        if (status != null) {
            sql.append(" AND s.settlement_status = ?").append(params.size() + 1);
            params.add(status.name());
        }

        Query query = em.createNativeQuery(sql.toString());
        for (int i = 0; i < params.size(); i++) query.setParameter(i + 1, params.get(i));
        return ((Number) query.getSingleResult()).longValue();
    }

    public Optional<SettlementDTO.ResponseDetail> findSettlementDetail(Long settlementId) {
        String sql = """
            SELECT s.settlement_id, s.settlement_period_start, s.settlement_period_end,
                   s.total_sales_amount, s.total_refund_amount, s.net_sales_amount,
                   s.supply_amount, s.vat_amount,
                   s.total_transaction_count, s.paid_count, s.refund_count,
                   s.settlement_status, s.settled_at,
                   a.name AS admin_name, s.note, s.created_at
            FROM settlement_reports s
            LEFT JOIN admins a ON a.admin_id = s.admin_id
            WHERE s.settlement_id = ?1
            """;

        Query query = em.createNativeQuery(sql);
        query.setParameter(1, settlementId);

        List<?> rows = query.getResultList();
        if (rows.isEmpty()) return Optional.empty();

        Object[] row = (Object[]) rows.get(0);

        List<SettlementDTO.ItemDetail> items = findSettlementItems(settlementId);

        return Optional.of(new SettlementDTO.ResponseDetail(
            ((Number) row[0]).longValue(),
            toLocalDate(row[1]),
            toLocalDate(row[2]),
            ((Number) row[3]).longValue(),
            ((Number) row[4]).longValue(),
            ((Number) row[5]).longValue(),
            ((Number) row[6]).longValue(),
            ((Number) row[7]).longValue(),
            ((Number) row[8]).intValue(),
            ((Number) row[9]).intValue(),
            ((Number) row[10]).intValue(),
            SettlementStatus.valueOf((String) row[11]),
            toZdt(row[12]),
            (String) row[13],
            (String) row[14],
            toZdt(row[15]),
            items
        ));
    }

    private List<SettlementDTO.ItemDetail> findSettlementItems(Long settlementId) {
        String sql = """
            SELECT si.settlement_item_id, si.payment_id, p.order_id,
                   m.name AS member_name, pl.plan_name,
                   si.amount, si.item_type, p.approved_at
            FROM settlement_items si
            JOIN payments p  ON p.payment_id = si.payment_id
            JOIN members m   ON m.member_id  = p.member_id
            JOIN plans pl    ON pl.plan_id   = p.plan_id
            WHERE si.settlement_id = ?1
            ORDER BY si.settlement_item_id
            """;

        Query query = em.createNativeQuery(sql);
        query.setParameter(1, settlementId);

        @SuppressWarnings("unchecked")
        List<Object[]> rows = query.getResultList();
        List<SettlementDTO.ItemDetail> result = new ArrayList<>();
        for (Object[] row : rows) {
            result.add(new SettlementDTO.ItemDetail(
                ((Number) row[0]).longValue(),
                row[1].toString(),
                (String) row[2],
                (String) row[3],
                (String) row[4],
                ((Number) row[5]).intValue(),
                SettlementItemType.valueOf((String) row[6]),
                toZdt(row[7])
            ));
        }
        return result;
    }
}
