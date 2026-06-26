package kr.co.carrer.user.interview.websocket;

import kr.co.carrer.global.websocket.WebSocketJwtAuthenticator;
import kr.co.carrer.user.interview.repository.AIInterviewFeedbackRepository;
import kr.co.carrer.user.interview.repository.InterviewSessionRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
public class InterviewStompChannelInterceptor implements ChannelInterceptor {

    private static final String TOPIC_PREFIX = "/topic/interview/";

    private final InterviewSessionRepository sessionRepository;
    private final AIInterviewFeedbackRepository feedbackRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final WebSocketJwtAuthenticator jwtAuthenticator;

    @Autowired
    public InterviewStompChannelInterceptor(
            InterviewSessionRepository sessionRepository,
            AIInterviewFeedbackRepository feedbackRepository,
            @Lazy SimpMessagingTemplate messagingTemplate,
            WebSocketJwtAuthenticator jwtAuthenticator
    ) {
        this.sessionRepository = sessionRepository;
        this.feedbackRepository = feedbackRepository;
        this.messagingTemplate = messagingTemplate;
        this.jwtAuthenticator = jwtAuthenticator;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
        StompCommand command = accessor.getCommand();

        if (command == null) return message;

        return switch (command) {
            case CONNECT -> handleConnect(message, accessor);
            case SUBSCRIBE -> handleSubscribe(message, accessor);
            default -> message;
        };
    }

    private Message<?> handleConnect(Message<?> message, StompHeaderAccessor accessor) {
        // 핸드셰이크(예: ResumeHandshakeInterceptor)에서 이미 인증된 세션은 통과
        // — resume 클라이언트는 ?token= 핸드셰이크로 인증하므로 Authorization 헤더가 없어도 됨
        Map<String, Object> attributes = accessor.getSessionAttributes();
        if (attributes != null && attributes.get("memberId") instanceof UUID) {
            log.debug("[Interview STOMP CONNECT 통과] 핸드셰이크 인증 세션 — memberId={}", attributes.get("memberId"));
            return message;
        }

        // 핸드셰이크 인증이 없는 경우 STOMP Authorization 헤더로 검증 (interview 전용 경로)
        String token = extractBearerToken(accessor);
        if (!StringUtils.hasText(token)) {
            log.warn("[Interview STOMP CONNECT 거부] Authorization 헤더 없음");
            throw new MessageDeliveryException("인증되지 않은 WebSocket 연결입니다.");
        }

        if (attributes == null) {
            log.warn("[Interview STOMP CONNECT 거부] 세션 attributes 없음");
            throw new MessageDeliveryException("인증되지 않은 WebSocket 연결입니다.");
        }

        UUID memberId = jwtAuthenticator.authenticate(token).orElse(null);
        if (memberId == null) {
            log.warn("[Interview STOMP CONNECT 거부] JWT 검증 실패");
            throw new MessageDeliveryException("인증되지 않은 WebSocket 연결입니다.");
        }

        attributes.put("memberId", memberId);
        log.debug("[Interview STOMP CONNECT 승인] memberId={}", memberId);
        return message;
    }

    private String extractBearerToken(StompHeaderAccessor accessor) {
        List<String> authHeaders = accessor.getNativeHeader("Authorization");
        if (authHeaders == null || authHeaders.isEmpty()) return null;
        String header = authHeaders.get(0);
        if (StringUtils.hasText(header) && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }

    private Message<?> handleSubscribe(Message<?> message, StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination == null || !destination.startsWith(TOPIC_PREFIX)) {
            return message;
        }

        UUID sessionId = extractSessionId(destination);
        if (sessionId == null) {
            log.warn("[Interview STOMP SUBSCRIBE 거부] sessionId 파싱 실패: {}", destination);
            throw new MessageDeliveryException("잘못된 구독 경로 형식입니다.");
        }

        UUID memberId = extractMemberId(accessor);
        if (memberId == null) {
            log.warn("[Interview STOMP SUBSCRIBE 거부] 세션에 memberId 없음");
            throw new MessageDeliveryException("인증되지 않은 WebSocket 연결입니다.");
        }

        boolean owned = sessionRepository.findBySessionIdAndMemberId(sessionId, memberId).isPresent();
        if (!owned) {
            log.warn("[Interview STOMP SUBSCRIBE 거부] IDOR 탐지 — memberId={}, sessionId={}", memberId, sessionId);
            throw new MessageDeliveryException("해당 면접 세션에 대한 구독 권한이 없습니다.");
        }

        log.debug("[Interview STOMP SUBSCRIBE 승인] memberId={}, sessionId={}", memberId, sessionId);
        return message;
    }

    // 구독 완료 후 스냅샷 전송 (preSend에서 보내면 구독 등록 전이라 못 받음)
    @EventListener
    public void handleSessionSubscribe(SessionSubscribeEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String destination = accessor.getDestination();

        if (destination == null || !destination.startsWith(TOPIC_PREFIX)) return;

        UUID sessionId = extractSessionId(destination);
        if (sessionId == null) return;

        String stompSessionId = accessor.getSessionId();
        if (stompSessionId == null) return;

        String reportUrl = "/api/v1/user/interview/sessions/" + sessionId + "/report";
        WebSocketMessage snapshot = feedbackRepository.existsBySessionId(sessionId)
                ? WebSocketMessage.reportReady(reportUrl)
                : WebSocketMessage.sessionStart();

        // 재연결 경쟁 조건에서 동일 토픽 구독자 전체에 브로드캐스트되지 않도록 유니캐스트 전송
        messagingTemplate.convertAndSendToUser(stompSessionId, "/queue/interview-snapshot", snapshot);
        log.debug("[Interview Snapshot 전송] sessionId={}, stompSessionId={}", sessionId, stompSessionId);
    }

    private UUID extractMemberId(StompHeaderAccessor accessor) {
        Map<String, Object> attributes = accessor.getSessionAttributes();
        if (attributes == null) return null;
        Object memberId = attributes.get("memberId");
        return memberId instanceof UUID ? (UUID) memberId : null;
    }

    private UUID extractSessionId(String destination) {
        try {
            return UUID.fromString(destination.substring(TOPIC_PREFIX.length()));
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
