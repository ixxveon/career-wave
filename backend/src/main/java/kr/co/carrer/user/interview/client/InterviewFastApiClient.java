package kr.co.carrer.user.interview.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Slf4j
@Component
public class InterviewFastApiClient {

    public void triggerRagContext(UUID sessionId, UUID documentId) {
        log.info("FastAPI RAG context registration: sessionId={}, documentId={}", sessionId, documentId);
        // TODO: FastAPI 연동 시 실제 HTTP 호출로 교체
    }

    public void triggerLlmPipeline(UUID sessionId, int questionOrder) {
        log.info("FastAPI LLM pipeline triggered: sessionId={}, questionOrder={}", sessionId, questionOrder);
        // TODO: FastAPI 연동 시 실제 HTTP 호출로 교체
    }

    public void triggerReportGeneration(UUID sessionId) {
        log.info("FastAPI report generation triggered: sessionId={}", sessionId);
        // TODO: FastAPI 연동 시 실제 HTTP 호출로 교체
    }

    public void triggerSttPipeline(UUID sessionId, MultipartFile audioChunk, int questionOrder, int chunkIndex, boolean isFinal) {
        log.info("FastAPI STT pipeline triggered: sessionId={}, questionOrder={}, chunkIndex={}, isFinal={}, size={}bytes",
                sessionId, questionOrder, chunkIndex, isFinal, audioChunk.getSize());
        // TODO: FastAPI 연동 시 실제 Multipart HTTP 호출로 교체
    }
}
