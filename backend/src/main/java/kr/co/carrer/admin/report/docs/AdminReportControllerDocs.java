package kr.co.carrer.admin.report.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import kr.co.carrer.admin.report.dto.ReportDetailDTO;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.global.response.PaginationResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

@Tag(name = "Admin Report", description = "관리자 신고관리 API")
public interface AdminReportControllerDocs {

    @Operation(summary = "신고 KPI 집계 조회")
    ResponseEntity<ApiResponse<ReportDetailDTO.ResponseSummary>> getSummary();

    @Operation(summary = "신고 목록 조회")
    ResponseEntity<ApiResponse<PaginationResponse<ReportDetailDTO.ResponseList>>> getReports(
        @Parameter(description = "처리 상태 (PENDING / BLINDED / DISMISSED)") @RequestParam(required = false) String status,
        @Parameter(description = "신고 대상 유형 (BOARD / COMMENT / MEMBER)") @RequestParam(required = false) String targetType,
        @Parameter(description = "신고 사유 (SPAM / ABUSE / AD / INAPPROPRIATE / OTHER)") @RequestParam(required = false) String reason,
        @Parameter(description = "신고ID·신고자명·피신고자명 통합 검색") @RequestParam(required = false) String keyword,
        @Parameter(description = "페이지 번호 (1-based)") @RequestParam(defaultValue = "1") int page,
        @Parameter(description = "페이지 크기 (최대 100)") @RequestParam(defaultValue = "20") int size
    );

    @Operation(summary = "신고 상세 조회")
    ResponseEntity<ApiResponse<ReportDetailDTO.ResponseDetail>> getReportDetail(
        @Parameter(description = "신고 ID") @PathVariable Long reportId
    );

    @Operation(summary = "신고 블라인드 처리")
    ResponseEntity<ApiResponse<ReportDetailDTO.ResponseProcess>> blindReport(
        @Parameter(description = "신고 ID") @PathVariable Long reportId,
        @AuthenticationPrincipal Long adminId
    );

    @Operation(summary = "신고 기각 처리")
    ResponseEntity<ApiResponse<ReportDetailDTO.ResponseProcess>> dismissReport(
        @Parameter(description = "신고 ID") @PathVariable Long reportId,
        @AuthenticationPrincipal Long adminId
    );
}
