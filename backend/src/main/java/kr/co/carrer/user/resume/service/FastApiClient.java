package kr.co.carrer.user.resume.service;

import jakarta.annotation.PostConstruct;
import kr.co.carrer.user.resume.dto.ResumeDTO;
import kr.co.carrer.user.resume.event.DocumentAnalysisTriggerEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class FastApiClient {

    private final WebClient.Builder webClientBuilder;

    @Value("${fastapi.base-url}")
    private String fastApiBaseUrl;

    @Value("${webhook.secret}")
    private String webhookSecret;

    private static final Duration TIMEOUT = Duration.ofSeconds(3);

    private WebClient webClient;

    @PostConstruct
    void init() {
        this.webClient = webClientBuilder.baseUrl(fastApiBaseUrl).build();
    }

    /**
     * FastAPI 분석 트리거 비동기 호출.
     * 실패 시 document.status = FAILED 마킹을 위해 콜백을 받는다.
     */
    public void triggerAnalysis(DocumentAnalysisTriggerEvent event, Runnable onFailure) {
        Map<String, Object> body = buildRequestBody(event);

        webClient.post()
                .uri("/internal/user/resume/analyze")
                .header("X-Internal-Secret", webhookSecret)
                .bodyValue(body)
                .retrieve()
                .toBodilessEntity()
                .timeout(TIMEOUT)
                .subscribe(
                        response -> log.info("[FastAPI 트리거 성공] documentId: {}, status: {}", event.documentId(), response.getStatusCode()),
                        error -> {
                            log.error("[FastAPI 트리거 실패] documentId: {}, 원인: {}", event.documentId(), error.getMessage());
                            onFailure.run();
                        }
                );
    }

    private Map<String, Object> buildRequestBody(DocumentAnalysisTriggerEvent event) {
        Map<String, Object> body = new HashMap<>();
        body.put("documentId", event.documentId().toString());
        body.put("fileType", event.fileType());

        if ("RESUME".equals(event.fileType())) {
            body.put("fileUrl", event.fileUrl());
            body.put("originalName", event.originalName());
        } else {
            body.put("company", event.company());
            body.put("job", event.job());
            body.put("content", buildContentList(event.content()));
        }
        return body;
    }

    private List<Map<String, Object>> buildContentList(List<ResumeDTO.RequestCoverLetter.ContentItem> content) {
        if (content == null) return List.of();
        return content.stream()
                .map(item -> Map.<String, Object>of(
                        "order", item.order(),
                        "question", item.question(),
                        "answer", item.answer()
                ))
                .toList();
    }
}
