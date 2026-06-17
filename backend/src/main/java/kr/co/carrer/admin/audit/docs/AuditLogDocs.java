package kr.co.carrer.admin.audit.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.co.carrer.admin.audit.dto.AuditLogDTO;
import kr.co.carrer.global.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;

@Tag(name = "Admin Audit Log", description = "관리자 감사 로그 조회 API")
public interface AuditLogDocs {

    @Operation(summary = "감사 로그 요약 조회")
    ResponseEntity<ApiResponse<AuditLogDTO.ResponseSummary>> getSummary(
        @Valid @ModelAttribute AuditLogDTO.RequestSummary request
    );

    @Operation(summary = "감사 로그 목록 조회")
    ResponseEntity<ApiResponse<AuditLogDTO.ResponseList>> getAuditLogs(
        @Valid @ModelAttribute AuditLogDTO.RequestList request
    );

    @Operation(summary = "감사 로그 상세 조회")
    ResponseEntity<ApiResponse<AuditLogDTO.ResponseDetail>> getAuditLogDetail(
        @Parameter(description = "감사 로그 ID")
        @PathVariable Long logId
    );
}
