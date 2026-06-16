package kr.co.carrer.user.interview.repository;

import kr.co.carrer.user.interview.entity.AIInterviewFeedback;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AIInterviewFeedbackRepository extends JpaRepository<AIInterviewFeedback, Long> {

    List<AIInterviewFeedback> findBySessionIdOrderByQuestionOrderAsc(UUID sessionId);

    boolean existsBySessionId(UUID sessionId);
}
