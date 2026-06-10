package kr.co.carrer.user.resume.websocket;

import kr.co.carrer.user.resume.dto.WebSocketMessage;
import kr.co.carrer.user.resume.entity.Document;
import kr.co.carrer.user.resume.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * STOMP 프레임 인터셉터.
 * - CONNECT: 세션에 저장된 memberId 존재 여부 재검증
 * - SUBSCRIBE: 구독 토픽의 documentId 소유권을 DB로 확인 (IDOR 방지)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ResumeStompChannelInterceptor implements ChannelInterceptor {

    private static final String TOPIC_PREFIX = "/topic/resume/";
    private static final String STATUS_SUFFIX = "/status";

    private final DocumentRepository documentRepository;
    private final SimpMessagingTemplate messagingTemplate;

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
        UUID memberId = extractMemberIdFromSession(accessor);
        if (memberId == null) {
            log.warn("[STOMP CONNECT 거부] 세션에 memberId 없음");
            throw new MessageDeliveryException("인증되지 않은 WebSocket 연결입니다.");
        }
        log.debug("[STOMP CONNECT] memberId: {}", memberId);
        return message;
    }

    private Message<?> handleSubscribe(Message<?> message, StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination == null || !destination.startsWith(TOPIC_PREFIX)) {
            return message;
        }

        UUID documentId = extractDocumentIdFromTopic(destination);
        if (documentId == null) {
            log.warn("[STOMP SUBSCRIBE 거부] documentId 파싱 실패: {}", destination);
            throw new MessageDeliveryException("잘못된 구독 토픽 형식입니다.");
        }

        UUID memberId = extractMemberIdFromSession(accessor);
        if (memberId == null) {
            log.warn("[STOMP SUBSCRIBE 거부] 세션에 memberId 없음");
            throw new MessageDeliveryException("인증되지 않은 WebSocket 연결입니다.");
        }

        boolean owned = documentRepository.findByDocumentIdAndMemberId(documentId, memberId).isPresent();
        if (!owned) {
            log.warn("[STOMP SUBSCRIBE 거부] IDOR 탐지 — memberId: {}, documentId: {}", memberId, documentId);
            throw new MessageDeliveryException("해당 문서에 대한 구독 권한이 없습니다.");
        }

        log.debug("[STOMP SUBSCRIBE] memberId: {}, documentId: {}", memberId, documentId);

        // 재연결 대응 — 현재 status snapshot 1회 즉시 전송
        sendStatusSnapshot(documentId);

        return message;
    }

    private void sendStatusSnapshot(UUID documentId) {
        Optional<Document> documentOpt = documentRepository.findById(documentId);
        documentOpt.ifPresent(doc -> {
            String destination = "/topic/resume/" + documentId + "/status";
            messagingTemplate.convertAndSend(destination, new WebSocketMessage(documentId, doc.getStatus().name()));
            log.debug("[WebSocket Snapshot] documentId: {}, status: {}", documentId, doc.getStatus());
        });
    }

    private UUID extractMemberIdFromSession(StompHeaderAccessor accessor) {
        Map<String, Object> attributes = accessor.getSessionAttributes();
        if (attributes == null) return null;
        Object memberId = attributes.get("memberId");
        return memberId instanceof UUID ? (UUID) memberId : null;
    }

    private UUID extractDocumentIdFromTopic(String destination) {
        // /topic/resume/{documentId}/status
        try {
            String withoutPrefix = destination.substring(TOPIC_PREFIX.length());
            String documentIdStr = withoutPrefix.endsWith(STATUS_SUFFIX)
                    ? withoutPrefix.substring(0, withoutPrefix.length() - STATUS_SUFFIX.length())
                    : withoutPrefix;
            return UUID.fromString(documentIdStr);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
