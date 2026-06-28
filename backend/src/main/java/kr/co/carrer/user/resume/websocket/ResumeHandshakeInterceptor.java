package kr.co.carrer.user.resume.websocket;

import kr.co.carrer.global.websocket.WebSocketJwtAuthenticator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

/**
 * Resume WebSocket 핸드셰이크 인터셉터.
 * ?token= 쿼리 파라미터로 JWT를 추출하고 HTTP API와 동일한 정책으로 검증한다.
 * (서명 + audience + jti + blacklist)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ResumeHandshakeInterceptor implements HandshakeInterceptor {

    private final WebSocketJwtAuthenticator jwtAuthenticator;

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes
    ) {
        String query = request.getURI().getQuery();
        String token = extractTokenFromQuery(query);

        if (token == null) {
            log.warn("[Resume WebSocket 핸드셰이크 거부] ?token 파라미터 없음");
            return false;
        }

        return jwtAuthenticator.authenticate(token)
                .map(memberId -> {
                    attributes.put("memberId", memberId);
                    return true;
                })
                .orElseGet(() -> {
                    log.warn("[Resume WebSocket 핸드셰이크 거부] JWT 검증 실패");
                    return false;
                });
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Exception exception
    ) {
    }

    private String extractTokenFromQuery(String query) {
        if (query == null) return null;
        for (String param : query.split("&")) {
            if (param.startsWith("token=")) {
                return param.substring("token=".length());
            }
        }
        return null;
    }
}
