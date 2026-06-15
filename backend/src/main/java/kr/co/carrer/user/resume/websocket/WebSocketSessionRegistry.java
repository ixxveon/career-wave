package kr.co.carrer.user.resume.websocket;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * WebSocket 세션 저장소.
 * - sessionId → WebSocketSession (연결 유지 중인 세션)
 * - documentId → sessionId (Grace Period 만료 시 Close 1000 대상 탐색용)
 */
@Slf4j
@Component
public class WebSocketSessionRegistry {

    private final Map<String, WebSocketSession> sessionStore = new ConcurrentHashMap<>();
    private final Map<UUID, String> documentSessionMap = new ConcurrentHashMap<>();

    public void registerSession(String sessionId, WebSocketSession session) {
        sessionStore.put(sessionId, session);
    }

    public void deregisterSession(String sessionId) {
        sessionStore.remove(sessionId);
    }

    public void bindDocumentToSession(UUID documentId, String sessionId) {
        documentSessionMap.put(documentId, sessionId);
    }

    public void unbindDocument(UUID documentId) {
        documentSessionMap.remove(documentId);
    }

    /**
     * Grace Period 만료 시 호출 — 대상 세션을 Close 1000으로 정상 종료한다.
     */
    public void closeSession(UUID documentId) {
        String sessionId = documentSessionMap.remove(documentId);
        if (sessionId == null) return;

        WebSocketSession session = sessionStore.remove(sessionId);
        if (session != null && session.isOpen()) {
            try {
                session.close(CloseStatus.NORMAL);
                log.debug("[WebSocket] Grace Period 만료 — documentId: {}, sessionId: {} 정상 종료(1000)", documentId, sessionId);
            } catch (IOException e) {
                log.warn("[WebSocket] 세션 종료 실패 — sessionId: {}, 원인: {}", sessionId, e.getMessage());
            }
        }
    }
}
