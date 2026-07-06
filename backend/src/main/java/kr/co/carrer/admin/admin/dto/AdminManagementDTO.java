package kr.co.carrer.admin.admin.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import kr.co.carrer.admin.admin.type.AdminRole;
import kr.co.carrer.admin.admin.type.AdminStatus;

import java.time.ZonedDateTime;
import java.util.List;

public class AdminManagementDTO {

    @Schema(description = "관리자 KPI 요약 응답")
    public record ResponseSummary(
        @Schema(description = "전체 관리자 수") long totalAdminCount,
        @Schema(description = "활성 관리자 수") long activeAdminCount,
        @Schema(description = "잠금 관리자 수") long lockedAdminCount,
        @Schema(description = "활성 ACL 수") long activeAclCount
    ) {}

    @Schema(description = "관리자 단건 응답")
    public record ResponseAdmin(
        @Schema(description = "관리자 ID") Long adminId,
        @Schema(description = "관리자 이메일") String email,
        @Schema(description = "관리자 이름") String name,
        @Schema(description = "관리자 권한", allowableValues = {"MASTER", "CS", "BACKEND"}) AdminRole adminRole,
        @Schema(description = "관리자 상태", allowableValues = {"ACTIVE", "LOCKED"}) AdminStatus status,
        @Schema(description = "마지막 로그인 시각") ZonedDateTime lastLoginAt,
        @Schema(description = "마지막 로그인 IP") String lastLoginIp,
        @Schema(description = "생성 시각") ZonedDateTime createdAt,
        @Schema(description = "수정 시각") ZonedDateTime updatedAt
    ) {}

    @Schema(description = "관리자 목록 응답")
    public record ResponseList(
        @Schema(description = "관리자 목록") List<ResponseAdmin> content,
        @Schema(description = "현재 페이지, 1-based") int page,
        @Schema(description = "페이지 크기") int size,
        @Schema(description = "전체 건수") long totalElements,
        @Schema(description = "전체 페이지 수") int totalPages
    ) {}

    @Schema(description = "관리자 계정 생성 요청")
    public record RequestCreateAdmin(
        @Schema(description = "관리자 로그인 아이디", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotBlank String loginId,
        @Schema(description = "관리자 이메일", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotBlank @Email String email,
        @Schema(description = "초기 비밀번호", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotBlank String password,
        @Schema(description = "관리자 이름", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotBlank String name,
        @Schema(description = "관리자 권한", allowableValues = {"MASTER", "CS", "BACKEND"}, requiredMode = Schema.RequiredMode.REQUIRED)
        @NotNull AdminRole adminRole
    ) {}

    @Schema(description = "관리자 권한 변경 요청")
    public record RequestUpdateRole(
        @Schema(description = "변경할 관리자 권한", allowableValues = {"MASTER", "CS", "BACKEND"}, requiredMode = Schema.RequiredMode.REQUIRED)
        @NotNull AdminRole adminRole
    ) {}

    @Schema(description = "관리자 상태 변경 요청")
    public record RequestUpdateStatus(
        @Schema(description = "변경할 관리자 상태", allowableValues = {"ACTIVE", "LOCKED"}, requiredMode = Schema.RequiredMode.REQUIRED)
        @NotNull AdminStatus status
    ) {}
}
