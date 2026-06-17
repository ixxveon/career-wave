package kr.co.carrer.admin.aimetrics.infrastructure.fastapi;

import kr.co.carrer.admin.aimetrics.type.AiFeatureType;
import kr.co.carrer.admin.aimetrics.type.AlertChannelType;

import java.math.BigDecimal;
import java.util.UUID;

public class AiMetricsFastApiRequest {

    private AiMetricsFastApiRequest() {
    }

    public record Summary(
            String from,
            String to,
            AiFeatureType featureType
    ) {
    }

    public record DomainUsage(
            String from,
            String to
    ) {
    }

    public record TokenTrend(
            String from,
            String to,
            AiFeatureType featureType,
            String interval
    ) {
    }

    public record HeavyUsers(
            String from,
            String to,
            AiFeatureType featureType,
            Integer limit
    ) {
    }

    public record UsageLogSearch(
            AiFeatureType featureType,
            int page,
            int size
    ) {
    }

    public record OpsSettingSync(
            Long aiOpsSettingId,
            Long selectedModelId,
            BigDecimal monthlyBudget,
            boolean alertEnabled,
            AlertChannelType alertChannel,
            int alertThreshold,
            boolean rateLimitEnabled
    ) {
    }

    public record RagIndexStart(
            Long ragDocumentId,
            Long uploadedBy,
            UUID fileUuid,
            String originalFileName,
            String filePath,
            String mimeType,
            Long fileSize
    ) {
    }

    public record RagIndexDelete(
            Long ragDocumentId,
            UUID fileUuid,
            String filePath
    ) {
    }
}
