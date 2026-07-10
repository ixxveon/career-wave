package kr.co.carrer.user.resume.websocket;

import kr.co.carrer.user.resume.entity.Document;
import kr.co.carrer.user.resume.repository.DocumentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ResumeStompChannelInterceptorTest {

    @Mock private DocumentRepository documentRepository;
    @Mock private SimpMessagingTemplate messagingTemplate;
    @Mock private DocumentAnalysisEventListener eventListener;
    @Mock private WebSocketSessionRegistry sessionRegistry;

    @InjectMocks
    private ResumeStompChannelInterceptor interceptor;

    private UUID memberId;
    private UUID documentId;

    @BeforeEach
    void setUp() {
        memberId = UUID.randomUUID();
        documentId = UUID.randomUUID();
    }

    @Test
    @DisplayName("CONNECT 프레임에 memberId가 있으면 통과한다")
    void connect_withMemberId_passes() {
        Message<?> message = buildStompMessage(StompCommand.CONNECT, null, memberId);
        Message<?> result = interceptor.preSend(message, null);
        assertThat(result).isNotNull();
    }

    @Test
    @DisplayName("CONNECT 프레임에 memberId가 없으면 Resume WS가 아닌 연결로 간주하고 통과한다")
    void connect_withoutMemberId_passes() {
        Message<?> message = buildStompMessage(StompCommand.CONNECT, null, null);
        Message<?> result = interceptor.preSend(message, null);
        assertThat(result).isNotNull();
    }

    @Test
    @DisplayName("SUBSCRIBE 시 본인 문서이면 통과하고 snapshot을 전송한다")
    void subscribe_ownDocument_passesAndSendsSnapshot() {
        String destination = "/topic/resume/" + documentId + "/status";
        Message<?> message = buildStompMessage(StompCommand.SUBSCRIBE, destination, memberId);

        Document doc = Document.ofResume(memberId, "https://s3.example.com/file.pdf", "이력서.pdf");
        when(documentRepository.findByDocumentIdAndMemberId(documentId, memberId)).thenReturn(Optional.of(doc));
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(doc));

        Message<?> result = interceptor.preSend(message, null);

        assertThat(result).isNotNull();
        verify(messagingTemplate).convertAndSendToUser(eq("test-session"), any(String.class), any(Object.class), any(Map.class));
    }

    @Test
    @DisplayName("SUBSCRIBE 시 타인 문서이면 예외가 발생한다 (IDOR 방지)")
    void subscribe_otherDocument_throwsException() {
        String destination = "/topic/resume/" + documentId + "/status";
        Message<?> message = buildStompMessage(StompCommand.SUBSCRIBE, destination, memberId);

        when(documentRepository.findByDocumentIdAndMemberId(documentId, memberId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> interceptor.preSend(message, null))
                .isInstanceOf(MessageDeliveryException.class);
    }

    // --- Helpers ---

    private Message<?> buildStompMessage(StompCommand command, String destination, UUID memberIdInSession) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        if (destination != null) {
            accessor.setDestination(destination);
        }

        Map<String, Object> sessionAttributes = new HashMap<>();
        if (memberIdInSession != null) {
            sessionAttributes.put("memberId", memberIdInSession);
        }
        accessor.setSessionAttributes(sessionAttributes);
        accessor.setSessionId("test-session");

        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
}
