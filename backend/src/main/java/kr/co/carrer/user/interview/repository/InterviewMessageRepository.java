package kr.co.carrer.user.interview.repository;

import kr.co.carrer.user.interview.entity.InterviewMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface InterviewMessageRepository extends JpaRepository<InterviewMessage, Long> {

    List<InterviewMessage> findBySessionIdOrderByCreatedAtAsc(UUID sessionId);
}
