package kr.co.carrer.user.resume.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class FastApiClient {

    private final WebClient.Builder webClientBuilder;

    @Value("${fastapi.base-url}")
    private String fastApiBaseUrl;

    private static final Duration TIMEOUT = Duration.ofSeconds(3);

    /**
     * FastAPI 분석 트리거 비동기 호출.
     * 실패 시 document.status = FAILED 마킹을 위해 콜백을 받는다.
     */
    public void triggerAnalysis(UUID documentId, String fileType, Runnable onFailure) {
        webClientBuilder.build()
                .post()
                .uri(fastApiBaseUrl + "/api/v1/analyze")
                .bodyValue(Map.of(
                        "documentId", documentId.toString(),
                        "fileType", fileType
                ))
                .retrieve()
                .toBodilessEntity()
                .timeout(TIMEOUT)
                .subscribe(
                        response -> log.info("[FastAPI 트리거 성공] documentId: {}, status: {}", documentId, response.getStatusCode()),
                        error -> {
                            log.error("[FastAPI 트리거 실패] documentId: {}, 원인: {}", documentId, error.getMessage());
                            onFailure.run();
                        }
                );
    }
}
