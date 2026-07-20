package kr.co.carrer.admin.aimetrics.infrastructure.fastapi;

import kr.co.carrer.admin.aimetrics.type.AiFeatureType;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.Map;
import java.util.List;
import java.util.UUID;

public class AiMetricsFastApiResponse {

    private AiMetricsFastApiResponse() {
    }

    public record Summary(
            long totalRequests,
            long totalInputTokens,
            long totalOutputTokens,
            BigDecimal totalCost,
            long documentRequests,
            long interviewRequests,
            long adminCsRequests,
            long adminReportRequests,
            Long activeModelId,
            String activeModelName
    ) {
    }

    public record DomainUsage(
            FeatureUsage document,
            FeatureUsage interview,
            FeatureUsage adminCs,
            FeatureUsage adminReport
    ) {
    }

    public record FeatureUsage(
            long requestCount,
            long inputTokens,
            long outputTokens,
            BigDecimal cost
    ) {
    }

    public record TokenTrend(
            String interval,
            List<TokenTrendPoint> points
    ) {
    }

    public record TokenTrendPoint(
            String bucket,
            long inputTokens,
            long outputTokens,
            BigDecimal cost
    ) {
    }

    public record HeavyUsers(
            List<HeavyUser> users
    ) {
    }

    public record HeavyUser(
            UUID memberId,
            long requestCount,
            long inputTokens,
            long outputTokens,
            long totalTokens,
            BigDecimal cost
    ) {
    }

    public record UsageLogList(
            List<UsageLogItem> content,
            int page,
            int size,
            long totalElements,
            int totalPages
    ) {
    }

    public record UsageLogItem(
            Long aiUsageLogId,
            UUID memberId,
            Long adminId,
            UUID sessionId,
            Long aiModelId,
            AiFeatureType featureType,
            long inputTokens,
            long outputTokens,
            BigDecimal cost,
            ZonedDateTime createdAt
    ) {
    }

    public record OpsSettingSync(
            boolean synced,
            ZonedDateTime syncedAt
    ) {
    }

    public record BudgetStatus(
            BigDecimal currentSpend,
            BigDecimal thresholdAmount,
            BigDecimal usagePercent,
            BigDecimal remainingBudget
    ) {
    }

    public record RagIndexStart(
            boolean accepted,
            Long ragDocumentId,
            String status
    ) {
    }

    public record RagIndexDelete(
            boolean deleted,
            Long ragDocumentId
    ) {
    }

    public record Error(
            boolean success,
            String errorCode,
            String message,
            Map<String, Object> detail
    ) {
    }
}
