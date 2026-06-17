package kr.co.carrer.admin.audit.controller;

import kr.co.carrer.admin.audit.docs.AuditLogDocs;
import kr.co.carrer.admin.audit.dto.AuditLogDTO;
import kr.co.carrer.admin.audit.entity.AuditLog;
import kr.co.carrer.admin.audit.service.AuditLogService;
import kr.co.carrer.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/audit-logs")
@RequiredArgsConstructor
@Validated
@PreAuthorize("hasRole('ADMIN') and (hasRole('MASTER') or hasRole('BACKEND'))")
public class AuditLogController implements AuditLogDocs {

    private final AuditLogService auditLogService;

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<AuditLogDTO.ResponseSummary>> getSummary(
        @Valid @ModelAttribute AuditLogDTO.RequestSummary request
    ) {
        AuditLogService.ResponseSummary summary = auditLogService.getSummary(
            request.from(),
            request.to()
        );

        AuditLogDTO.ResponseSummary response = new AuditLogDTO.ResponseSummary(
            summary.totalCount(),
            summary.adminActivityCount(),
            summary.aiMetricsSystemCount(),
            summary.scrapingSystemCount(),
            summary.infoCount(),
            summary.warnCount(),
            summary.errorCount(),
            summary.successCount()
        );

        return ResponseEntity.ok(ApiResponse.ok("감사 로그 요약 조회에 성공했습니다.", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<AuditLogDTO.ResponseList>> getAuditLogs(
        @Valid @ModelAttribute AuditLogDTO.RequestList request
    ) {
        int page = request.page() == null ? 1 : request.page();
        int size = request.size() == null ? 20 : request.size();

        Page<AuditLog> auditLogs = auditLogService.getAuditLogs(
            request.logType(),
            request.severity(),
            request.keyword(),
            request.from(),
            request.to(),
            page,
            size
        );

        List<AuditLogDTO.ResponseItem> content = auditLogs.getContent().stream()
            .map(this::toResponseItem)
            .toList();

        AuditLogDTO.ResponseList response = new AuditLogDTO.ResponseList(
            content,
            page,
            size,
            auditLogs.getTotalElements(),
            auditLogs.getTotalPages()
        );

        return ResponseEntity.ok(ApiResponse.ok("감사 로그 목록 조회에 성공했습니다.", response));
    }

    private AuditLogDTO.ResponseItem toResponseItem(AuditLog auditLog) {
        return new AuditLogDTO.ResponseItem(
            auditLog.getAuditLogId(),
            auditLog.getAdminId(),
            auditLog.getLogType(),
            auditLog.getAction(),
            auditLog.getTargetType(),
            auditLog.getTargetId(),
            auditLog.getIpAddress(),
            auditLog.getSeverity(),
            auditLog.getDetail(),
            auditLog.getCreatedAt()
        );
    }

    @GetMapping("/{logId}")
    public ResponseEntity<ApiResponse<AuditLogDTO.ResponseDetail>> getAuditLogDetail(
        @PathVariable Long logId
    ) {
        AuditLog auditLog = auditLogService.getAuditLogDetail(logId);

        AuditLogDTO.ResponseDetail response = new AuditLogDTO.ResponseDetail(
            auditLog.getAuditLogId(),
            auditLog.getAdminId(),
            auditLog.getLogType(),
            auditLog.getAction(),
            auditLog.getTargetType(),
            auditLog.getTargetId(),
            auditLog.getIpAddress(),
            auditLog.getSeverity(),
            auditLog.getDetail(),
            auditLog.getCreatedAt()
        );

        return ResponseEntity.ok(ApiResponse.ok("감사 로그 상세 조회에 성공했습니다.", response));
    }
}
