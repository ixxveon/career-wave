package kr.co.carrer.user.interview.websocket;

import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.auth.jwt.JwtTokenProvider;
import kr.co.carrer.user.interview.repository.InterviewSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class InterviewWebSocketHandshakeInterceptor implements HandshakeInterceptor {

    private final JwtTokenProvider jwtTokenProvider;
    private final InterviewSessionRepository sessionRepository;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {
        String query = request.getURI().getQuery();
        String token = extractToken(query);

        if (token == null || !jwtTokenProvider.validate(token, AccountType.USER)) {
            log.warn("WebSocket handshake rejected: invalid or missing token");
            return false;
        }

        try {
            var claims = jwtTokenProvider.parse(token, AccountType.USER);
            String memberId = claims.getSubject();

            String path = request.getURI().getPath();
            String sessionId = extractSessionId(path);
            if (sessionId == null) {
                log.warn("WebSocket handshake rejected: sessionId not found in path");
                return false;
            }

            boolean owned = sessionRepository.findBySessionIdAndMemberId(
                    UUID.fromString(sessionId), UUID.fromString(memberId)).isPresent();
            if (!owned) {
                log.warn("WebSocket handshake rejected: sessionId={} not owned by memberId={}", sessionId, memberId);
                return false;
            }

            return true;
        } catch (Exception e) {
            log.warn("WebSocket handshake rejected: {}", e.getMessage());
            return false;
        }
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
    }

    private String extractToken(String query) {
        if (query == null) return null;
        for (String param : query.split("&")) {
            String[] kv = param.split("=", 2);
            if (kv.length == 2 && "token".equals(kv[0])) return kv[1];
        }
        return null;
    }

    private String extractSessionId(String path) {
        String[] parts = path.split("/");
        for (int i = 0; i < parts.length - 1; i++) {
            if ("interview".equals(parts[i]) && i + 1 < parts.length) {
                return parts[i + 1];
            }
        }
        return null;
    }
}
