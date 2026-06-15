package kr.co.carrer.admin.audit.service;

import kr.co.carrer.admin.audit.entity.AuditLog;
import kr.co.carrer.admin.audit.repository.AuditLogQueryRepository;
import org.springframework.data.domain.Page;

import java.time.ZonedDateTime;

public interface AuditLogService {

    AuditLogQueryRepository.SummaryAggregate getSummary(ZonedDateTime from, ZonedDateTime to);

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
}
