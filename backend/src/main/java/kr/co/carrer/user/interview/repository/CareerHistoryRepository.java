package kr.co.carrer.user.interview.repository;

import kr.co.carrer.user.interview.entity.CareerHistory;
import kr.co.carrer.user.interview.repository.projection.CareerHistoryWithSession;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface CareerHistoryRepository extends JpaRepository<CareerHistory, Long> {

    Page<CareerHistory> findByMemberIdOrderByCreatedAtDesc(UUID memberId, Pageable pageable);

    Optional<CareerHistory> findByMemberIdAndSessionId(UUID memberId, UUID sessionId);

    @Query("SELECT ch.careerHistoryId AS careerHistoryId, s.sessionId AS sessionId, " +
           "s.sessionType AS sessionType, s.interviewType AS interviewType, " +
           "s.targetCompany AS targetCompany, s.sessionStatus AS sessionStatus, " +
           "ch.totalScore AS totalScore, ch.pdfUrl AS pdfUrl, ch.createdAt AS createdAt " +
           "FROM CareerHistory ch LEFT JOIN InterviewSession s ON ch.sessionId = s.sessionId " +
           "WHERE ch.memberId = :memberId ORDER BY ch.createdAt DESC")
    Page<CareerHistoryWithSession> findHistoryByMemberId(@Param("memberId") UUID memberId, Pageable pageable);
}
