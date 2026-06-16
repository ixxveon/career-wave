package kr.co.carrer.admin.admin.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.ZonedDateTime;
import java.util.List;

public class AdminAclDTO {

    @Schema(description = "IP ACL 단건 응답")
    public record ResponseItem(
        @Schema(description = "ACL ID") Long ipAclId,
        @Schema(description = "ACL 식별 이름") String label,
        @Schema(description = "IP/CIDR 범위") String ipRange,
        @Schema(description = "활성 여부") Boolean isEnabled,
        @Schema(description = "설명") String description,
        @Schema(description = "생성 시각") ZonedDateTime createdAt,
        @Schema(description = "수정 시각") ZonedDateTime updatedAt
    ) {}

    @Schema(description = "IP ACL 목록 응답")
    public record ResponseList(
        @Schema(description = "IP ACL 목록") List<ResponseItem> content,
        @Schema(description = "현재 페이지, 1-based") int page,
        @Schema(description = "페이지 크기") int size,
        @Schema(description = "전체 건수") long totalElements,
        @Schema(description = "전체 페이지 수") int totalPages
    ) {}

    @Schema(description = "IP ACL 등록 요청")
    public record RequestCreate(
        @Schema(description = "ACL 식별 이름", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotBlank String label,
        @Schema(description = "IP/CIDR 범위", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotBlank String ipRange,
        @Schema(description = "설명") String description
    ) {}

    @Schema(description = "IP ACL 활성 여부 변경 요청")
    public record RequestToggleEnabled(
        @Schema(description = "활성/비활성 여부", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotNull Boolean isEnabled
    ) {}
}
