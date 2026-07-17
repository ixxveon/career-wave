package kr.co.carrer.admin.report.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import kr.co.carrer.admin.report.dto.ReportDetailDTO;
import kr.co.carrer.auth.principal.AuthPrincipal;
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
        @Parameter(description = "페이지 번호 (1-based)") @RequestParam(defaultValue = "1") @Min(1) int page,
        @Parameter(description = "페이지 크기 (최대 100)") @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size
    );

    @Operation(summary = "신고 상세 조회")
    ResponseEntity<ApiResponse<ReportDetailDTO.ResponseDetail>> getReportDetail(
        @Parameter(description = "신고 ID") @PathVariable Long reportId,
        @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal
    );

    @Operation(summary = "대상 회원 AI 검토")
    ResponseEntity<ApiResponse<ReportDetailDTO.ResponseMemberAiReview>> getMemberAiReview(
        @Parameter(description = "신고 ID") @PathVariable Long reportId,
        @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal
    );

    @Operation(summary = "신고 블라인드 처리")
    ResponseEntity<ApiResponse<ReportDetailDTO.ResponseProcess>> blindReport(
        @Parameter(description = "신고 ID") @PathVariable Long reportId,
        @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal
    );

    @Operation(summary = "신고 기각 처리")
    ResponseEntity<ApiResponse<ReportDetailDTO.ResponseProcess>> dismissReport(
        @Parameter(description = "신고 ID") @PathVariable Long reportId,
        @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal
    );

    @Operation(summary = "신고 대상 게시글·댓글 삭제(블라인드) — 신고 처리 상태와 무관하게 항상 가능")
    ResponseEntity<ApiResponse<ReportDetailDTO.ResponseContentDelete>> deleteContent(
        @Parameter(description = "신고 ID") @PathVariable Long reportId,
        @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal
    );
}
