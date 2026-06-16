package kr.co.carrer.admin.report.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import kr.co.carrer.admin.report.dto.ReportDetailDTO;
import kr.co.carrer.admin.report.type.ReportReason;
import kr.co.carrer.admin.report.type.ReportStatus;
import kr.co.carrer.admin.report.type.TargetType;
import org.springframework.stereotype.Repository;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class ReportQueryRepository {

    @PersistenceContext
    private EntityManager em;

    private ZonedDateTime toZonedDateTime(Object value) {
        if (value == null) return null;
        if (value instanceof java.sql.Timestamp ts) return ts.toInstant().atZone(java.time.ZoneId.of("Asia/Seoul"));
        if (value instanceof java.time.Instant instant) return instant.atZone(java.time.ZoneId.of("Asia/Seoul"));
        if (value instanceof java.time.OffsetDateTime odt) return odt.toZonedDateTime();
        throw new IllegalArgumentException("Unsupported timestamp type: " + value.getClass());
    }

    private void appendFilters(StringBuilder sql, List<Object> params,
                               ReportStatus status, TargetType targetType,
                               ReportReason reason, String keyword) {
        if (status != null) {
            sql.append(" AND r.report_status = ?").append(params.size() + 1);
            params.add(status.name());
        }
        if (targetType != null) {
            sql.append(" AND r.target_type = ?").append(params.size() + 1);
            params.add(targetType.name());
        }
        if (reason != null) {
            sql.append(" AND r.reason = ?").append(params.size() + 1);
            params.add(reason.name());
        }
        if (keyword != null && !keyword.isBlank()) {
            int idx = params.size() + 1;
            sql.append(" AND (CAST(r.report_id AS TEXT) ILIKE ?").append(idx)
               .append(" OR reporter.name ILIKE ?").append(idx)
               .append(" OR victim.name ILIKE ?").append(idx).append(")");
            params.add("%" + keyword + "%");
        }
    }

    public List<ReportDetailDTO.ResponseList> findReports(ReportStatus status, TargetType targetType,
                                                           ReportReason reason, String keyword,
                                                           int offset, int size) {
        StringBuilder sql = new StringBuilder("""
            SELECT r.report_id, r.target_type, r.reason, r.report_status,
                   reporter.name AS reporter_name, victim.name AS reported_name,
                   CASE WHEN r.target_type = 'BOARD' THEN b.title ELSE NULL END AS content_title,
                   r.created_at
            FROM reports r
            JOIN members reporter ON reporter.member_id = r.reporter_id
            JOIN members victim   ON victim.member_id   = r.member_id
            LEFT JOIN boards b    ON b.board_id = r.target_id AND r.target_type = 'BOARD'
            WHERE 1=1
            """);

        List<Object> params = new ArrayList<>();
        appendFilters(sql, params, status, targetType, reason, keyword);

        sql.append(" ORDER BY r.created_at DESC LIMIT ?").append(params.size() + 1)
           .append(" OFFSET ?").append(params.size() + 2);
        params.add(size);
        params.add(offset);

        Query query = em.createNativeQuery(sql.toString());
        for (int i = 0; i < params.size(); i++) {
            query.setParameter(i + 1, params.get(i));
        }

        @SuppressWarnings("unchecked")
        List<Object[]> rows = query.getResultList();
        List<ReportDetailDTO.ResponseList> result = new ArrayList<>();
        for (Object[] row : rows) {
            result.add(new ReportDetailDTO.ResponseList(
                ((Number) row[0]).longValue(),
                TargetType.valueOf((String) row[1]),
                ReportReason.valueOf((String) row[2]),
                ReportStatus.valueOf((String) row[3]),
                (String) row[4],
                (String) row[5],
                (String) row[6],
                toZonedDateTime(row[7])
            ));
        }
        return result;
    }

    public long countReports(ReportStatus status, TargetType targetType, ReportReason reason, String keyword) {
        StringBuilder sql = new StringBuilder("""
            SELECT COUNT(*)
            FROM reports r
            JOIN members reporter ON reporter.member_id = r.reporter_id
            JOIN members victim   ON victim.member_id   = r.member_id
            WHERE 1=1
            """);

        List<Object> params = new ArrayList<>();
        appendFilters(sql, params, status, targetType, reason, keyword);

        Query query = em.createNativeQuery(sql.toString());
        for (int i = 0; i < params.size(); i++) {
            query.setParameter(i + 1, params.get(i));
        }
        return ((Number) query.getSingleResult()).longValue();
    }

    public Optional<ReportDetailDTO.ResponseDetail> findReportDetail(Long reportId) {
        String sql = """
            SELECT r.report_id, r.target_type, r.target_id, r.reason, r.report_status,
                   reporter.name AS reporter_name, victim.name AS reported_name,
                   r.created_at, r.processed_at, r.processed_by
            FROM reports r
            JOIN members reporter ON reporter.member_id = r.reporter_id
            JOIN members victim   ON victim.member_id   = r.member_id
            WHERE r.report_id = ?1
            """;
        Query query = em.createNativeQuery(sql);
        query.setParameter(1, reportId);

        List<?> rows = query.getResultList();
        if (rows.isEmpty()) return Optional.empty();

        Object[] row = (Object[]) rows.get(0);
        return Optional.of(new ReportDetailDTO.ResponseDetail(
            ((Number) row[0]).longValue(),
            TargetType.valueOf((String) row[1]),
            ((Number) row[2]).longValue(),
            ReportReason.valueOf((String) row[3]),
            ReportStatus.valueOf((String) row[4]),
            (String) row[5],
            (String) row[6],
            null,   // contentTitle — 서비스 레이어에서 채움
            null,   // contentBody  — 서비스 레이어에서 채움
            toZonedDateTime(row[7]),
            toZonedDateTime(row[8]),
            row[9] != null ? ((Number) row[9]).longValue() : null
        ));
    }
}
