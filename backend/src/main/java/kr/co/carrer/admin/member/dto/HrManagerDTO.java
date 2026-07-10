package kr.co.carrer.admin.member.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import kr.co.carrer.admin.member.type.HrStatus;
import kr.co.carrer.admin.member.type.PermissionLevel;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

public class HrManagerDTO {

    @Schema(description = "기업 회원 목록 응답")
    public record ResponseList(
        @Schema(description = "회원 UUID") UUID memberId,
        @Schema(description = "HR 담당자명") String hrName,
        @Schema(description = "이메일") String email,
        @Schema(description = "회사명") String companyName,
        @Schema(description = "사업자등록번호") String certificateNumber,
        @Schema(description = "권한", allowableValues = {"FULL", "NOTICE", "VIEWER"}) PermissionLevel permissionLevel,
        @Schema(description = "재직증명서 파일 URL") String certFileUrl,
        @Schema(description = "재직증명서 파일명") String certFileName,
        @Schema(description = "가입 신청 일시") ZonedDateTime joinedAt,
        @Schema(description = "승인 일시") ZonedDateTime approvedAt,
        @Schema(description = "상태", allowableValues = {"PENDING_REVIEW", "APPROVED", "REJECTED", "NEEDS_REVISION", "REMOVED"}) HrStatus hrStatus
    ) {
        public ResponseList withCertFileUrl(String certFileUrl) {
            return new ResponseList(memberId, hrName, email, companyName, certificateNumber,
                permissionLevel, certFileUrl, certFileName, joinedAt, approvedAt, hrStatus);
        }
    }

    @Schema(description = "기업 회원 상세 응답")
    public record ResponseDetail(
        @Schema(description = "회원 UUID") UUID memberId,
        @Schema(description = "HR 담당자명") String hrName,
        @Schema(description = "이메일") String email,
        @Schema(description = "회사명") String companyName,
        @Schema(description = "사업자등록번호") String certificateNumber,
        @Schema(description = "권한", allowableValues = {"FULL", "NOTICE", "VIEWER"}) PermissionLevel permissionLevel,
        @Schema(description = "재직증명서 파일 URL") String certFileUrl,
        @Schema(description = "재직증명서 파일명") String certFileName,
        @Schema(description = "가입 신청 일시") ZonedDateTime joinedAt,
        @Schema(description = "승인 일시") ZonedDateTime approvedAt,
        @Schema(description = "상태", allowableValues = {"PENDING_REVIEW", "APPROVED", "REJECTED", "NEEDS_REVISION", "REMOVED"}) HrStatus hrStatus,
        @Schema(description = "반려 사유") String rejectReason
    ) {
        public ResponseDetail withCertFileUrl(String certFileUrl) {
            return new ResponseDetail(memberId, hrName, email, companyName, certificateNumber,
                permissionLevel, certFileUrl, certFileName, joinedAt, approvedAt, hrStatus, rejectReason);
        }
    }

    @Schema(description = "기업 회원 목록 페이지 응답")
    public record ResponsePage(
        @Schema(description = "기업 회원 목록") List<ResponseList> items,
        @Schema(description = "현재 페이지") int page,
        @Schema(description = "페이지 크기") int size,
        @Schema(description = "전체 항목 수") long totalItems,
        @Schema(description = "전체 페이지 수") int totalPages,
        @Schema(description = "승인 대기 수") long pendingCount
    ) {}

    @Schema(description = "기업 회원 반려 요청")
    public record RequestReject(
        @Schema(description = "반려 사유 (최소 10자)", requiredMode = Schema.RequiredMode.REQUIRED) String rejectReason
    ) {}

    @Schema(description = "기업 회원 승인 응답")
    public record ResponseApprove(
        @Schema(description = "회원 UUID") UUID memberId,
        @Schema(description = "변경된 상태") HrStatus hrStatus,
        @Schema(description = "승인 일시") ZonedDateTime approvedAt
    ) {}

    @Schema(description = "기업 회원 반려 응답")
    public record ResponseReject(
        @Schema(description = "회원 UUID") UUID memberId,
        @Schema(description = "변경된 상태") HrStatus hrStatus,
        @Schema(description = "반려 사유") String rejectReason
    ) {}
}
