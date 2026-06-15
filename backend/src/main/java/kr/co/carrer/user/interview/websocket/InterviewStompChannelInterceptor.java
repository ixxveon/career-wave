package kr.co.carrer.user.interview.websocket;

import kr.co.carrer.user.interview.repository.AIInterviewFeedbackRepository;
import kr.co.carrer.user.interview.repository.InterviewSessionRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
public class InterviewStompChannelInterceptor implements ChannelInterceptor {

    private static final String QUEUE_PREFIX = "/user/queue/interview/";

    private final InterviewSessionRepository sessionRepository;
    private final AIInterviewFeedbackRepository feedbackRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Autowired
    public InterviewStompChannelInterceptor(
            InterviewSessionRepository sessionRepository,
            AIInterviewFeedbackRepository feedbackRepository,
            @Lazy SimpMessagingTemplate messagingTemplate
    ) {
        this.sessionRepository = sessionRepository;
        this.feedbackRepository = feedbackRepository;
        this.messagingTemplate = messagingTemplate;
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
        UUID memberId = extractMemberId(accessor);
        if (memberId == null) {
            log.warn("[Interview STOMP CONNECT 거부] 세션에 memberId 없음");
            throw new MessageDeliveryException("인증되지 않은 WebSocket 연결입니다.");
        }
        log.debug("[Interview STOMP CONNECT] memberId={}", memberId);
        return message;
    }

    private Message<?> handleSubscribe(Message<?> message, StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination == null || !destination.startsWith(QUEUE_PREFIX)) {
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

        log.debug("[Interview STOMP SUBSCRIBE] memberId={}, sessionId={}", memberId, sessionId);
        sendSnapshot(accessor.getSessionId(), sessionId);
        return message;
    }

    // 구독 즉시 현재 상태 스냅샷 전송 (재연결 대응)
    private void sendSnapshot(String stompSessionId, UUID sessionId) {
        if (stompSessionId == null) return;

        String reportUrl = "/api/v1/user/interview/sessions/" + sessionId + "/report";
        Map<String, Object> headers = Map.of(SimpMessageHeaderAccessor.SESSION_ID_HEADER, stompSessionId);
        String destination = "/queue/interview/" + sessionId;

        WebSocketMessage snapshot = feedbackRepository.existsBySessionId(sessionId)
                ? WebSocketMessage.reportReady(reportUrl)
                : WebSocketMessage.sessionStart();

        messagingTemplate.convertAndSend(destination, snapshot, headers);
        log.debug("[Interview STOMP SUBSCRIBE Snapshot] stompSessionId={}, sessionId={}", stompSessionId, sessionId);
    }

    private UUID extractMemberId(StompHeaderAccessor accessor) {
        Map<String, Object> attributes = accessor.getSessionAttributes();
        if (attributes == null) return null;
        Object memberId = attributes.get("memberId");
        return memberId instanceof UUID ? (UUID) memberId : null;
    }

    private UUID extractSessionId(String destination) {
        // /user/queue/interview/{sessionId}
        try {
            String sessionIdStr = destination.substring(QUEUE_PREFIX.length());
            return UUID.fromString(sessionIdStr);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
