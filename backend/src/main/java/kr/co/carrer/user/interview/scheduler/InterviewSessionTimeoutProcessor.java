package kr.co.carrer.user.interview.scheduler;

import kr.co.carrer.user.billing.service.EntitlementService;
import kr.co.carrer.user.billing.type.ResourceType;
import kr.co.carrer.user.interview.repository.InterviewSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class InterviewSessionTimeoutProcessor {

    private final InterviewSessionRepository sessionRepository;
    private final EntitlementService entitlementService;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void process(UUID sessionId, ZonedDateTime now) {
        sessionRepository.findBySessionIdForUpdate(sessionId).ifPresent(session -> {
            if (!session.isInProgress()) {
                log.debug("Skip timeout — session already ended: sessionId={}, status={}", sessionId, session.getSessionStatus());
                return;
            }
            session.fail(now);
            entitlementService.release(ResourceType.INTERVIEW_SESSION, sessionId);
            log.info("Timed out session marked FAILED: sessionId={}", sessionId);
        });
    }
}
