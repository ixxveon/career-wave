package kr.co.carrer.user.interview.websocket;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.concurrent.ConcurrentHashMap;

@Component
public class InterviewWebSocketSessionRegistry {

    private final ConcurrentHashMap<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    public void register(String sessionId, WebSocketSession wsSession) {
        sessions.put(sessionId, wsSession);
    }

    public void remove(String sessionId) {
        sessions.remove(sessionId);
    }

    public WebSocketSession get(String sessionId) {
        return sessions.get(sessionId);
    }

    public boolean isConnected(String sessionId) {
        WebSocketSession ws = sessions.get(sessionId);
        return ws != null && ws.isOpen();
    }
}
