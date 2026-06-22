package kr.co.carrer.user.interview.scheduler;

import kr.co.carrer.user.billing.service.EntitlementService;
import kr.co.carrer.user.billing.type.ResourceType;
import kr.co.carrer.user.interview.entity.InterviewSession;
import kr.co.carrer.user.interview.repository.InterviewSessionRepository;
import kr.co.carrer.user.interview.type.SessionStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class InterviewSessionScheduler {

    private final InterviewSessionRepository sessionRepository;
    private final EntitlementService entitlementService;

    // 1시간 주기: started_at < 24시간 전 AND updated_at < 5분 전인 IN_PROGRESS 세션을 FAILED로 전이
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void failTimedOutSessions() {
        ZoneId kst = ZoneId.of("Asia/Seoul");
        ZonedDateTime now = ZonedDateTime.now(kst);
        ZonedDateTime cutoff = now.minusHours(24);
        ZonedDateTime recentCutoff = now.minusMinutes(5);

        List<InterviewSession> timedOut = sessionRepository.findTimedOutSessions(cutoff, recentCutoff, SessionStatus.IN_PROGRESS);
        timedOut.forEach(session -> {
            session.fail(now);
            entitlementService.release(ResourceType.INTERVIEW_SESSION, session.getSessionId());
        });

        if (!timedOut.isEmpty()) {
            log.info("Timed out sessions marked as FAILED: count={}", timedOut.size());
        }
    }
}
