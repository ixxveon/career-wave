package kr.co.carrer.admin.aimetrics.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import kr.co.carrer.admin.aimetrics.type.AiFeatureType;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

public class AiUsageLogDTO {

    private AiUsageLogDTO() {
    }

    @Schema(description = "AI usage log item response")
    public record ResponseItem(
            @Schema(description = "AI usage log ID") Long aiUsageLogId,
            @Schema(description = "Member ID") UUID memberId,
            @Schema(description = "Admin ID") Long adminId,
            @Schema(description = "Session ID") UUID sessionId,
            @Schema(description = "AI model ID") Long aiModelId,
            @Schema(description = "Feature type", allowableValues = {"DOCUMENT", "INTERVIEW", "ADMIN_CS", "ADMIN_REPORT"}) AiFeatureType featureType,
            @Schema(description = "Input tokens") long inputTokens,
            @Schema(description = "Output tokens") long outputTokens,
            @Schema(description = "Cost") BigDecimal cost,
            @Schema(description = "Created at") ZonedDateTime createdAt
    ) {
    }

    @Schema(description = "AI usage log list response")
    public record ResponseList(
            @Schema(description = "Usage log items") List<ResponseItem> content,
            @Schema(description = "Current page, 1-based") int page,
            @Schema(description = "Page size") int size,
            @Schema(description = "Total elements") long totalElements,
            @Schema(description = "Total pages") int totalPages
    ) {
    }
}
