package kr.co.carrer.admin.report.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import kr.co.carrer.admin.report.type.ReportReason;
import kr.co.carrer.admin.report.type.ReportStatus;
import kr.co.carrer.admin.report.type.TargetType;

import java.time.ZonedDateTime;

public class ReportDetailDTO {

    @Schema(description = "신고 목록 응답")
    public record ResponseList(
        @Schema(description = "신고 ID") Long reportId,
        @Schema(description = "신고 대상 유형", allowableValues = {"BOARD", "COMMENT", "MEMBER"}) TargetType targetType,
        @Schema(description = "신고 사유", allowableValues = {"SPAM", "ABUSE", "OBSCENE", "FRAUD", "OTHER"}) ReportReason reason,
        @Schema(description = "신고 처리 상태", allowableValues = {"PENDING", "BLINDED", "DISMISSED"}) ReportStatus reportStatus,
        @Schema(description = "신고자 이름") String reporterName,
        @Schema(description = "피신고자 이름") String reportedName,
        @Schema(description = "신고 대상 콘텐츠 제목 (게시글인 경우)") String contentTitle,
        @Schema(description = "신고 접수 일시") ZonedDateTime createdAt
    ) {}

    @Schema(description = "신고 KPI 집계 응답")
    public record ResponseSummary(
        @Schema(description = "전체 신고 건수") long totalCount,
        @Schema(description = "대기 중 신고 건수") long pendingCount,
        @Schema(description = "블라인드 처리된 신고 건수") long blindedCount,
        @Schema(description = "고위험 신고 건수 (동일 대상 3건 이상)") long highRiskCount
    ) {}

    @Schema(description = "신고 상세 응답")
    public record ResponseDetail(
        @Schema(description = "신고 ID") Long reportId,
        @Schema(description = "신고 대상 유형", allowableValues = {"BOARD", "COMMENT", "MEMBER"}) TargetType targetType,
        @Schema(description = "신고 대상 ID") Long targetId,
        @Schema(description = "신고 사유", allowableValues = {"SPAM", "ABUSE", "OBSCENE", "FRAUD", "OTHER"}) ReportReason reason,
        @Schema(description = "신고 처리 상태", allowableValues = {"PENDING", "BLINDED", "DISMISSED"}) ReportStatus reportStatus,
        @Schema(description = "신고자 이름") String reporterName,
        @Schema(description = "피신고자 이름") String reportedName,
        @Schema(description = "신고 대상 콘텐츠 제목 (게시글인 경우, 삭제 시 null)") String contentTitle,
        @Schema(description = "신고 대상 콘텐츠 본문 (게시글·댓글인 경우, 삭제 시 null)") String contentBody,
        @Schema(description = "신고 접수 일시") ZonedDateTime createdAt,
        @Schema(description = "처리 일시 (미처리 시 null)") ZonedDateTime processedAt,
        @Schema(description = "처리한 관리자 ID (미처리 시 null)") Long processedBy
    ) {}

    @Schema(description = "신고 처리 응답")
    public record ResponseProcess(
        @Schema(description = "신고 ID") Long reportId,
        @Schema(description = "변경된 처리 상태") ReportStatus reportStatus,
        @Schema(description = "처리 일시") ZonedDateTime processedAt
    ) {}
}
