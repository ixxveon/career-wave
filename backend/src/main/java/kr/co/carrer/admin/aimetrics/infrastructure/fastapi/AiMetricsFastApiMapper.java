package kr.co.carrer.admin.aimetrics.infrastructure.fastapi;

import kr.co.carrer.admin.aimetrics.entity.RagDocument;
import kr.co.carrer.admin.aimetrics.service.AiMetricsFastApiGateway;

final class AiMetricsFastApiMapper {

    private AiMetricsFastApiMapper() {
    }

    static AiMetricsFastApiRequest.Summary toSummaryRequest(AiMetricsFastApiGateway.SummaryRequest request) {
        return new AiMetricsFastApiRequest.Summary(
                request.from(),
                request.to(),
                request.featureType()
        );
    }

    static AiMetricsFastApiGateway.SummaryResponse toSummaryResponse(AiMetricsFastApiResponse.Summary response) {
        return new AiMetricsFastApiGateway.SummaryResponse(
                response.totalRequests(),
                response.totalInputTokens(),
                response.totalOutputTokens(),
                response.totalCost(),
                response.documentRequests(),
                response.interviewRequests(),
                response.adminCsRequests(),
                response.adminReportRequests(),
                response.activeModelId(),
                response.activeModelName()
        );
    }

    static AiMetricsFastApiRequest.DomainUsage toDomainUsageRequest(AiMetricsFastApiGateway.PeriodRequest request) {
        return new AiMetricsFastApiRequest.DomainUsage(
                request.from(),
                request.to()
        );
    }

    static AiMetricsFastApiGateway.DomainUsageResponse toDomainUsageResponse(AiMetricsFastApiResponse.DomainUsage response) {
        return new AiMetricsFastApiGateway.DomainUsageResponse(
                toFeatureUsageResponse(response.document()),
                toFeatureUsageResponse(response.interview()),
                toFeatureUsageResponse(response.adminCs()),
                toFeatureUsageResponse(response.adminReport())
        );
    }

    static AiMetricsFastApiRequest.TokenTrend toTokenTrendRequest(AiMetricsFastApiGateway.TokenTrendRequest request) {
        return new AiMetricsFastApiRequest.TokenTrend(
                request.from(),
                request.to(),
                request.featureType(),
                request.interval()
        );
    }

    static AiMetricsFastApiGateway.TokenTrendResponse toTokenTrendResponse(AiMetricsFastApiResponse.TokenTrend response) {
        return new AiMetricsFastApiGateway.TokenTrendResponse(
                response.interval(),
                response.points().stream()
                        .map(AiMetricsFastApiMapper::toTokenTrendPointResponse)
                        .toList()
        );
    }

    static AiMetricsFastApiRequest.HeavyUsers toHeavyUsersRequest(AiMetricsFastApiGateway.HeavyUsersRequest request) {
        return new AiMetricsFastApiRequest.HeavyUsers(
                request.from(),
                request.to(),
                request.featureType(),
                request.limit()
        );
    }

    static AiMetricsFastApiGateway.HeavyUsersResponse toHeavyUsersResponse(AiMetricsFastApiResponse.HeavyUsers response) {
        return new AiMetricsFastApiGateway.HeavyUsersResponse(
                response.users().stream()
                        .map(AiMetricsFastApiMapper::toHeavyUserResponse)
                        .toList()
        );
    }

    static AiMetricsFastApiRequest.UsageLogSearch toUsageLogSearchRequest(AiMetricsFastApiGateway.UsageLogSearchRequest request) {
        return new AiMetricsFastApiRequest.UsageLogSearch(
                request.featureType(),
                request.page(),
                request.size()
        );
    }

    static AiMetricsFastApiGateway.UsageLogListResponse toUsageLogListResponse(AiMetricsFastApiResponse.UsageLogList response) {
        return new AiMetricsFastApiGateway.UsageLogListResponse(
                response.content().stream()
                        .map(AiMetricsFastApiMapper::toUsageLogItemResponse)
                        .toList(),
                response.page(),
                response.size(),
                response.totalElements(),
                response.totalPages()
        );
    }

