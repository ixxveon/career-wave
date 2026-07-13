package kr.co.carrer.admin.aimetrics.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import kr.co.carrer.admin.aimetrics.type.AlertChannelType;

import java.math.BigDecimal;
import java.time.ZonedDateTime;

public class AiOpsSettingDTO {

    private AiOpsSettingDTO() {
    }

    @Schema(description = "AI 예산 및 알림 임계치 변경 요청")
    public record RequestUpdateBudget(
            @Schema(description = "운영 모델 ID", requiredMode = Schema.RequiredMode.REQUIRED)
            @NotNull Long selectedModelId,
            @Schema(description = "월 예산 (USD)", requiredMode = Schema.RequiredMode.REQUIRED)
            @NotNull @Positive BigDecimal monthlyBudget,
            @Schema(description = "알림 임계치", minimum = "1", maximum = "100", requiredMode = Schema.RequiredMode.REQUIRED)
            @Min(1) @Max(100) int alertThreshold
    ) {
    }

    @Schema(description = "Discord 알림 설정 변경 요청")
    public record RequestUpdateDiscordAlert(
            @Schema(description = "Discord 알림 활성 여부", requiredMode = Schema.RequiredMode.REQUIRED)
            @NotNull Boolean alertEnabled
    ) {
    }

    @Schema(description = "AI rate limit 설정 변경 요청")
    public record RequestUpdateRateLimit(
            @Schema(description = "rate limit 활성 여부", requiredMode = Schema.RequiredMode.REQUIRED)
            @NotNull Boolean rateLimitEnabled
    ) {
    }

    @Schema(description = "AI 운영 설정 응답")
    public record ResponseBudget(
            @Schema(description = "AI 운영 설정 ID") Long aiOpsSettingId,
            @Schema(description = "운영 모델 ID") Long selectedModelId,
            @Schema(description = "월 예산 (USD)") BigDecimal monthlyBudget,
            @Schema(description = "알림 활성 여부") boolean alertEnabled,
            @Schema(description = "알림 채널", allowableValues = {"DISCORD", "SLACK", "EMAIL"}) AlertChannelType alertChannel,
            @Schema(description = "알림 임계치") int alertThreshold,
            @Schema(description = "rate limit 활성 여부") boolean rateLimitEnabled,
            @Schema(description = "수정 시각") ZonedDateTime updatedAt
    ) {
    }
}
