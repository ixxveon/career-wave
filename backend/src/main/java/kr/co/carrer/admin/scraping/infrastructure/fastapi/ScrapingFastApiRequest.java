package kr.co.carrer.admin.scraping.infrastructure.fastapi;

import kr.co.carrer.admin.scraping.type.ScrapingPipelineStatusType;

import java.util.List;

public class ScrapingFastApiRequest {

    private ScrapingFastApiRequest() {
    }

    public record Summary() {
    }

    public record PipelineDetail(
            String sourceName
    ) {
    }

    public record RunAction(
            String requestedBy
    ) {
    }

    public record RetryAction(
            String requestedBy
    ) {
    }

    public record TestAction(
            String requestedBy
    ) {
    }

    public record BatchAction(
            String actionType,
            List<String> sourceNames,
            String requestedBy
    ) {
    }

    public record LogSearch(
            String sourceName,
            String status,
            int page,
            int size
    ) {
    }

    public record PipelineSearch(
            String keyword,
            ScrapingPipelineStatusType status,
            int page,
            int size
    ) {
    }
}
