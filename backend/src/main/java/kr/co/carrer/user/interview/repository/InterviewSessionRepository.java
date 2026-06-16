package kr.co.carrer.user.interview.repository;

import jakarta.persistence.LockModeType;
import kr.co.carrer.user.interview.entity.InterviewSession;
import kr.co.carrer.user.interview.type.SessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.ZonedDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InterviewSessionRepository extends JpaRepository<InterviewSession, UUID> {

    Optional<InterviewSession> findBySessionId(UUID sessionId);

    Optional<InterviewSession> findBySessionIdAndMemberId(UUID sessionId, UUID memberId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM InterviewSession s WHERE s.memberId = :memberId AND s.sessionStatus = 'IN_PROGRESS'")
    Optional<InterviewSession> findInProgressByMemberId(@Param("memberId") UUID memberId);

    List<InterviewSession> findAllBySessionIdIn(Collection<UUID> sessionIds);

    @Query("SELECT s FROM InterviewSession s WHERE s.sessionStatus = 'IN_PROGRESS' " +
           "AND s.startedAt < :cutoff AND s.updatedAt < :recentCutoff")
    List<InterviewSession> findTimedOutSessions(
            @Param("cutoff") ZonedDateTime cutoff,
            @Param("recentCutoff") ZonedDateTime recentCutoff
    );
}
