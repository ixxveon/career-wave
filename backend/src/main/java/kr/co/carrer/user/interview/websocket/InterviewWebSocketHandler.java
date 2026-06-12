package kr.co.carrer.user.interview.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.carrer.user.interview.repository.AIInterviewFeedbackRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class InterviewWebSocketHandler extends TextWebSocketHandler {

    private final InterviewWebSocketSessionRegistry registry;
    private final AIInterviewFeedbackRepository feedbackRepository;
    private final ObjectMapper objectMapper;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws IOException {
        String sessionId = extractSessionId(session);
        if (sessionId == null) {
            session.close(CloseStatus.BAD_DATA);
            return;
        }

        registry.register(sessionId, session);
        log.info("WebSocket connected: sessionId={}, wsId={}", sessionId, session.getId());

        // 재연결 시 이미 리포트가 완성된 세션이면 REPORT_READY 즉시 재전송
        if (feedbackRepository.existsBySessionId(UUID.fromString(sessionId))) {
            String reportUrl = "/api/v1/user/interview/sessions/" + sessionId + "/report";
            sendMessage(session, WebSocketMessage.reportReady(reportUrl));
        } else {
            sendMessage(session, WebSocketMessage.sessionStart());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String sessionId = extractSessionId(session);
        if (sessionId != null) {
            registry.remove(sessionId);
            log.info("WebSocket disconnected: sessionId={}, status={}", sessionId, status);
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        // 클라이언트 → 서버 방향 메시지는 v1에서 사용하지 않음
        log.debug("Received WebSocket message (ignored): {}", message.getPayload());
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws IOException {
        String sessionId = extractSessionId(session);
        log.error("WebSocket transport error: sessionId={}, error={}", sessionId, exception.getMessage());
        if (session.isOpen()) {
            sendMessage(session, WebSocketMessage.error("연결 오류가 발생했습니다.", "INTERVIEW_AI_PIPELINE_ERROR"));
        }
    }

    public void sendReportReady(String sessionId, String reportUrl) {
        WebSocketSession ws = registry.get(sessionId);
        if (ws == null || !ws.isOpen()) {
            log.warn("WebSocket session not connected for REPORT_READY: sessionId={}", sessionId);
            return;
        }
        try {
            sendMessage(ws, WebSocketMessage.reportReady(reportUrl));
        } catch (IOException e) {
            log.error("Failed to send REPORT_READY: sessionId={}", sessionId, e);
        }
    }

    private void sendMessage(WebSocketSession session, WebSocketMessage message) throws IOException {
        String payload = objectMapper.writeValueAsString(message);
        session.sendMessage(new TextMessage(payload));
    }

    private String extractSessionId(WebSocketSession session) {
        String path = session.getUri() != null ? session.getUri().getPath() : null;
        if (path == null) return null;
        // path: /ws/user/interview/{sessionId}/chat
        String[] parts = path.split("/");
        for (int i = 0; i < parts.length - 1; i++) {
            if ("interview".equals(parts[i]) && i + 1 < parts.length) {
                return parts[i + 1];
            }
        }
        return null;
    }
}
