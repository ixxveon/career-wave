package kr.co.carrer.user.billing.service;

import kr.co.carrer.user.billing.type.ResourceType;
import kr.co.carrer.user.interview.client.InterviewFastApiClient;
import kr.co.carrer.user.interview.dto.InterviewDTO;
import kr.co.carrer.user.interview.entity.InterviewSession;
import kr.co.carrer.user.interview.repository.AIInterviewFeedbackRepository;
import kr.co.carrer.user.interview.repository.CareerHistoryRepository;
import kr.co.carrer.user.interview.repository.InterviewMessageRepository;
import kr.co.carrer.user.interview.repository.InterviewSessionRepository;
import kr.co.carrer.user.interview.scheduler.InterviewSessionScheduler;
import kr.co.carrer.user.interview.service.InterviewTimeoutService;
import kr.co.carrer.user.interview.service.impl.InterviewCallbackServiceImpl;
import kr.co.carrer.user.interview.service.impl.InterviewSessionServiceImpl;
import kr.co.carrer.user.interview.type.SessionStatus;
import kr.co.carrer.user.resume.repository.DocumentRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InterviewFreeEntitlementIntegrationTest {

    @Mock InterviewSessionRepository sessionRepository;
    @Mock InterviewMessageRepository messageRepository;
    @Mock DocumentRepository documentRepository;
    @Mock InterviewFastApiClient fastApiClient;
    @Mock AIInterviewFeedbackRepository feedbackRepository;
    @Mock CareerHistoryRepository careerHistoryRepository;
    @Mock SimpMessagingTemplate messagingTemplate;
    @Mock EntitlementService entitlementService;
    @Mock InterviewTimeoutService interviewTimeoutService;

    private InterviewSessionServiceImpl sessionService;
    private InterviewCallbackServiceImpl callbackService;
    private InterviewSessionScheduler scheduler;

    private UUID memberId;
    private UUID sessionId;

    @BeforeEach
    void setUp() {
        sessionService = new InterviewSessionServiceImpl(
                sessionRepository, messageRepository, documentRepository, fastApiClient, entitlementService);
        callbackService = new InterviewCallbackServiceImpl(
                sessionRepository, feedbackRepository, careerHistoryRepository, messagingTemplate, entitlementService);
        scheduler = new InterviewSessionScheduler(sessionRepository, interviewTimeoutService);

        memberId = UUID.randomUUID();
        sessionId = UUID.randomUUID();

        // TransactionSynchronizationManager를 활성화하여 afterCommit 등록 허용
        TransactionSynchronizationManager.initSynchronization();
    }

    @AfterEach
    void tearDown() {
        TransactionSynchronizationManager.clearSynchronization();
    }

    @Nested
    @DisplayName("startSession — reserve 호출")
    class StartSession {

        @Test
        @DisplayName("세션 시작 시 interview reserve 호출")
        void startSession_callsReserve() {
            when(sessionRepository.findInProgressByMemberId(eq(memberId), any())).thenReturn(Optional.empty());
            when(sessionRepository.save(any())).thenAnswer(inv -> {
                InterviewSession session = inv.getArgument(0);
                setField(session, "sessionId", sessionId);
                return session;
            });

            sessionService.startSession(memberId, buildStartRequest());

            verify(entitlementService).reserve(memberId, "interview", ResourceType.INTERVIEW_SESSION, sessionId);
        }
    }

    @Nested
    @DisplayName("processReportCallback — consume 호출")
    class ReportCallback {

        @Test
        @DisplayName("보고서 콜백 처음 수신 시 consume 호출")
        void processReportCallback_firstTime_callsConsume() {
            InterviewSession session = buildSession(sessionId, memberId);
            when(sessionRepository.findBySessionId(sessionId)).thenReturn(Optional.of(session));
            when(feedbackRepository.existsBySessionId(sessionId)).thenReturn(false);
            when(feedbackRepository.saveAll(any())).thenReturn(List.of());
            when(careerHistoryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            callbackService.processReportCallback(sessionId, buildReportCallback());

            verify(entitlementService).consume(ResourceType.INTERVIEW_SESSION, sessionId);
        }

        @Test
        @DisplayName("보고서 콜백 중복 수신 — consume 미호출 (멱등)")
        void processReportCallback_alreadyProcessed_idempotent() {
            when(feedbackRepository.existsBySessionId(sessionId)).thenReturn(true);

            callbackService.processReportCallback(sessionId, buildReportCallback());

            verify(entitlementService, never()).consume(any(), any());
        }
    }

    @Nested
    @DisplayName("failTimedOutSessions — release 호출")
    class Scheduler {

        @Test
        @DisplayName("타임아웃 세션마다 release 호출")
        void failTimedOutSessions_callsReleaseForEach() {
            UUID id1 = UUID.randomUUID();
            UUID id2 = UUID.randomUUID();
            InterviewSession session1 = buildSession(id1, memberId);
            InterviewSession session2 = buildSession(id2, memberId);

            when(sessionRepository.findTimedOutSessions(any(), any(), eq(SessionStatus.IN_PROGRESS)))
                    .thenReturn(List.of(session1, session2));

            scheduler.failTimedOutSessions();

            verify(interviewTimeoutService).failTimedOutSession(eq(id1), any());
            verify(interviewTimeoutService).failTimedOutSession(eq(id2), any());
        }

        @Test
        @DisplayName("타임아웃 세션 없으면 release 미호출")
        void failTimedOutSessions_noTimedOut_noRelease() {
            when(sessionRepository.findTimedOutSessions(any(), any(), eq(SessionStatus.IN_PROGRESS)))
                    .thenReturn(List.of());

            scheduler.failTimedOutSessions();

            verify(interviewTimeoutService, never()).failTimedOutSession(any(), any());
        }
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private InterviewDTO.RequestStartSession buildStartRequest() {
        // 인자 순서: (documentId, sessionType, interviewType, targetCompany)
        return new InterviewDTO.RequestStartSession(null, "TEXT", "TECHNICAL", null);
    }

    private InterviewDTO.RequestReportCallback buildReportCallback() {
        return new InterviewDTO.RequestReportCallback(sessionId.toString(), 85, List.of());
    }

    private InterviewSession buildSession(UUID id, UUID memberId) {
        InterviewSession session = InterviewSession.create(memberId, null, null, null, null);
        setField(session, "sessionId", id);
        setField(session, "sessionStatus", SessionStatus.IN_PROGRESS);
        return session;
    }

    private void setField(Object target, String name, Object value) {
        try {
            Class<?> clazz = target.getClass();
            while (clazz != null) {
                try {
                    Field field = clazz.getDeclaredField(name);
                    field.setAccessible(true);
                    field.set(target, value);
                    return;
                } catch (NoSuchFieldException e) {
                    clazz = clazz.getSuperclass();
                }
            }
            throw new NoSuchFieldException(name);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
