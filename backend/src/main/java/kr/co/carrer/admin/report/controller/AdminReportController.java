package kr.co.carrer.admin.report.controller;

import kr.co.carrer.admin.report.docs.AdminReportControllerDocs;
import kr.co.carrer.admin.report.dto.ReportDetailDTO;
import kr.co.carrer.admin.report.service.AdminReportService;
import kr.co.carrer.admin.report.type.ReportReason;
import kr.co.carrer.admin.report.type.ReportStatus;
import kr.co.carrer.admin.report.type.TargetType;
import kr.co.carrer.admin.report.exception.AdminReportErrorCode;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.global.response.PaginationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN') and (hasRole('MASTER') or hasRole('CS'))")
public class AdminReportController implements AdminReportControllerDocs {

    private final AdminReportService adminReportService;

    @GetMapping("/reports/summary")
    public ResponseEntity<ApiResponse<ReportDetailDTO.ResponseSummary>> getSummary() {
        return ResponseEntity.ok(ApiResponse.ok(adminReportService.getSummary()));
    }

    @GetMapping("/reports")
    public ResponseEntity<ApiResponse<PaginationResponse<ReportDetailDTO.ResponseList>>> getReports(
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String targetType,
        @RequestParam(required = false) String reason,
        @RequestParam(required = false) String keyword,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        ReportStatus reportStatus   = parseEnum(ReportStatus.class, status);
        TargetType   targetTypeEnum = parseEnum(TargetType.class, targetType);
        ReportReason reportReason   = parseEnum(ReportReason.class, reason);

        return ResponseEntity.ok(ApiResponse.ok(
            adminReportService.getReports(reportStatus, targetTypeEnum, reportReason, keyword, page, size)
        ));
    }

    @GetMapping("/reports/{reportId}")
    public ResponseEntity<ApiResponse<ReportDetailDTO.ResponseDetail>> getReportDetail(
        @PathVariable Long reportId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(adminReportService.getReportDetail(reportId)));
    }

    @PatchMapping("/reports/{reportId}/blind")
    public ResponseEntity<ApiResponse<ReportDetailDTO.ResponseProcess>> blindReport(
        @PathVariable Long reportId,
        @AuthenticationPrincipal Long adminId
    ) {
        if (adminId == null) throw new CustomException(ErrorCode.UNAUTHORIZED);
        return ResponseEntity.ok(ApiResponse.ok(adminReportService.blindReport(reportId, adminId)));
    }

    @PatchMapping("/reports/{reportId}/dismiss")
    public ResponseEntity<ApiResponse<ReportDetailDTO.ResponseProcess>> dismissReport(
        @PathVariable Long reportId,
        @AuthenticationPrincipal Long adminId
    ) {
        if (adminId == null) throw new CustomException(ErrorCode.UNAUTHORIZED);
        return ResponseEntity.ok(ApiResponse.ok(adminReportService.dismissReport(reportId, adminId)));
    }

    private <T extends Enum<T>> T parseEnum(Class<T> enumClass, String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Enum.valueOf(enumClass, value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new CustomException(AdminReportErrorCode.INVALID_REPORT_FILTER);
        }
    }
}
