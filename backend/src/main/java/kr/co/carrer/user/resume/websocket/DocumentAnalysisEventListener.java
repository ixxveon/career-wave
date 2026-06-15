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
 * 타이머 만료 시 WebSocketSessionRegistry를 통해 Close 1000으로 세션을 정상 종료한다.
 *
 * ⚠️ SimpMessagingTemplate은 @Transactional 메서드 내부에서 직접 호출하지 않는다.
 */
@Slf4j
@Component
public class DocumentAnalysisEventListener {

    private static final long GRACE_PERIOD_MS = 30_000L;

    private final SimpMessagingTemplate messagingTemplate;
    private final TaskScheduler taskScheduler;
    private final WebSocketSessionRegistry sessionRegistry;

    @Autowired
    public DocumentAnalysisEventListener(
            @Lazy SimpMessagingTemplate messagingTemplate,
            TaskScheduler taskScheduler,
            WebSocketSessionRegistry sessionRegistry
    ) {
        this.messagingTemplate = messagingTemplate;
        this.taskScheduler = taskScheduler;
        this.sessionRegistry = sessionRegistry;
    }

    // Grace Period 타이머 관리: documentId → ScheduledFuture
    private final Map<UUID, ScheduledFuture<?>> gracePeriodTimers = new ConcurrentHashMap<>();

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onAnalysisCompleted(DocumentAnalysisCompletedEvent event) {
        String destination = "/topic/resume/" + event.documentId() + "/status";
        WebSocketMessage message = new WebSocketMessage(event.documentId(), event.status());

        messagingTemplate.convertAndSend(destination, message);
        log.info("[WebSocket 브로드캐스트] documentId: {}, status: {}", event.documentId(), event.status());

        // COMPLETED / FAILED 시 Grace Period 30초 후 세션 정상 종료 (Close 1000)
        scheduleGracePeriod(event.documentId());
    }

    private void scheduleGracePeriod(UUID documentId) {
        Instant triggerAt = Instant.now().plusMillis(GRACE_PERIOD_MS);

        ScheduledFuture<?> future = taskScheduler.schedule(() -> {
            gracePeriodTimers.remove(documentId);
            sessionRegistry.closeSession(documentId);
            log.info("[WebSocket Grace Period 만료] documentId: {} — Close 1000 전송", documentId);
        }, triggerAt);

        gracePeriodTimers.merge(documentId, future, (prev, next) -> {
            prev.cancel(false);
            return next;
        });
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
