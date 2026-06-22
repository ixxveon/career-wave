package kr.co.carrer.admin.scraping.infrastructure.fastapi;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import kr.co.carrer.admin.scraping.exception.ScrapingErrorCode;
import kr.co.carrer.admin.scraping.service.ScrapingFastApiGateway;
import kr.co.carrer.admin.scraping.type.ScrapingActionType;
import kr.co.carrer.admin.scraping.type.ScrapingStatusType;
import kr.co.carrer.global.exception.CustomException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.util.UriBuilder;

import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.function.Function;

@Slf4j
@Component
@RequiredArgsConstructor
public class ScrapingFastApiClient implements ScrapingFastApiGateway {

    private static final Duration TIMEOUT = Duration.ofSeconds(10);
    private static final String PIPELINES_PATH = "/internal/scraping/pipelines";
    private static final String SUMMARY_PATH = "/internal/scraping/pipelines/summary";
    private static final String PIPELINE_DETAIL_PATH = "/internal/scraping/pipelines/{sourceName}";
    private static final String LOGS_PATH = "/internal/scraping/logs";
    private static final String RUN_PATH = "/internal/scraping/pipelines/{sourceName}/run";
    private static final String RETRY_PATH = "/internal/scraping/pipelines/{sourceName}/retry";
    private static final String TEST_PATH = "/internal/scraping/pipelines/{sourceName}/test";
    private static final String BATCH_RUN_PATH = "/internal/scraping/pipelines/batch-run";

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    @Value("${fastapi.base-url}")
    private String fastApiBaseUrl;

    private WebClient webClient;

    @PostConstruct
    void init() {
        this.webClient = webClientBuilder.baseUrl(fastApiBaseUrl).build();
    }

    @Override
    public PipelinePageResponse getPipelines(PipelineSearchRequest request) {
        ScrapingFastApiRequest.PipelineSearch pipelineSearch = new ScrapingFastApiRequest.PipelineSearch(
                request.keyword(),
                request.status(),
                request.page(),
                request.size()
        );

        ScrapingFastApiResponse.PipelinePage response = get(
                uriBuilder -> {
                    UriBuilder builder = uriBuilder.path(PIPELINES_PATH);
                    if (StringUtils.hasText(pipelineSearch.keyword())) {
                        builder.queryParam("keyword", pipelineSearch.keyword());
                    }
                    if (pipelineSearch.status() != null) {
                        builder.queryParam("status", pipelineSearch.status().name());
                    }
                    builder.queryParam("page", pipelineSearch.page());
                    builder.queryParam("size", pipelineSearch.size());
                    return builder.build();
                },
                ScrapingFastApiResponse.PipelinePage.class
        );

        return new PipelinePageResponse(
                Objects.requireNonNullElse(response.content(), List.<ScrapingFastApiResponse.PipelineItem>of()).stream()
                        .map(item -> new PipelineItemResponse(
                                item.scrapingPipelineId(),
                                item.sourceName(),
                                item.displayName(),
                                item.pipelineStatus(),
                                item.isEnabled(),
                                item.lastStartedAt(),
                                item.lastSuccessAt(),
                                item.lastFailedAt(),
                                item.lastDurationMs(),
                                item.lastTotalCount(),
                                item.lastErrorMessage(),
                                item.createdAt(),
                                item.updatedAt()
                        ))
                        .toList(),
                response.page(),
                response.size(),
                response.totalElements(),
                response.totalPages()
        );
    }

    @Override
    public SummaryResponse getSummary() {
        ScrapingFastApiResponse.Summary response = get(
                uriBuilder -> uriBuilder.path(SUMMARY_PATH).build(),
                ScrapingFastApiResponse.Summary.class
        );
        return new SummaryResponse(
                response.totalCount(),
                response.idleCount(),
                response.runningCount(),
                response.successCount(),
                response.failedCount(),
                response.enabledCount(),
                response.disabledCount()
        );
    }