    static AiMetricsFastApiRequest.OpsSettingSync toOpsSettingSyncRequest(AiMetricsFastApiGateway.OpsSettingSyncRequest request) {
        return new AiMetricsFastApiRequest.OpsSettingSync(
                request.aiOpsSettingId(),
                request.selectedModelId(),
                request.monthlyBudget(),
                request.alertEnabled(),
                request.alertChannel(),
                request.alertThreshold(),
                request.rateLimitEnabled()
        );
    }

    static AiMetricsFastApiGateway.OpsSettingSyncResponse toOpsSettingSyncResponse(AiMetricsFastApiResponse.OpsSettingSync response) {
        return new AiMetricsFastApiGateway.OpsSettingSyncResponse(
                response.synced()
        );
    }

    static AiMetricsFastApiRequest.RagIndexStart toRagIndexStartRequest(RagDocument document) {
        return new AiMetricsFastApiRequest.RagIndexStart(
                document.getRagDocumentId(),
                document.getFileUuid(),
                document.getOriginalFileName(),
                document.getFilePath(),
                document.getMimeType(),
                document.getFileSize()
        );
    }

    static AiMetricsFastApiRequest.RagIndexStart toRagIndexStartRequest(AiMetricsFastApiGateway.RagIndexStartRequest request) {
        return new AiMetricsFastApiRequest.RagIndexStart(
                request.ragDocumentId(),
                request.fileUuid(),
                request.originalFileName(),
                request.filePath(),
                request.mimeType(),
                request.fileSize()
        );
    }

    static AiMetricsFastApiGateway.RagIndexStartResponse toRagIndexStartResponse(AiMetricsFastApiResponse.RagIndexStart response) {
        return new AiMetricsFastApiGateway.RagIndexStartResponse(
                response.accepted(),
                response.ragDocumentId()
        );
    }

    static AiMetricsFastApiGateway.RagIndexDeleteResponse toRagIndexDeleteResponse(AiMetricsFastApiResponse.RagIndexDelete response) {
        return new AiMetricsFastApiGateway.RagIndexDeleteResponse(
                response.deleted(),
                response.ragDocumentId()
        );
    }

    private static AiMetricsFastApiGateway.FeatureUsageResponse toFeatureUsageResponse(AiMetricsFastApiResponse.FeatureUsage response) {
        return new AiMetricsFastApiGateway.FeatureUsageResponse(
                response.requestCount(),
                response.inputTokens(),
                response.outputTokens(),
                response.cost()
        );
    }

    private static AiMetricsFastApiGateway.TokenTrendPointResponse toTokenTrendPointResponse(AiMetricsFastApiResponse.TokenTrendPoint response) {
        return new AiMetricsFastApiGateway.TokenTrendPointResponse(
                response.bucket(),
                response.inputTokens(),
                response.outputTokens(),
                response.cost()
        );
    }

    private static AiMetricsFastApiGateway.HeavyUserResponse toHeavyUserResponse(AiMetricsFastApiResponse.HeavyUser response) {
        return new AiMetricsFastApiGateway.HeavyUserResponse(
                response.memberId(),
                response.adminId(),
                response.requestCount(),
                response.inputTokens(),
                response.outputTokens(),
                response.cost()
        );
    }

    private static AiMetricsFastApiGateway.UsageLogItemResponse toUsageLogItemResponse(AiMetricsFastApiResponse.UsageLogItem response) {
        return new AiMetricsFastApiGateway.UsageLogItemResponse(
                response.aiUsageLogId(),
                response.memberId(),
                response.adminId(),
                response.sessionId(),
                response.aiModelId(),
                response.featureType(),
                response.inputTokens(),
                response.outputTokens(),
                response.cost(),
                response.createdAt()
        );
    }
}
