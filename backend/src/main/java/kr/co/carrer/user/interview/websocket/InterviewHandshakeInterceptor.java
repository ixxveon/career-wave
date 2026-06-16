package kr.co.carrer.user.interview.websocket;

import kr.co.carrer.user.resume.websocket.WebSocketJwtValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class InterviewHandshakeInterceptor implements HandshakeInterceptor {

    private final WebSocketJwtValidator jwtValidator;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {
        String query = request.getURI().getQuery();
        String token = extractTokenFromQuery(query);

        if (token == null) {
            log.warn("[Interview WebSocket 핸드셰이크 거부] ?token 파라미터 없음");
            return false;
        }

        return jwtValidator.extractMemberId(token)
                .map(memberId -> {
                    attributes.put("memberId", memberId);
                    return true;
                })
                .orElseGet(() -> {
                    log.warn("[Interview WebSocket 핸드셰이크 거부] JWT 검증 실패");
                    return false;
                });
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
    }

    private String extractTokenFromQuery(String query) {
        if (query == null) return null;
        for (String param : query.split("&")) {
            String[] kv = param.split("=", 2);
            if (kv.length == 2 && "token".equals(kv[0])) return kv[1];
        }
        return null;
    }
}