    @Override
    public DetailResponse getPipelineDetail(String sourceName) {
        ScrapingFastApiRequest.PipelineDetail pipelineDetail = new ScrapingFastApiRequest.PipelineDetail(sourceName);
        ScrapingFastApiResponse.PipelineDetail response = get(
                uriBuilder -> uriBuilder.path(PIPELINE_DETAIL_PATH).build(pipelineDetail.sourceName()),
                ScrapingFastApiResponse.PipelineDetail.class
        );
        return new DetailResponse(
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

    @Override
    public LogPageResponse getLogs(LogSearchRequest request) {
        ScrapingFastApiRequest.LogSearch logSearch = new ScrapingFastApiRequest.LogSearch(
                request.sourceName(),
                request.status() == null ? null : request.status().name(),
                request.page(),
                request.size()
        );
        ScrapingFastApiResponse.LogPage response = get(
                uriBuilder -> {
                    UriBuilder builder = uriBuilder.path(LOGS_PATH);
                    if (StringUtils.hasText(logSearch.sourceName())) {
                        builder.queryParam("sourceName", logSearch.sourceName());
                    }
                    if (StringUtils.hasText(logSearch.status())) {
                        builder.queryParam("status", logSearch.status());
                    }
                    builder.queryParam("page", logSearch.page());
                    builder.queryParam("size", logSearch.size());
                    return builder.build();
                },
                ScrapingFastApiResponse.LogPage.class
        );
        return new LogPageResponse(
                Objects.requireNonNullElse(response.content(), List.<ScrapingFastApiResponse.LogItem>of()).stream()
                        .map(item -> new LogItemResponse(
                                item.logId(),
                                item.occurredAt(),
                                item.sourceName(),
                                toScrapingStatusType(item.status()),
                                item.message(),
                                item.detail(),
                                item.runId()
                        ))
                        .toList(),
                response.page(),
                response.size(),
                response.totalElements(),
                response.totalPages()
        );
    }

    @Override
    public ActionResponse runPipeline(ActionRequest request) {
        ScrapingFastApiRequest.RunAction runAction = new ScrapingFastApiRequest.RunAction(request.requestedBy());
        ScrapingFastApiResponse.RunAction response = post(
                RUN_PATH,
                runAction,
                ScrapingFastApiResponse.RunAction.class,
                request.sourceName()
        );
        return new ActionResponse(
                response.sourceName(),
                response.accepted(),
                response.runId(),
                response.requestedAt()
        );
    }

    @Override
    public ActionResponse retryPipeline(ActionRequest request) {
        ScrapingFastApiRequest.RetryAction retryAction = new ScrapingFastApiRequest.RetryAction(request.requestedBy());
        ScrapingFastApiResponse.RetryAction response = post(
                RETRY_PATH,
                retryAction,
                ScrapingFastApiResponse.RetryAction.class,
                request.sourceName()
        );
        return new ActionResponse(
                response.sourceName(),
                response.accepted(),
                response.runId(),
                response.requestedAt()
        );
    }

    @Override
    public ActionResponse testPipeline(ActionRequest request) {
        ScrapingFastApiRequest.TestAction testAction = new ScrapingFastApiRequest.TestAction(request.requestedBy());
        ScrapingFastApiResponse.TestAction response = post(
                TEST_PATH,
                testAction,
                ScrapingFastApiResponse.TestAction.class,
                request.sourceName()
        );
        return new ActionResponse(
                response.sourceName(),
                response.accepted(),
                response.runId(),
                response.requestedAt()
        );
    }

    @Override
    public BatchActionResponse batchRunPipelines(BatchActionRequest request) {
        ScrapingFastApiRequest.BatchAction batchAction = new ScrapingFastApiRequest.BatchAction(
                toFastApiActionType(request.actionType()),
                request.sourceNames(),
                request.requestedBy()
        );
        ScrapingFastApiResponse.BatchAction response = post(
                BATCH_RUN_PATH,
                batchAction,
                ScrapingFastApiResponse.BatchAction.class
        );
        return new BatchActionResponse(
                response.actionType(),
                response.requestedCount(),
                response.acceptedCount(),
                response.requestedAt(),
                Objects.requireNonNullElse(response.results(), List.<ScrapingFastApiResponse.BatchActionItem>of()).stream()
                        .map(item -> new BatchActionItemResponse(
                                item.sourceName(),
                                item.accepted(),
                                item.message()
                        ))
                        .toList()
        );
    }

    private <T> T get(Function<UriBuilder, java.net.URI> uriFunction, Class<T> responseType) {
        try {
            T response = webClient.get()
                    .uri(uriFunction)
                    .retrieve()
                    .bodyToMono(responseType)
                    .timeout(TIMEOUT)
                    .block();

            if (response == null) {
                throw new CustomException(ScrapingErrorCode.SCRAPING_EXECUTION_FAILED);
            }
            return response;
        } catch (CustomException exception) {
            throw exception;
        } catch (WebClientResponseException exception) {
            String body = exception.getResponseBodyAsString();
            log.error("[ScrapingFastApiClient] FastAPI GET failed: status={}, bodyLength={}",
                    exception.getStatusCode(), body == null ? 0 : body.length());
            throw ScrapingFastApiErrorMapper.toCustomException(exception, objectMapper);
        } catch (RuntimeException exception) {
            log.error("[ScrapingFastApiClient] FastAPI GET failed: reason={}", exception.getMessage());
            throw new CustomException(ScrapingErrorCode.SCRAPING_EXECUTION_FAILED);
        }
    }

    private <T> T post(String path, Object payload, Class<T> responseType, Object... uriVariables) {
        try {
            T response = webClient.post()
                    .uri(path, uriVariables)
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(responseType)
                    .timeout(TIMEOUT)
                    .block();

            if (response == null) {
                throw new CustomException(ScrapingErrorCode.SCRAPING_EXECUTION_FAILED);
            }
            return response;
        } catch (CustomException exception) {
            throw exception;
        } catch (WebClientResponseException exception) {
            String body = exception.getResponseBodyAsString();
            log.error("[ScrapingFastApiClient] FastAPI POST failed: path={}, status={}, bodyLength={}",
                    path, exception.getStatusCode(), body == null ? 0 : body.length());
            throw ScrapingFastApiErrorMapper.toCustomException(exception, objectMapper);
        } catch (RuntimeException exception) {
            log.error("[ScrapingFastApiClient] FastAPI POST failed: path={}, reason={}", path, exception.getMessage());
            throw new CustomException(ScrapingErrorCode.SCRAPING_EXECUTION_FAILED);
        }
    }

    private String toFastApiActionType(ScrapingActionType actionType) {
        if (actionType == null) {
            throw new CustomException(ScrapingErrorCode.SCRAPING_EXECUTION_FAILED);
        }

        return switch (actionType) {
            case RUN -> "RUN";
            case RETRY -> "RETRY";
            case TEST -> "TEST";
        };
    }

    private ScrapingStatusType toScrapingStatusType(String status) {
        if (!StringUtils.hasText(status)) {
            return null;
        }

        try {
            return ScrapingStatusType.valueOf(status.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            log.error("[ScrapingFastApiClient] Unknown log status from FastAPI: {}", status, exception);
            throw new CustomException(ScrapingErrorCode.SCRAPING_EXECUTION_FAILED);
        }
    }

    private record SingleActionPayload(
            String requestedBy
    ) {
    }
}
