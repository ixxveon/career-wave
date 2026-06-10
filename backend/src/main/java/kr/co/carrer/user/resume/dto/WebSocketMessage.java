package kr.co.carrer.user.resume.dto;

import java.util.UUID;

/**
 * WebSocket 브로드캐스트 메시지.
 * status: ANALYZING / COMPLETED / FAILED / SESSION_CLOSE
 */
public record WebSocketMessage(
        UUID documentId,
        String status
) {}
