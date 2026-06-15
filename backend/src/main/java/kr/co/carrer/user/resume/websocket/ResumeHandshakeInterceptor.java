package kr.co.carrer.user.resume.websocket;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;
import java.util.UUID;

/**
 * WebSocket 핸드셰이크 시 ?token= 쿼리 파라미터로 JWT를 검증하고
 * memberId를 세션 attributes에 저장한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ResumeHandshakeInterceptor implements HandshakeInterceptor {

    private final WebSocketJwtValidator jwtValidator;

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
            log.warn("[WebSocket 핸드셰이크 거부] ?token 파라미터 없음");
            return false;
        }

        return jwtValidator.extractMemberId(token)
                .map(memberId -> {
                    attributes.put("memberId", memberId);
                    return true;
                })
                .orElseGet(() -> {
                    log.warn("[WebSocket 핸드셰이크 거부] JWT 검증 실패");
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
        // 핸드셰이크 완료 후 처리 없음
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
