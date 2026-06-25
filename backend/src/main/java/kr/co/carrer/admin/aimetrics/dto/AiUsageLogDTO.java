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

    @Schema(description = "AI 사용 로그 항목 응답")
    public record ResponseItem(
            @Schema(description = "AI 사용 로그 ID") Long aiUsageLogId,
            @Schema(description = "회원 ID") UUID memberId,
            @Schema(description = "세션 ID") UUID sessionId,
            @Schema(description = "AI 모델 ID") Long aiModelId,
            @Schema(description = "AI 기능 유형", allowableValues = {"DOCUMENT", "INTERVIEW", "ADMIN_CS", "ADMIN_REPORT"}) AiFeatureType featureType,
            @Schema(description = "입력 토큰 수") long inputTokens,
            @Schema(description = "출력 토큰 수") long outputTokens,
            @Schema(description = "비용") BigDecimal cost,
            @Schema(description = "생성 시각") ZonedDateTime createdAt
    ) {
    }

    @Schema(description = "AI 사용 로그 목록 응답")
    public record ResponseList(
            @Schema(description = "AI 사용 로그 목록") List<ResponseItem> content,
            @Schema(description = "현재 페이지, 1-based") int page,
            @Schema(description = "페이지 크기") int size,
            @Schema(description = "전체 건수") long totalElements,
            @Schema(description = "전체 페이지 수") int totalPages
    ) {
    }
}
