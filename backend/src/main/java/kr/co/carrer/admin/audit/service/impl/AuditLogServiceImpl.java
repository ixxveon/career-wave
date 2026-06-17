package kr.co.carrer.admin.audit.service.impl;

import kr.co.carrer.admin.audit.entity.AuditLog;
import kr.co.carrer.admin.audit.exception.AuditLogErrorCode;
import kr.co.carrer.admin.audit.repository.AuditLogQueryRepository;
import kr.co.carrer.admin.audit.service.AuditLogService;
import kr.co.carrer.admin.audit.type.AuditLogSeverity;
import kr.co.carrer.admin.audit.type.AuditLogType;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;

@Service
@RequiredArgsConstructor
public class AuditLogServiceImpl implements AuditLogService {

    private static final int MAX_PAGE_SIZE = 100;

    private final AuditLogQueryRepository auditLogQueryRepository;

    @Override
    @Transactional(readOnly = true)
    public ResponseSummary getSummary(ZonedDateTime from, ZonedDateTime to) {
        validateDateRange(from, to);
        AuditLogQueryRepository.SummaryAggregate summary = auditLogQueryRepository.getSummary(from, to);
        return new ResponseSummary(
            summary.totalCount(),
            summary.adminActivityCount(),
            summary.adminManagementCount(),
            summary.aiMetricsSystemCount(),
            summary.scrapingSystemCount(),
            summary.infoCount(),
            summary.warnCount(),
            summary.errorCount(),
            summary.successCount()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AuditLog> getAuditLogs(
        String logType,
        String severity,
        String keyword,
        ZonedDateTime from,
        ZonedDateTime to,
        int page,
        int size
    ) {
        validateDateRange(from, to);
        validatePageSize(page, size);
        AuditLogType auditLogType = parseLogType(logType);
        AuditLogSeverity auditLogSeverity = parseSeverity(severity);
        String normalizedKeyword = normalizeKeyword(keyword);

        return auditLogQueryRepository.findAuditLogs(
            auditLogType,
            auditLogSeverity,
            normalizedKeyword,
            from,
            to,
            PageRequest.of(toInternalPage(page), size)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public AuditLog getAuditLogDetail(Long logId) {
        return auditLogQueryRepository.findAuditLogById(logId)
            .orElseThrow(() -> new CustomException(AuditLogErrorCode.AUDIT_LOG_NOT_FOUND));
    }

    private AuditLogType parseLogType(String logType) {
        if (logType == null || logType.isBlank()) {
            return null;
        }
        try {
            return AuditLogType.valueOf(logType.trim());
        } catch (IllegalArgumentException exception) {
            throw new CustomException(AuditLogErrorCode.INVALID_AUDIT_LOG_TYPE);
        }
    }

    private AuditLogSeverity parseSeverity(String severity) {
        if (severity == null || severity.isBlank()) {
            return null;
        }
        try {
            return AuditLogSeverity.valueOf(severity.trim());
        } catch (IllegalArgumentException exception) {
            throw new CustomException(AuditLogErrorCode.INVALID_AUDIT_LOG_SEVERITY);
        }
    }

    private String normalizeKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return null;
        }
        return keyword.trim();
    }

    private void validateDateRange(ZonedDateTime from, ZonedDateTime to) {
        if (from == null || to == null) {
            return;
        }
        if (from.isAfter(to)) {
            throw new CustomException(AuditLogErrorCode.INVALID_DATE_RANGE);
        }
    }

    private void validatePageSize(int page, int size) {
        if (page < 1 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new CustomException(ErrorCode.BAD_REQUEST);
        }
    }

    private int toInternalPage(int page) {
        return page - 1;
    }
}
