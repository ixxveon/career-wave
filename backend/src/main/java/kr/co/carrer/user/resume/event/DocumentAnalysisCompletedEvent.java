package kr.co.carrer.user.resume.event;

import java.util.UUID;

/**
 * 분석 완료(COMPLETED/FAILED) 후 DB 커밋이 끝난 시점에 WebSocket 브로드캐스트를 트리거하기 위한 이벤트.
 * @TransactionalEventListener(phase = AFTER_COMMIT) 에서 수신한다.
 */
public record DocumentAnalysisCompletedEvent(
        UUID documentId,
        String status
) {}
