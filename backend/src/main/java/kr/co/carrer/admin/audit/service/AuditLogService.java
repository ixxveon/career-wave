package kr.co.carrer.admin.audit.service;

import kr.co.carrer.admin.audit.entity.AuditLog;
import org.springframework.data.domain.Page;

import java.time.ZonedDateTime;

public interface AuditLogService {

    ResponseSummary getSummary(ZonedDateTime from, ZonedDateTime to);

    Page<AuditLog> getAuditLogs(
        String logType,
        String severity,
        String keyword,
        ZonedDateTime from,
        ZonedDateTime to,
        int page,
        int size
    );

    AuditLog getAuditLogDetail(Long logId);

    record ResponseSummary(
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
