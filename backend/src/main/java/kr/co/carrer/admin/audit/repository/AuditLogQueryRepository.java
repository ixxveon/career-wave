package kr.co.carrer.admin.audit.repository;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.Tuple;
import com.querydsl.core.types.dsl.NumberExpression;
import com.querydsl.core.types.dsl.CaseBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;
import kr.co.carrer.admin.audit.entity.AuditLog;
import kr.co.carrer.admin.audit.entity.QAuditLog;
import kr.co.carrer.admin.audit.type.AuditLogSeverity;
import kr.co.carrer.admin.audit.type.AuditLogType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class AuditLogQueryRepository {

    private static final QAuditLog auditLog = QAuditLog.auditLog;

    private final JPAQueryFactory queryFactory;

    public SummaryAggregate getSummary(ZonedDateTime from, ZonedDateTime to) {
        BooleanBuilder periodPredicate = periodPredicate(from, to);
        NumberExpression<Long> adminActivityCount = new CaseBuilder()
                .when(auditLog.logType.eq(AuditLogType.ADMIN_ACTIVITY))
                .then(1L)
                .otherwise(0L)
                .sum();
        NumberExpression<Long> adminManagementCount = new CaseBuilder()
                .when(auditLog.logType.eq(AuditLogType.ADMIN_MANAGEMENT))
                .then(1L)
                .otherwise(0L)
                .sum();
        NumberExpression<Long> aiMetricsSystemCount = new CaseBuilder()
                .when(auditLog.logType.eq(AuditLogType.AI_METRICS_SYSTEM))
                .then(1L)
                .otherwise(0L)
                .sum();
        NumberExpression<Long> scrapingSystemCount = new CaseBuilder()
                .when(auditLog.logType.eq(AuditLogType.SCRAPING_SYSTEM))
                .then(1L)
                .otherwise(0L)
                .sum();
        NumberExpression<Long> infoCount = new CaseBuilder()
                .when(auditLog.severity.eq(AuditLogSeverity.INFO))
                .then(1L)
                .otherwise(0L)
                .sum();
        NumberExpression<Long> warnCount = new CaseBuilder()
                .when(auditLog.severity.eq(AuditLogSeverity.WARN))
                .then(1L)
                .otherwise(0L)
                .sum();
        NumberExpression<Long> errorCount = new CaseBuilder()
                .when(auditLog.severity.eq(AuditLogSeverity.ERROR))
                .then(1L)
                .otherwise(0L)
                .sum();
        NumberExpression<Long> successCount = new CaseBuilder()
                .when(auditLog.severity.eq(AuditLogSeverity.SUCCESS))
                .then(1L)
                .otherwise(0L)
                .sum();

        Tuple row = queryFactory
                .select(
                        auditLog.count(),
                        adminActivityCount,
                        adminManagementCount,
                        aiMetricsSystemCount,
                        scrapingSystemCount,
                        infoCount,
                        warnCount,
                        errorCount,
                        successCount
                )
                .from(auditLog)
                .where(periodPredicate)
                .fetchOne();

        if (row == null) {
            return new SummaryAggregate(0L, 0L, 0L, 0L, 0L, 0L, 0L, 0L, 0L);
        }

        return new SummaryAggregate(
                valueOrZero(row.get(auditLog.count())),
                valueOrZero(row.get(adminActivityCount)),
                valueOrZero(row.get(adminManagementCount)),
                valueOrZero(row.get(aiMetricsSystemCount)),
                valueOrZero(row.get(scrapingSystemCount)),
                valueOrZero(row.get(infoCount)),
                valueOrZero(row.get(warnCount)),
                valueOrZero(row.get(errorCount)),
                valueOrZero(row.get(successCount))
        );
    }

    public Page<AuditLog> findAuditLogsByLogType(AuditLogType logType, Pageable pageable) {
        BooleanBuilder predicate = new BooleanBuilder();
        if (logType != null) {
            predicate.and(auditLog.logType.eq(logType));
        }
        return fetchPage(predicate, pageable);
    }

    public long countAuditLogsByLogType(AuditLogType logType) {
        BooleanBuilder predicate = new BooleanBuilder();
        if (logType != null) {
            predicate.and(auditLog.logType.eq(logType));
        }
        return count(predicate);
    }

    public Page<AuditLog> findAuditLogsBySeverity(AuditLogSeverity severity, Pageable pageable) {
        BooleanBuilder predicate = new BooleanBuilder();
        if (severity != null) {
            predicate.and(auditLog.severity.eq(severity));
        }
        return fetchPage(predicate, pageable);
    }

    public long countAuditLogsBySeverity(AuditLogSeverity severity) {
        BooleanBuilder predicate = new BooleanBuilder();
        if (severity != null) {
            predicate.and(auditLog.severity.eq(severity));
        }
        return count(predicate);
    }

    public Page<AuditLog> findAuditLogsByKeyword(String keyword, Pageable pageable) {
        return fetchPage(keywordPredicate(keyword), pageable);
    }

    public long countAuditLogsByKeyword(String keyword) {
        return count(keywordPredicate(keyword));
    }

    public Page<AuditLog> findAuditLogsByPeriod(ZonedDateTime from, ZonedDateTime to, Pageable pageable) {
        return fetchPage(periodPredicate(from, to), pageable);
    }

    public long countAuditLogsByPeriod(ZonedDateTime from, ZonedDateTime to) {
        return count(periodPredicate(from, to));
    }

    public Page<AuditLog> findAuditLogs(
            AuditLogType logType,
            AuditLogSeverity severity,
            String keyword,
            ZonedDateTime from,
            ZonedDateTime to,
            Pageable pageable
    ) {
        BooleanBuilder predicate = buildPredicate(logType, severity, keyword, from, to);
        return fetchPage(predicate, pageable);
    }

    public long countAuditLogs(
            AuditLogType logType,
            AuditLogSeverity severity,
            String keyword,
            ZonedDateTime from,
            ZonedDateTime to
    ) {
        return count(buildPredicate(logType, severity, keyword, from, to));
    }

    public Optional<AuditLog> findAuditLogById(Long logId) {
        AuditLog result = queryFactory
                .selectFrom(auditLog)
                .where(auditLog.auditLogId.eq(logId))
                .fetchOne();

        return Optional.ofNullable(result);
    }

    private Page<AuditLog> fetchPage(BooleanBuilder predicate, Pageable pageable) {
        List<AuditLog> result = queryFactory
                .selectFrom(auditLog)
                .where(predicate)
                .orderBy(auditLog.createdAt.desc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        long total = count(predicate);
        return new PageImpl<>(result, pageable, total);
    }

    private long count(BooleanBuilder predicate) {
        Long count = queryFactory
                .select(auditLog.count())
                .from(auditLog)
                .where(predicate)
                .fetchOne();

        return count != null ? count : 0L;
    }

    private BooleanBuilder buildPredicate(
            AuditLogType logType,
            AuditLogSeverity severity,
            String keyword,
            ZonedDateTime from,
            ZonedDateTime to
    ) {
        BooleanBuilder predicate = new BooleanBuilder();

        if (logType != null) {
            predicate.and(auditLog.logType.eq(logType));
        }
        if (severity != null) {
            predicate.and(auditLog.severity.eq(severity));
        }
        predicate.and(keywordPredicate(keyword));
        predicate.and(periodPredicate(from, to));

        return predicate;
    }

    private BooleanBuilder keywordPredicate(String keyword) {
        BooleanBuilder predicate = new BooleanBuilder();
        String normalizedKeyword = normalizeKeyword(keyword);

        if (normalizedKeyword != null) {
            predicate.and(
                    auditLog.action.containsIgnoreCase(normalizedKeyword)
                            .or(auditLog.targetType.containsIgnoreCase(normalizedKeyword))
                            .or(auditLog.targetId.containsIgnoreCase(normalizedKeyword))
                            .or(auditLog.detail.containsIgnoreCase(normalizedKeyword))
            );
        }

        return predicate;
    }

    private BooleanBuilder periodPredicate(ZonedDateTime from, ZonedDateTime to) {
        BooleanBuilder predicate = new BooleanBuilder();

        if (from != null) {
            predicate.and(auditLog.createdAt.goe(from));
        }
        if (to != null) {
            predicate.and(auditLog.createdAt.loe(to));
        }

        return predicate;
    }

    private String normalizeKeyword(String keyword) {
        if (keyword == null) {
            return null;
        }
        String trimmedKeyword = keyword.trim();
        return trimmedKeyword.isEmpty() ? null : trimmedKeyword;
    }

    private long valueOrZero(Long value) {
        return value != null ? value : 0L;
    }

    public record SummaryAggregate(
            long totalCount,
            long adminActivityCount,
            long adminManagementCount,
            long aiMetricsSystemCount,
            long scrapingSystemCount,
            long infoCount,
            long warnCount,
            long errorCount,
            long successCount
    ) {
    }
}
