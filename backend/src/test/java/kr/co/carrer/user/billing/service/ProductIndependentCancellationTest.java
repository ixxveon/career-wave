package kr.co.carrer.user.billing.service;

import kr.co.carrer.user.billing.dto.BillingDTO;
import kr.co.carrer.user.billing.entity.Subscription;
import kr.co.carrer.user.billing.repository.SubscriptionRepository;
import kr.co.carrer.user.billing.service.impl.CancelSubscriptionServiceImpl;
import kr.co.carrer.user.billing.type.SubscriptionStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class ProductIndependentCancellationTest {

    @Mock SubscriptionRepository subscriptionRepository;

    private CancelSubscriptionServiceImpl service;

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private final UUID memberId = UUID.randomUUID();
    private final UUID documentSubId = UUID.randomUUID();
    private final UUID interviewSubId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new CancelSubscriptionServiceImpl(subscriptionRepository);
    }

    @Test
    @DisplayName("document 구독 해지 — interview 구독 상태 영향 없음")
    void cancel_document_doesNotAffectInterview() {
        Subscription documentSub = activeSubscription(documentSubId, "document-coaching");
        Subscription interviewSub = activeSubscription(interviewSubId, "interview");

        given(subscriptionRepository.findBySubscriptionIdAndMemberIdForUpdate(documentSubId, memberId))
                .willReturn(Optional.of(documentSub));

        BillingDTO.ResponseCancelSubscription result = service.cancel(memberId, documentSubId);

        assertThat(result.status()).isEqualTo("CANCEL_SCHEDULED");
        assertThat(documentSub.getSubscriptionStatus()).isEqualTo(SubscriptionStatus.CANCEL_SCHEDULED);
        // interview 구독은 그대로 ACTIVE
        assertThat(interviewSub.getSubscriptionStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
        assertThat(interviewSub.isAutoRenew()).isTrue();
    }

    @Test
    @DisplayName("interview 구독 해지 — document 구독 상태 영향 없음")
    void cancel_interview_doesNotAffectDocument() {
        Subscription documentSub = activeSubscription(documentSubId, "document-coaching");
        Subscription interviewSub = activeSubscription(interviewSubId, "interview");

        given(subscriptionRepository.findBySubscriptionIdAndMemberIdForUpdate(interviewSubId, memberId))
                .willReturn(Optional.of(interviewSub));

        BillingDTO.ResponseCancelSubscription result = service.cancel(memberId, interviewSubId);

        assertThat(result.status()).isEqualTo("CANCEL_SCHEDULED");
        assertThat(interviewSub.getSubscriptionStatus()).isEqualTo(SubscriptionStatus.CANCEL_SCHEDULED);
        // document 구독은 그대로 ACTIVE
        assertThat(documentSub.getSubscriptionStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
        assertThat(documentSub.isAutoRenew()).isTrue();
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private Subscription activeSubscription(UUID subId, String productCode) {
        ZonedDateTime now = ZonedDateTime.now(KST);
        Subscription s = Subscription.create(memberId, 1L, now.minusDays(10), now.plusDays(20));
        setField(s, "subscriptionId", subId);
        return s;
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
        } catch (ReflectiveOperationException e) {
            throw new AssertionError(e);
        }
    }
}
