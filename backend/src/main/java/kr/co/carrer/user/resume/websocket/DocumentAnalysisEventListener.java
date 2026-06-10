package kr.co.carrer.user.resume.websocket;

import kr.co.carrer.user.resume.dto.WebSocketMessage;
import kr.co.carrer.user.resume.event.DocumentAnalysisCompletedEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;

/**
 * DB 커밋 완료 후 WebSocket 브로드캐스트를 수행한다.
 * COMPLETED/FAILED 전송 후 30초 Grace Period 타이머를 시작한다.
 * 타이머 만료 전 클라이언트가 연결을 끊으면 취소된다.
 *
 * ⚠️ SimpMessagingTemplate은 @Transactional 메서드 내부에서 직접 호출하지 않는다.
 */
@Slf4j
@Component
public class DocumentAnalysisEventListener {

    private static final long GRACE_PERIOD_MS = 30_000L;

    private final SimpMessagingTemplate messagingTemplate;
    private final TaskScheduler taskScheduler;

    @Autowired
    public DocumentAnalysisEventListener(
            @Lazy SimpMessagingTemplate messagingTemplate,
            TaskScheduler taskScheduler
    ) {
        this.messagingTemplate = messagingTemplate;
        this.taskScheduler = taskScheduler;
    }

    // Grace Period 타이머 관리: documentId → ScheduledFuture
    private final Map<UUID, ScheduledFuture<?>> gracePeriodTimers = new ConcurrentHashMap<>();

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onAnalysisCompleted(DocumentAnalysisCompletedEvent event) {
        String destination = "/topic/resume/" + event.documentId() + "/status";
        WebSocketMessage message = new WebSocketMessage(event.documentId(), event.status());

        messagingTemplate.convertAndSend(destination, message);
        log.info("[WebSocket 브로드캐스트] documentId: {}, status: {}", event.documentId(), event.status());

        // COMPLETED / FAILED 시 Grace Period 30초 후 세션 정리 알림 발송
        scheduleGracePeriod(event.documentId());
    }

    private void scheduleGracePeriod(UUID documentId) {
        Instant triggerAt = Instant.now().plusMillis(GRACE_PERIOD_MS);

        ScheduledFuture<?> future = taskScheduler.schedule(() -> {
            String destination = "/topic/resume/" + documentId + "/status";
            messagingTemplate.convertAndSend(destination, new WebSocketMessage(documentId, "SESSION_CLOSE"));
            gracePeriodTimers.remove(documentId);
            log.info("[WebSocket Grace Period 만료] documentId: {}", documentId);
        }, triggerAt);

        gracePeriodTimers.put(documentId, future);
    }

    /**
     * 클라이언트가 먼저 연결을 닫을 때 호출 — Grace Period 타이머를 취소한다.
     */
    public void cancelGracePeriod(UUID documentId) {
        ScheduledFuture<?> future = gracePeriodTimers.remove(documentId);
        if (future != null) {
            future.cancel(true);
            log.debug("[WebSocket Grace Period 취소] documentId: {}", documentId);
        }
    }
}
