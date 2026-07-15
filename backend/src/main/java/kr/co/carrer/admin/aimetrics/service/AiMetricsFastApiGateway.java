package kr.co.carrer.admin.aimetrics.service;

import kr.co.carrer.admin.aimetrics.type.AiFeatureType;
import kr.co.carrer.admin.aimetrics.type.AlertChannelType;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.UUID;

public interface AiMetricsFastApiGateway {

    SummaryResponse getSummary(SummaryRequest request);

    DomainUsageResponse getDomainUsage(PeriodRequest request);

    TokenTrendResponse getTokenTrend(TokenTrendRequest request);

    HeavyUsersResponse getHeavyUsers(HeavyUsersRequest request);

    UsageLogListResponse getUsageLogs(UsageLogSearchRequest request);

    OpsSettingSyncResponse syncOpsSetting(OpsSettingSyncRequest request);

    BudgetStatusResponse getBudgetStatus();

    RagIndexStartResponse startRagIndexing(RagIndexStartRequest request);

    RagIndexDeleteResponse deleteRagIndex(RagIndexDeleteRequest request);

    record PeriodRequest(
            String from,
            String to
    ) {
    }

    record SummaryRequest(
            String from,
            String to,
            AiFeatureType featureType
    ) {
    }

    record TokenTrendRequest(
            String from,
            String to,
            AiFeatureType featureType,
            String interval
    ) {
    }

    record HeavyUsersRequest(
            String from,
            String to,
            AiFeatureType featureType,
            Integer limit
    ) {
    }

    record UsageLogSearchRequest(
            AiFeatureType featureType,
            int page,
            int size
    ) {
    }

    record OpsSettingSyncRequest(
            Long aiOpsSettingId,
            Long selectedModelId,
            BigDecimal monthlyBudget,
            boolean alertEnabled,
            AlertChannelType alertChannel,
            int alertThreshold,
            boolean rateLimitEnabled
    ) {
    }

    record RagIndexStartRequest(
            Long ragDocumentId,
            UUID fileUuid,
            String originalFileName,
            String filePath,
            String mimeType,
            Long fileSize
    ) {
    }

    record RagIndexDeleteRequest(
            Long ragDocumentId,
            UUID fileUuid,
            String filePath
    ) {
    }

    record SummaryResponse(
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

    record DomainUsageResponse(
            FeatureUsageResponse document,
            FeatureUsageResponse interview,
            FeatureUsageResponse adminCs,
            FeatureUsageResponse adminReport
    ) {
    }

    record FeatureUsageResponse(
            long requestCount,
            long inputTokens,
            long outputTokens,
            BigDecimal cost
    ) {
    }

    record TokenTrendResponse(
            String interval,
            java.util.List<TokenTrendPointResponse> points
    ) {
    }

    record TokenTrendPointResponse(
            String bucket,
            long inputTokens,
            long outputTokens,
            BigDecimal cost
    ) {
    }

    record HeavyUsersResponse(
            java.util.List<HeavyUserResponse> users
    ) {
    }

    record HeavyUserResponse(
            UUID memberId,
            Long adminId,
            long requestCount,
            long inputTokens,
            long outputTokens,
            BigDecimal cost
    ) {
    }

    record UsageLogItemResponse(
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

    record UsageLogListResponse(
            java.util.List<UsageLogItemResponse> content,
            int page,
            int size,
            long totalElements,
            int totalPages
    ) {
    }

    record OpsSettingSyncResponse(
            boolean synced
    ) {
    }

    record BudgetStatusResponse(
            BigDecimal currentSpend,
            BigDecimal thresholdAmount,
            BigDecimal usagePercent,
            BigDecimal remainingBudget
    ) {
    }

    record RagIndexStartResponse(
            boolean accepted,
            Long ragDocumentId
    ) {
    }

    record RagIndexDeleteResponse(
            boolean deleted,
            Long ragDocumentId
    ) {
    }
}
