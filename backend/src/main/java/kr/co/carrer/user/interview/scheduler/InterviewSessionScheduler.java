package kr.co.carrer.user.interview.scheduler;

import kr.co.carrer.user.interview.entity.InterviewSession;
import kr.co.carrer.user.interview.repository.InterviewSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class InterviewSessionScheduler {

    private final InterviewSessionRepository sessionRepository;

    // 1시간 주기: started_at < 24시간 전 AND updated_at < 5분 전인 IN_PROGRESS 세션을 FAILED로 전이
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void failTimedOutSessions() {
        ZonedDateTime cutoff = ZonedDateTime.now().minusHours(24);
        ZonedDateTime recentCutoff = ZonedDateTime.now().minusMinutes(5);

        List<InterviewSession> timedOut = sessionRepository.findTimedOutSessions(cutoff, recentCutoff);
        ZonedDateTime now = ZonedDateTime.now();
        timedOut.forEach(session -> session.fail(now));

        if (!timedOut.isEmpty()) {
            log.info("Timed out sessions marked as FAILED: count={}", timedOut.size());
        }
    }
}
