package kr.co.carrer.user.interview.entity;

import jakarta.persistence.*;
import kr.co.carrer.user.interview.type.MessageSender;
import kr.co.carrer.user.interview.type.MessageType;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.UUID;

@Getter
@Entity
@Table(name = "interview_messages")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InterviewMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "message_id")
    private Long messageId;

    @Column(name = "session_id", columnDefinition = "uuid", nullable = false)
    private UUID sessionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "sender", nullable = false, length = 10)
    private MessageSender sender;

    @Enumerated(EnumType.STRING)
    @Column(name = "message_type", nullable = false, length = 20)
    private MessageType messageType;

    @Column(name = "message_content", nullable = false, columnDefinition = "TEXT")
    private String messageContent;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = ZonedDateTime.now();
    }

    public static InterviewMessage createAnswer(UUID sessionId, String messageContent) {
        InterviewMessage message = new InterviewMessage();
        message.sessionId = sessionId;
        message.sender = MessageSender.USER;
        message.messageType = MessageType.ANSWER;
        message.messageContent = messageContent;
        return message;
    }

    public static InterviewMessage createQuestion(UUID sessionId, String messageContent) {
        InterviewMessage message = new InterviewMessage();
        message.sessionId = sessionId;
        message.sender = MessageSender.AI;
        message.messageType = MessageType.QUESTION;
        message.messageContent = messageContent;
        return message;
    }
}
