package kr.co.carrer.user.interview.service;

import java.time.ZonedDateTime;
import java.util.UUID;

public interface InterviewTimeoutService {

    void failTimedOutSession(UUID sessionId, ZonedDateTime failedAt);
}
