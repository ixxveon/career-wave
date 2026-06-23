package kr.co.carrer.admin.scraping.service.impl;

import kr.co.carrer.admin.scraping.service.ScrapingFastApiGateway;
import kr.co.carrer.admin.scraping.service.ScrapingService;

final class ScrapingServiceMapper {

    private ScrapingServiceMapper() {
    }

    static ScrapingService.ResponsePipelinePage toPipelinePage(ScrapingFastApiGateway.PipelinePageResponse response) {
        return new ScrapingService.ResponsePipelinePage(
                response.content().stream()
                        .map(ScrapingServiceMapper::toPipelineItem)
                        .toList(),
                response.page(),
                response.size(),
                response.totalElements(),
                response.totalPages()
        );
    }

    static ScrapingService.ResponseSummary toSummary(ScrapingFastApiGateway.SummaryResponse response) {
        return new ScrapingService.ResponseSummary(
                response.totalCount(),
                response.idleCount(),
                response.runningCount(),
                response.successCount(),
                response.failedCount(),
                response.enabledCount(),
                response.disabledCount()
        );
    }

    static ScrapingService.ResponseDetail toDetail(ScrapingFastApiGateway.DetailResponse response) {
        return new ScrapingService.ResponseDetail(
                response.scrapingPipelineId(),
                response.sourceName(),
                response.displayName(),
                response.pipelineStatus(),
                response.isEnabled(),
                response.lastStartedAt(),
                response.lastSuccessAt(),
                response.lastFailedAt(),
                response.lastDurationMs(),
                response.lastTotalCount(),
                response.lastErrorMessage(),
                response.createdAt(),
                response.updatedAt()
        );
    }

    static ScrapingService.ResponseLogPage toLogPage(ScrapingFastApiGateway.LogPageResponse response) {
        return new ScrapingService.ResponseLogPage(
                response.content().stream()
                        .map(ScrapingServiceMapper::toLogItem)
                        .toList(),
                response.page(),
                response.size(),
                response.totalElements(),
                response.totalPages()
        );
    }

    static ScrapingService.ResponseAction toAction(
            ScrapingFastApiGateway.ActionResponse response,
            ScrapingService.RequestAction request
    ) {
        return new ScrapingService.ResponseAction(
                response.sourceName(),
                request.actionType(),
                response.accepted(),
                response.runId(),
                response.requestedAt()
        );
    }

    static ScrapingService.ResponseBatchAction toBatchAction(ScrapingFastApiGateway.BatchActionResponse response) {
        int failedCount = Math.max(response.requestedCount() - response.acceptedCount(), 0);
        return new ScrapingService.ResponseBatchAction(
                response.requestedCount(),
                response.acceptedCount(),
                failedCount,
                response.results().stream()
                        .map(ScrapingServiceMapper::toBatchActionResult)
                        .toList()
        );
    }

    private static ScrapingService.ResponsePipelineItem toPipelineItem(ScrapingFastApiGateway.PipelineItemResponse response) {
        return new ScrapingService.ResponsePipelineItem(
                response.scrapingPipelineId(),
                response.sourceName(),
                response.displayName(),
                response.pipelineStatus(),
                response.isEnabled(),
                response.lastStartedAt(),
                response.lastSuccessAt(),
                response.lastFailedAt(),
                response.lastDurationMs(),
                response.lastTotalCount(),
                response.lastErrorMessage(),
                response.createdAt(),
                response.updatedAt()
        );
    }

    private static ScrapingService.ResponseLogItem toLogItem(ScrapingFastApiGateway.LogItemResponse response) {
        return new ScrapingService.ResponseLogItem(
                response.logId(),
                response.occurredAt(),
                response.sourceName(),
                response.status(),
                response.message(),
                response.detail(),
                response.runId()
        );
    }

    private static ScrapingService.ResponseBatchActionResult toBatchActionResult(
            ScrapingFastApiGateway.BatchActionItemResponse response
    ) {
        return new ScrapingService.ResponseBatchActionResult(
                response.sourceName(),
                response.accepted(),
                response.message()
        );
    }
}
