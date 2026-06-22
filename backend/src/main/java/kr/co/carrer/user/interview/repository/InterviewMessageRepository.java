package kr.co.carrer.user.interview.repository;

import kr.co.carrer.user.interview.entity.InterviewMessage;
import kr.co.carrer.user.interview.type.MessageSender;
import kr.co.carrer.user.interview.type.MessageType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InterviewMessageRepository extends JpaRepository<InterviewMessage, Long> {

    List<InterviewMessage> findBySessionIdOrderByCreatedAtAsc(UUID sessionId);

    Optional<InterviewMessage> findTopBySessionIdAndSenderAndMessageTypeOrderByCreatedAtDesc(
            UUID sessionId, MessageSender sender, MessageType messageType);

    boolean existsBySessionIdAndSenderAndMessageContent(UUID sessionId, MessageSender sender, String messageContent);
}
