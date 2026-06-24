package kr.co.carrer.user.billing.service;

import kr.co.carrer.user.billing.entity.MemberProductEntitlement;
import kr.co.carrer.user.billing.entity.ServiceUsageRecord;
import kr.co.carrer.user.billing.entity.Subscription;
import kr.co.carrer.user.billing.entity.SubscriptionUsagePeriod;
import kr.co.carrer.user.billing.repository.MemberProductEntitlementRepository;
import kr.co.carrer.user.billing.repository.ServiceUsageRecordRepository;
import kr.co.carrer.user.billing.repository.SubscriptionRepository;
import kr.co.carrer.user.billing.repository.SubscriptionUsagePeriodRepository;
import kr.co.carrer.user.billing.service.EntitlementService;
import kr.co.carrer.user.billing.service.impl.EntitlementServiceImpl;
import kr.co.carrer.user.billing.type.ResourceType;
import kr.co.carrer.user.interview.client.InterviewFastApiClient;
import kr.co.carrer.user.interview.dto.InterviewDTO;
import kr.co.carrer.user.interview.entity.InterviewSession;
import kr.co.carrer.user.interview.repository.AIInterviewFeedbackRepository;
import kr.co.carrer.user.interview.repository.CareerHistoryRepository;
import kr.co.carrer.user.interview.repository.InterviewMessageRepository;
import kr.co.carrer.user.interview.repository.InterviewSessionRepository;
import kr.co.carrer.user.interview.service.impl.InterviewCallbackServiceImpl;
import kr.co.carrer.user.interview.service.impl.InterviewSessionServiceImpl;
import kr.co.carrer.user.interview.service.impl.InterviewTimeoutServiceImpl;
import kr.co.carrer.user.interview.type.SessionStatus;
import kr.co.carrer.user.interview.type.SessionType;
import kr.co.carrer.user.interview.type.InterviewType;
import kr.co.carrer.user.resume.repository.DocumentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.lang.reflect.Field;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class InterviewPremiumUsageIntegrationTest {

    @Mock InterviewSessionRepository sessionRepository;
    @Mock InterviewMessageRepository messageRepository;
    @Mock DocumentRepository documentRepository;
    @Mock InterviewFastApiClient fastApiClient;
    @Mock AIInterviewFeedbackRepository feedbackRepository;
    @Mock CareerHistoryRepository careerHistoryRepository;
    @Mock SimpMessagingTemplate messagingTemplate;
    @Mock MemberProductEntitlementRepository entitlementRepository;
    @Mock ServiceUsageRecordRepository usageRecordRepository;
    @Mock SubscriptionRepository subscriptionRepository;
    @Mock SubscriptionUsagePeriodRepository usagePeriodRepository;

    private InterviewSessionServiceImpl sessionService;
    private InterviewCallbackServiceImpl callbackService;
    private InterviewTimeoutServiceImpl timeoutService;
    private EntitlementService entitlementService;
    private SubscriptionUsagePeriod period;
    private InterviewSession session;
    private UUID memberId;
    private UUID sessionId;

    @BeforeEach
    void setUp() {
        memberId = UUID.randomUUID();
        sessionId = UUID.randomUUID();
        UUID subscriptionId = UUID.randomUUID();
        UUID usagePeriodId = UUID.randomUUID();
        ZonedDateTime now = ZonedDateTime.now(ZoneId.of("Asia/Seoul"));

        MemberProductEntitlement entitlement =
                MemberProductEntitlement.createFree(memberId, "interview");
        entitlement.activatePremium(subscriptionId);
        Subscription subscription =
                Subscription.create(memberId, 1L, now.minusDays(1), now.plusDays(29));
        setField(subscription, "subscriptionId", subscriptionId);
        period = SubscriptionUsagePeriod.create(
                subscriptionId, "interview", now.minusDays(1), now.plusDays(29), 2);
        setField(period, "usagePeriodId", usagePeriodId);
        AtomicReference<ServiceUsageRecord> usageRecord = new AtomicReference<>();

        when(entitlementRepository.findByMemberIdAndProductCodeForUpdate(memberId, "interview"))
                .thenReturn(Optional.of(entitlement));
        when(subscriptionRepository.findBySubscriptionIdAndMemberIdForUpdate(subscriptionId, memberId))
                .thenReturn(Optional.of(subscription));
        when(usagePeriodRepository.findCurrentPeriodForUpdate(eq(subscriptionId), any()))
                .thenReturn(Optional.of(period));
        when(usagePeriodRepository.findByUsagePeriodIdForUpdate(usagePeriodId))
                .thenReturn(Optional.of(period));
        when(usageRecordRepository.findByResourceTypeAndResourceId(any(), any()))
                .thenAnswer(invocation -> Optional.ofNullable(usageRecord.get()));
        when(usageRecordRepository.findByResourceTypeAndResourceIdForUpdate(any(), any()))
                .thenAnswer(invocation -> Optional.ofNullable(usageRecord.get()));
        when(usageRecordRepository.save(any())).thenAnswer(invocation -> {
            ServiceUsageRecord saved = invocation.getArgument(0);
            usageRecord.set(saved);
            return saved;
        });

        BillingMemberPort memberPort = new BillingMemberPort() {
            @Override public boolean isEligibleForBilling(java.util.UUID id) { return true; }
            @Override public BillingMemberPort.MemberBillingInfo getMemberBillingInfo(java.util.UUID id) { return null; }
        };
        entitlementService = new EntitlementServiceImpl(
                entitlementRepository, usageRecordRepository, memberPort,
                subscriptionRepository, usagePeriodRepository);
        sessionService = new InterviewSessionServiceImpl(
                sessionRepository, messageRepository, documentRepository, fastApiClient, entitlementService);
        callbackService = new InterviewCallbackServiceImpl(
                sessionRepository, feedbackRepository, careerHistoryRepository,
                messageRepository, messagingTemplate, entitlementService);
        timeoutService = new InterviewTimeoutServiceImpl(sessionRepository);

        session = InterviewSession.create(
                memberId, null, SessionType.TEXT, InterviewType.TECHNICAL, null);
        setField(session, "sessionId", sessionId);
        when(sessionRepository.findInProgressByMemberId(eq(memberId), any())).thenReturn(Optional.empty());
        when(sessionRepository.save(any())).thenReturn(session);
    }

    @Test
    @DisplayName("Interview PREMIUM 성공 — start reserve, report callback consume")
    void interviewPremium_successConsumesMonthlyUsage() {
        TransactionSynchronizationManager.initSynchronization();
        try {
            sessionService.startSession(memberId,
                    new InterviewDTO.RequestStartSession(null, "TEXT", "TECHNICAL", null));
            assertThat(period.getReservedCount()).isEqualTo(1);

            when(feedbackRepository.existsBySessionId(sessionId)).thenReturn(false);
            when(sessionRepository.findBySessionId(sessionId)).thenReturn(Optional.of(session));
            when(feedbackRepository.saveAll(any())).thenReturn(List.of());
            when(careerHistoryRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
            callbackService.processReportCallback(
                    sessionId, new InterviewDTO.RequestReportCallback(sessionId.toString(), 85, List.of()));

            assertThat(period.getReservedCount()).isZero();
            assertThat(period.getUsedCount()).isEqualTo(1);
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    @DisplayName("Interview PREMIUM timeout — release, used 불변")
    void interviewPremium_timeoutReleasesMonthlyUsage() {
        sessionService.startSession(memberId,
                new InterviewDTO.RequestStartSession(null, "TEXT", "TECHNICAL", null));
        assertThat(period.getReservedCount()).isEqualTo(1);
        when(sessionRepository.findBySessionIdForUpdate(sessionId)).thenReturn(Optional.of(session));

        // 스케줄러 2단계 처리: 1) 세션 FAILED 처리, 2) 이용권 release (별도 트랜잭션)
        timeoutService.failTimedOutSession(sessionId, ZonedDateTime.now());
        entitlementService.release(ResourceType.INTERVIEW_SESSION, sessionId);

        assertThat(session.getSessionStatus()).isEqualTo(SessionStatus.FAILED);
        assertThat(period.getReservedCount()).isZero();
        assertThat(period.getUsedCount()).isZero();
    }

    private void setField(Object target, String name, Object value) {
        try {
            Field field = target.getClass().getDeclaredField(name);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new AssertionError(e);
        }
    }
}
