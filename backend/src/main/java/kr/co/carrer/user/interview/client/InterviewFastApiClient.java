package kr.co.carrer.user.interview.client;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class InterviewFastApiClient {

    private final WebClient.Builder webClientBuilder;

    @Value("${fastapi.base-url}")
    private String fastApiBaseUrl;

    @Value("${webhook.secret}")
    private String webhookSecret;

    private static final Duration TIMEOUT = Duration.ofSeconds(5);
    private static final String SECRET_HEADER = "X-Internal-Secret";
    private static final String BASE_PATH = "/internal/user/interview/sessions/";

    private WebClient webClient;

    @PostConstruct
    void init() {
        this.webClient = webClientBuilder.baseUrl(fastApiBaseUrl).build();
    }

    public void triggerRagContext(UUID sessionId, UUID memberId, UUID documentId, String fileUrl) {
        Map<String, Object> body = Map.of(
                "sessionId", sessionId.toString(),
                "memberId", memberId.toString(),
                "documentId", documentId.toString(),
                "documentFilePath", fileUrl != null ? fileUrl : ""
        );

        webClient.post()
                .uri(BASE_PATH + sessionId + "/rag-context")
                .header(SECRET_HEADER, webhookSecret)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .toBodilessEntity()
                .timeout(TIMEOUT)
                .subscribe(
                        res -> log.info("[FastAPI RAG] 등록 성공: sessionId={}, documentId={}", sessionId, documentId),
                        err -> log.warn("[FastAPI RAG] 등록 실패 (일반 모드로 진행): sessionId={}, cause={}", sessionId, err.getMessage())
                );
    }

    public void triggerLlmPipeline(UUID sessionId, UUID memberId, int questionOrder,
                                   String answerText, String sessionType, String interviewType) {
        Map<String, Object> body = Map.of(
                "sessionId", sessionId.toString(),
                "memberId", memberId.toString(),
                "questionOrder", questionOrder,
                "answerText", answerText != null ? answerText : "",
                "sessionType", sessionType,
                "interviewType", interviewType != null ? interviewType : ""
        );

        webClient.post()
                .uri(BASE_PATH + sessionId + "/trigger/text-answer")
                .header(SECRET_HEADER, webhookSecret)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .toBodilessEntity()
                .timeout(TIMEOUT)
                .subscribe(
                        res -> log.info("[FastAPI LLM] 트리거 성공: sessionId={}, questionOrder={}", sessionId, questionOrder),
                        err -> log.error("[FastAPI LLM] 트리거 실패: sessionId={}, cause={}", sessionId, err.getMessage())
                );
    }

    public void triggerReportGeneration(UUID sessionId, UUID memberId, String sessionType) {
        Map<String, Object> body = Map.of(
                "sessionId", sessionId.toString(),
                "memberId", memberId.toString(),
                "sessionType", sessionType
        );

        webClient.post()
                .uri(BASE_PATH + sessionId + "/trigger/report")
                .header(SECRET_HEADER, webhookSecret)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .toBodilessEntity()
                .timeout(TIMEOUT)
                .subscribe(
                        res -> log.info("[FastAPI Report] 트리거 성공: sessionId={}", sessionId),
                        err -> log.error("[FastAPI Report] 트리거 실패: sessionId={}, cause={}", sessionId, err.getMessage())
                );
    }

    public void triggerSttPipeline(UUID sessionId, MultipartFile audioChunk,
                                   int questionOrder, int chunkIndex, boolean isFinal) {
        byte[] bytes;
        try {
            bytes = audioChunk.getBytes();
        } catch (IOException e) {
            log.error("[FastAPI STT] 오디오 바이트 추출 실패: sessionId={}, cause={}", sessionId, e.getMessage());
            return;
        }

        String originalFilename = audioChunk.getOriginalFilename() != null
                ? audioChunk.getOriginalFilename() : "audio.webm";
        String contentType = audioChunk.getContentType() != null
                ? audioChunk.getContentType() : "audio/webm";

        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("audioChunk", new ByteArrayResource(bytes) {
            @Override public String getFilename() { return originalFilename; }
        }).contentType(MediaType.parseMediaType(contentType));
        builder.part("questionOrder", questionOrder);
        builder.part("chunkIndex", chunkIndex);
        builder.part("isFinal", isFinal);

        webClient.post()
                .uri(BASE_PATH + sessionId + "/trigger/voice-chunk")
                .header(SECRET_HEADER, webhookSecret)
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(builder.build()))
                .retrieve()
                .toBodilessEntity()
                .timeout(TIMEOUT)
                .subscribe(
                        res -> log.info("[FastAPI STT] 트리거 성공: sessionId={}, chunkIndex={}, isFinal={}", sessionId, chunkIndex, isFinal),
                        err -> log.error("[FastAPI STT] 트리거 실패: sessionId={}, cause={}", sessionId, err.getMessage())
                );
    }
}
