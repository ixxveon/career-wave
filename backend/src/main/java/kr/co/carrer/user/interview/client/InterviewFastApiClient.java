package kr.co.carrer.user.interview.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

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
}
