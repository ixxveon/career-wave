package kr.co.carrer.admin.aimetrics.infrastructure.fastapi;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import kr.co.carrer.admin.aimetrics.exception.AiMetricsErrorCode;
import kr.co.carrer.admin.aimetrics.service.AiMetricsFastApiGateway;
import kr.co.carrer.global.exception.CustomException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.concurrent.TimeoutException;

@Slf4j
@Component
@RequiredArgsConstructor
public class AiMetricsFastApiClient implements AiMetricsFastApiGateway {

    private static final Duration TIMEOUT = Duration.ofSeconds(10);
    private static final String SUMMARY_PATH = "/internal/admin/ai-metrics/usage/summary";
    private static final String DOMAIN_USAGE_PATH = "/internal/admin/ai-metrics/usage/domain-usage";
    private static final String TOKEN_TREND_PATH = "/internal/admin/ai-metrics/usage/token-trend";
    private static final String HEAVY_USERS_PATH = "/internal/admin/ai-metrics/usage/heavy-users";
    private static final String USAGE_LOGS_PATH = "/internal/admin/ai-metrics/usage/logs/search";
    private static final String OPS_SETTING_SYNC_PATH = "/internal/admin/ai-metrics/ops/sync-settings";
    private static final String RAG_INDEX_START_PATH = "/internal/admin/ai-metrics/rag-documents/index";
    private static final String RAG_INDEX_DELETE_PATH = "/internal/admin/ai-metrics/rag-documents/{ragDocumentId}/index";
    private static final String INTERNAL_SECRET_HEADER = "X-Internal-Secret";

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    @Value("${fastapi.base-url}")
    private String fastApiBaseUrl;

    @Value("${webhook.secret}")
    private String webhookSecret;

    private WebClient webClient;

    @PostConstruct
    void init() {
        this.webClient = webClientBuilder.baseUrl(fastApiBaseUrl).build();
    }

    @Override
    public SummaryResponse getSummary(SummaryRequest request) {
        AiMetricsFastApiResponse.Summary response = post(
                SUMMARY_PATH,
                AiMetricsFastApiMapper.toSummaryRequest(request),
                AiMetricsFastApiResponse.Summary.class
        );
        return AiMetricsFastApiMapper.toSummaryResponse(response);
    }

    @Override
    public DomainUsageResponse getDomainUsage(PeriodRequest request) {
        AiMetricsFastApiResponse.DomainUsage response = post(
                DOMAIN_USAGE_PATH,
                AiMetricsFastApiMapper.toDomainUsageRequest(request),
                AiMetricsFastApiResponse.DomainUsage.class
        );
        return AiMetricsFastApiMapper.toDomainUsageResponse(response);
    }

    @Override
    public TokenTrendResponse getTokenTrend(TokenTrendRequest request) {
        AiMetricsFastApiResponse.TokenTrend response = post(
                TOKEN_TREND_PATH,
                AiMetricsFastApiMapper.toTokenTrendRequest(request),
                AiMetricsFastApiResponse.TokenTrend.class
        );
        return AiMetricsFastApiMapper.toTokenTrendResponse(response);
    }

    @Override
    public HeavyUsersResponse getHeavyUsers(HeavyUsersRequest request) {
        AiMetricsFastApiResponse.HeavyUsers response = post(
                HEAVY_USERS_PATH,
                AiMetricsFastApiMapper.toHeavyUsersRequest(request),
                AiMetricsFastApiResponse.HeavyUsers.class
        );
        return AiMetricsFastApiMapper.toHeavyUsersResponse(response);
    }

    @Override
    public UsageLogListResponse getUsageLogs(UsageLogSearchRequest request) {
        AiMetricsFastApiResponse.UsageLogList response = post(
                USAGE_LOGS_PATH,
                AiMetricsFastApiMapper.toUsageLogSearchRequest(request),
                AiMetricsFastApiResponse.UsageLogList.class
        );
        return AiMetricsFastApiMapper.toUsageLogListResponse(response);
    }

    @Override
    public OpsSettingSyncResponse syncOpsSetting(OpsSettingSyncRequest request) {
        AiMetricsFastApiResponse.OpsSettingSync response = post(
                OPS_SETTING_SYNC_PATH,
                AiMetricsFastApiMapper.toOpsSettingSyncRequest(request),
                AiMetricsFastApiResponse.OpsSettingSync.class
        );
        return AiMetricsFastApiMapper.toOpsSettingSyncResponse(response);
    }

    @Override
    public RagIndexStartResponse startRagIndexing(RagIndexStartRequest request) {
        AiMetricsFastApiResponse.RagIndexStart response = post(
                RAG_INDEX_START_PATH,
                AiMetricsFastApiMapper.toRagIndexStartRequest(request),
                AiMetricsFastApiResponse.RagIndexStart.class
        );
        return AiMetricsFastApiMapper.toRagIndexStartResponse(response);
    }

    @Override
    public RagIndexDeleteResponse deleteRagIndex(RagIndexDeleteRequest request) {
        AiMetricsFastApiResponse.RagIndexDelete response = delete(
                RAG_INDEX_DELETE_PATH,
                request.ragDocumentId(),
                AiMetricsFastApiResponse.RagIndexDelete.class
        );
        return AiMetricsFastApiMapper.toRagIndexDeleteResponse(response);
    }

    private <T> T post(String path, Object request, Class<T> responseType) {
        try {
            T response = webClient.post()
                    .uri(path)
                    .header(INTERNAL_SECRET_HEADER, webhookSecret)
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(responseType)
                    .timeout(TIMEOUT)
                    .block();

            if (response == null) {
                throw new CustomException(AiMetricsErrorCode.AI_MODEL_EXECUTION_FAILED);
            }
            return response;
        } catch (CustomException e) {
            throw e;
        } catch (WebClientResponseException e) {
            throw AiMetricsFastApiErrorMapper.toCustomException(e, objectMapper);
        } catch (RuntimeException e) {
            log.error("[AiMetricsFastApiClient] FastAPI call failed: path={}, reason={}", path, e.getMessage());
            throw new CustomException(AiMetricsErrorCode.AI_MODEL_EXECUTION_FAILED);
        }
    }

    private <T> T delete(String path, Long ragDocumentId, Class<T> responseType) {
        try {
            T response = webClient.delete()
                    .uri(path, ragDocumentId)
                    .header(INTERNAL_SECRET_HEADER, webhookSecret)
                    .retrieve()
                    .bodyToMono(responseType)
                    .timeout(TIMEOUT)
                    .block();

            if (response == null) {
                throw new CustomException(AiMetricsErrorCode.RAG_DOCUMENT_DELETE_FAILED);
            }
            return response;
        } catch (CustomException e) {
            throw e;
        } catch (WebClientResponseException e) {
            throw AiMetricsFastApiErrorMapper.toCustomException(e, objectMapper);
        } catch (RuntimeException e) {
            if (hasTimeoutCause(e)) {
                log.error("[AiMetricsFastApiClient] FastAPI delete timed out: path={}, ragDocumentId={}", path, ragDocumentId, e);
                throw new CustomException(AiMetricsErrorCode.RAG_DOCUMENT_DELETE_FAILED);
            }
            log.error("[AiMetricsFastApiClient] FastAPI call failed: path={}, reason={}", path, e.getMessage());
            throw new CustomException(AiMetricsErrorCode.RAG_DOCUMENT_DELETE_FAILED);
        }
    }

    private boolean hasTimeoutCause(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            if (current instanceof TimeoutException) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }
}
