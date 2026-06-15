package kr.co.carrer.admin.audit.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import kr.co.carrer.admin.audit.entity.AuditLog;
import kr.co.carrer.admin.audit.type.AuditLogSeverity;
import kr.co.carrer.admin.audit.type.AuditLogType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class AuditLogQueryRepository {

    @PersistenceContext
    private EntityManager em;

    public SummaryAggregate getSummary(ZonedDateTime from, ZonedDateTime to) {
        StringBuilder sql = new StringBuilder("""
            SELECT
                COUNT(*) AS total_count,
                COUNT(*) FILTER (WHERE al.log_type = 'ADMIN_ACTIVITY') AS admin_activity_count,
                COUNT(*) FILTER (WHERE al.log_type = 'AI_METRICS_SYSTEM') AS ai_metrics_system_count,
                COUNT(*) FILTER (WHERE al.log_type = 'SCRAPING_SYSTEM') AS scraping_system_count,
                COUNT(*) FILTER (WHERE al.severity = 'INFO') AS info_count,
                COUNT(*) FILTER (WHERE al.severity = 'WARN') AS warn_count,
                COUNT(*) FILTER (WHERE al.severity = 'ERROR') AS error_count,
                COUNT(*) FILTER (WHERE al.severity = 'SUCCESS') AS success_count
            FROM audit_logs al
            WHERE 1=1
            """);

        int parameterIndex = 1;
        if (from != null) {
            sql.append(" AND al.created_at >= ?").append(parameterIndex++);
        }
        if (to != null) {
            sql.append(" AND al.created_at <= ?").append(parameterIndex);
        }

        Query query = em.createNativeQuery(sql.toString());

        parameterIndex = 1;
        if (from != null) {
            query.setParameter(parameterIndex++, from);
        }
        if (to != null) {
            query.setParameter(parameterIndex, to);
        }

        Object[] result = (Object[]) query.getSingleResult();

        return new SummaryAggregate(
            toLong(result[0]),
            toLong(result[1]),
            toLong(result[2]),
            toLong(result[3]),
            toLong(result[4]),
            toLong(result[5]),
            toLong(result[6]),
            toLong(result[7])
        );
    }

    public Page<AuditLog> findAuditLogsByLogType(AuditLogType logType, Pageable pageable) {
        StringBuilder sql = new StringBuilder("""
            SELECT al.*
            FROM audit_logs al
            WHERE 1=1
            """);

        int parameterIndex = 1;
        if (logType != null) {
            sql.append(" AND al.log_type = ?").append(parameterIndex++);
        }

        sql.append(" ORDER BY al.created_at DESC LIMIT ?").append(parameterIndex)
            .append(" OFFSET ?").append(parameterIndex + 1);

        Query query = em.createNativeQuery(sql.toString(), AuditLog.class);

        parameterIndex = 1;
        if (logType != null) {
            query.setParameter(parameterIndex++, logType.name());
        }
        query.setParameter(parameterIndex++, pageable.getPageSize());
        query.setParameter(parameterIndex, pageable.getOffset());

        @SuppressWarnings("unchecked")
        List<AuditLog> result = query.getResultList();

        long total = countAuditLogsByLogType(logType);
        return new PageImpl<>(result, pageable, total);
    }

    public long countAuditLogsByLogType(AuditLogType logType) {
        StringBuilder sql = new StringBuilder("""
            SELECT COUNT(*)
            FROM audit_logs al
            WHERE 1=1
            """);

        if (logType != null) {
            sql.append(" AND al.log_type = ?1");
        }

        Query query = em.createNativeQuery(sql.toString());
        if (logType != null) {
            query.setParameter(1, logType.name());
        }

        return ((Number) query.getSingleResult()).longValue();
    }

    public Page<AuditLog> findAuditLogsBySeverity(AuditLogSeverity severity, Pageable pageable) {
        StringBuilder sql = new StringBuilder("""
            SELECT al.*
            FROM audit_logs al
            WHERE 1=1
            """);

        int parameterIndex = 1;
        if (severity != null) {
            sql.append(" AND al.severity = ?").append(parameterIndex++);
        }

        sql.append(" ORDER BY al.created_at DESC LIMIT ?").append(parameterIndex)
            .append(" OFFSET ?").append(parameterIndex + 1);

        Query query = em.createNativeQuery(sql.toString(), AuditLog.class);

        parameterIndex = 1;
        if (severity != null) {
            query.setParameter(parameterIndex++, severity.name());
        }
        query.setParameter(parameterIndex++, pageable.getPageSize());
        query.setParameter(parameterIndex, pageable.getOffset());

        @SuppressWarnings("unchecked")
        List<AuditLog> result = query.getResultList();

        long total = countAuditLogsBySeverity(severity);
        return new PageImpl<>(result, pageable, total);
    }

    public long countAuditLogsBySeverity(AuditLogSeverity severity) {
        StringBuilder sql = new StringBuilder("""
            SELECT COUNT(*)
            FROM audit_logs al
            WHERE 1=1
            """);

        if (severity != null) {
            sql.append(" AND al.severity = ?1");
        }

        Query query = em.createNativeQuery(sql.toString());
        if (severity != null) {
            query.setParameter(1, severity.name());
        }

        return ((Number) query.getSingleResult()).longValue();
    }

    public Page<AuditLog> findAuditLogsByKeyword(String keyword, Pageable pageable) {
        String normalizedKeyword = normalizeKeyword(keyword);

        StringBuilder sql = new StringBuilder("""
            SELECT al.*
            FROM audit_logs al
            WHERE 1=1
            """);

        int parameterIndex = 1;
        if (normalizedKeyword != null) {
            sql.append("""
                 AND (
                    al.action ILIKE ?""").append(parameterIndex)
                .append(" OR CAST(al.target_type AS TEXT) ILIKE ?").append(parameterIndex)
                .append(" OR CAST(al.target_id AS TEXT) ILIKE ?").append(parameterIndex)
                .append(" OR CAST(al.detail AS TEXT) ILIKE ?").append(parameterIndex)
                .append(")");
            parameterIndex++;
        }

        sql.append(" ORDER BY al.created_at DESC LIMIT ?").append(parameterIndex)
            .append(" OFFSET ?").append(parameterIndex + 1);

        Query query = em.createNativeQuery(sql.toString(), AuditLog.class);

        parameterIndex = 1;
        if (normalizedKeyword != null) {
            query.setParameter(parameterIndex++, "%" + normalizedKeyword + "%");
        }
        query.setParameter(parameterIndex++, pageable.getPageSize());
        query.setParameter(parameterIndex, pageable.getOffset());

        @SuppressWarnings("unchecked")
        List<AuditLog> result = query.getResultList();

        long total = countAuditLogsByKeyword(keyword);
        return new PageImpl<>(result, pageable, total);
    }

    public long countAuditLogsByKeyword(String keyword) {
        String normalizedKeyword = normalizeKeyword(keyword);

        StringBuilder sql = new StringBuilder("""
            SELECT COUNT(*)
            FROM audit_logs al
            WHERE 1=1
            """);

        if (normalizedKeyword != null) {
            sql.append("""
                 AND (
                    al.action ILIKE ?1
                    OR CAST(al.target_type AS TEXT) ILIKE ?1
                    OR CAST(al.target_id AS TEXT) ILIKE ?1
                    OR CAST(al.detail AS TEXT) ILIKE ?1
                )
                """);
        }

        Query query = em.createNativeQuery(sql.toString());
        if (normalizedKeyword != null) {
            query.setParameter(1, "%" + normalizedKeyword + "%");
        }

        return ((Number) query.getSingleResult()).longValue();
    }

    public Page<AuditLog> findAuditLogsByPeriod(ZonedDateTime from, ZonedDateTime to, Pageable pageable) {
        StringBuilder sql = new StringBuilder("""
            SELECT al.*
            FROM audit_logs al
            WHERE 1=1
            """);

        int parameterIndex = 1;
        if (from != null) {
            sql.append(" AND al.created_at >= ?").append(parameterIndex++);
        }
        if (to != null) {
            sql.append(" AND al.created_at <= ?").append(parameterIndex++);
        }

        sql.append(" ORDER BY al.created_at DESC LIMIT ?").append(parameterIndex)
            .append(" OFFSET ?").append(parameterIndex + 1);

        Query query = em.createNativeQuery(sql.toString(), AuditLog.class);

        parameterIndex = 1;
        if (from != null) {
            query.setParameter(parameterIndex++, from);
        }
        if (to != null) {
            query.setParameter(parameterIndex++, to);
        }
        query.setParameter(parameterIndex++, pageable.getPageSize());
        query.setParameter(parameterIndex, pageable.getOffset());

        @SuppressWarnings("unchecked")
        List<AuditLog> result = query.getResultList();

        long total = countAuditLogsByPeriod(from, to);
        return new PageImpl<>(result, pageable, total);
    }

    public long countAuditLogsByPeriod(ZonedDateTime from, ZonedDateTime to) {
        StringBuilder sql = new StringBuilder("""
            SELECT COUNT(*)
            FROM audit_logs al
            WHERE 1=1
            """);

        int parameterIndex = 1;
        if (from != null) {
            sql.append(" AND al.created_at >= ?").append(parameterIndex++);
        }
        if (to != null) {
            sql.append(" AND al.created_at <= ?").append(parameterIndex);
        }

        Query query = em.createNativeQuery(sql.toString());

        parameterIndex = 1;
        if (from != null) {
            query.setParameter(parameterIndex++, from);
        }
        if (to != null) {
            query.setParameter(parameterIndex, to);
        }

        return ((Number) query.getSingleResult()).longValue();
    }

    public Page<AuditLog> findAuditLogs(
        AuditLogType logType,
        AuditLogSeverity severity,
        String keyword,
        ZonedDateTime from,
        ZonedDateTime to,
        Pageable pageable
    ) {
        String normalizedKeyword = normalizeKeyword(keyword);
        StringBuilder sql = new StringBuilder("""
            SELECT al.*
            FROM audit_logs al
            WHERE 1=1
            """);

        int parameterIndex = 1;
        if (logType != null) {
            sql.append(" AND al.log_type = ?").append(parameterIndex++);
        }
        if (severity != null) {
            sql.append(" AND al.severity = ?").append(parameterIndex++);
        }
        if (normalizedKeyword != null) {
            sql.append("""
                 AND (
                    al.action ILIKE ?""").append(parameterIndex)
                .append(" OR CAST(al.target_type AS TEXT) ILIKE ?").append(parameterIndex)
                .append(" OR CAST(al.target_id AS TEXT) ILIKE ?").append(parameterIndex)
                .append(" OR CAST(al.detail AS TEXT) ILIKE ?").append(parameterIndex)
                .append(")");
            parameterIndex++;
        }
        if (from != null) {
            sql.append(" AND al.created_at >= ?").append(parameterIndex++);
        }
        if (to != null) {
            sql.append(" AND al.created_at <= ?").append(parameterIndex++);
        }

        sql.append(" ORDER BY al.created_at DESC LIMIT ?").append(parameterIndex)
            .append(" OFFSET ?").append(parameterIndex + 1);

        Query query = em.createNativeQuery(sql.toString(), AuditLog.class);

        parameterIndex = 1;
        if (logType != null) {
            query.setParameter(parameterIndex++, logType.name());
        }
        if (severity != null) {
            query.setParameter(parameterIndex++, severity.name());
        }
        if (normalizedKeyword != null) {
            query.setParameter(parameterIndex++, "%" + normalizedKeyword + "%");
        }
        if (from != null) {
            query.setParameter(parameterIndex++, from);
        }
        if (to != null) {
            query.setParameter(parameterIndex++, to);
        }
        query.setParameter(parameterIndex++, pageable.getPageSize());
        query.setParameter(parameterIndex, pageable.getOffset());

        @SuppressWarnings("unchecked")
        List<AuditLog> result = query.getResultList();

        long total = countAuditLogs(logType, severity, keyword, from, to);
        return new PageImpl<>(result, pageable, total);
    }

    public long countAuditLogs(
        AuditLogType logType,
        AuditLogSeverity severity,
        String keyword,
        ZonedDateTime from,
        ZonedDateTime to
    ) {
        String normalizedKeyword = normalizeKeyword(keyword);
        StringBuilder sql = new StringBuilder("""
            SELECT COUNT(*)
            FROM audit_logs al
            WHERE 1=1
            """);

        int parameterIndex = 1;
        if (logType != null) {
            sql.append(" AND al.log_type = ?").append(parameterIndex++);
        }
        if (severity != null) {
            sql.append(" AND al.severity = ?").append(parameterIndex++);
        }
        if (normalizedKeyword != null) {
            sql.append("""
                 AND (
                    al.action ILIKE ?""").append(parameterIndex)
                .append(" OR CAST(al.target_type AS TEXT) ILIKE ?").append(parameterIndex)
                .append(" OR CAST(al.target_id AS TEXT) ILIKE ?").append(parameterIndex)
                .append(" OR CAST(al.detail AS TEXT) ILIKE ?").append(parameterIndex)
                .append(")");
            parameterIndex++;
        }
        if (from != null) {
            sql.append(" AND al.created_at >= ?").append(parameterIndex++);
        }
        if (to != null) {
            sql.append(" AND al.created_at <= ?").append(parameterIndex);
        }

        Query query = em.createNativeQuery(sql.toString());

        parameterIndex = 1;
        if (logType != null) {
            query.setParameter(parameterIndex++, logType.name());
        }
        if (severity != null) {
            query.setParameter(parameterIndex++, severity.name());
        }
        if (normalizedKeyword != null) {
            query.setParameter(parameterIndex++, "%" + normalizedKeyword + "%");
        }
        if (from != null) {
            query.setParameter(parameterIndex++, from);
        }
        if (to != null) {
            query.setParameter(parameterIndex, to);
        }

        return ((Number) query.getSingleResult()).longValue();
    }

    public Optional<AuditLog> findAuditLogById(Long logId) {
        Query query = em.createNativeQuery("""
            SELECT al.*
            FROM audit_logs al
            WHERE al.audit_log_id = ?1
            """, AuditLog.class);
        query.setParameter(1, logId);

        @SuppressWarnings("unchecked")
        List<AuditLog> result = query.getResultList();

        if (result.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(result.getFirst());
    }

    private String normalizeKeyword(String keyword) {
        if (keyword == null) {
            return null;
        }
        String trimmedKeyword = keyword.trim();
        return trimmedKeyword.isEmpty() ? null : trimmedKeyword;
    }

    private long toLong(Object value) {
        return value == null ? 0L : ((Number) value).longValue();
    }

    public record SummaryAggregate(
        long totalCount,
        long adminActivityCount,
        long aiMetricsSystemCount,
        long scrapingSystemCount,
        long infoCount,
        long warnCount,
        long errorCount,
        long successCount
    ) {
    }
}
