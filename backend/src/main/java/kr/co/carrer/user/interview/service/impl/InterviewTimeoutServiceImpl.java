package kr.co.carrer.user.interview.service.impl;

import kr.co.carrer.user.billing.service.EntitlementService;
import kr.co.carrer.user.billing.type.ResourceType;
import kr.co.carrer.user.interview.entity.InterviewSession;
import kr.co.carrer.user.interview.repository.InterviewSessionRepository;
import kr.co.carrer.user.interview.service.InterviewTimeoutService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InterviewTimeoutServiceImpl implements InterviewTimeoutService {

    private final InterviewSessionRepository sessionRepository;
    private final EntitlementService entitlementService;

    @Override
    @Transactional
    public void failTimedOutSession(UUID sessionId, ZonedDateTime failedAt) {
        InterviewSession session = sessionRepository.findBySessionIdForUpdate(sessionId).orElse(null);
        if (session == null || !session.isInProgress()) {
            return;
        }

        session.fail(failedAt);
        entitlementService.release(ResourceType.INTERVIEW_SESSION, sessionId);
    }
}
