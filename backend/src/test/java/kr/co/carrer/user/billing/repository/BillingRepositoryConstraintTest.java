package kr.co.carrer.user.billing.repository;

import kr.co.carrer.admin.payment.entity.Payment;
import kr.co.carrer.admin.payment.repository.PaymentRepository;
import kr.co.carrer.admin.payment.type.PaymentType;
import kr.co.carrer.support.PostgreSqlTestContainerSupport;
import kr.co.carrer.user.billing.entity.*;
import kr.co.carrer.user.billing.type.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.data.jpa.JpaRepositoriesAutoConfiguration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;

import java.time.ZonedDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ContextConfiguration(classes = BillingRepositoryConstraintTest.TestJpaConfig.class)
@TestPropertySource(properties = {"spring.sql.init.mode=never"})
class BillingRepositoryConstraintTest extends PostgreSqlTestContainerSupport {

    @SpringBootConfiguration
    @EnableAutoConfiguration(exclude = JpaRepositoriesAutoConfiguration.class)
    @EntityScan(basePackages = {
            "kr.co.carrer.user.billing.entity",
            "kr.co.carrer.user.member.entity",
            "kr.co.carrer.admin.payment.entity"
    })
    @EnableJpaRepositories(basePackages = {
            "kr.co.carrer.user.billing.repository",
            "kr.co.carrer.admin.payment.repository"
    })
    static class TestJpaConfig {}

    @Autowired private TestEntityManager em;
    @Autowired private MemberProductEntitlementRepository entitlementRepository;
    @Autowired private SubscriptionRepository subscriptionRepository;
    @Autowired private ServiceUsageRecordRepository usageRecordRepository;
    @Autowired private SubscriptionUsagePeriodRepository usagePeriodRepository;
    @Autowired private PaymentRepository paymentRepository;

    private UUID memberId;
    private Long planId;

    @BeforeEach
    void setUp() {
        memberId = UUID.randomUUID();

        em.getEntityManager().createNativeQuery(
                "INSERT INTO members (member_id, login_id, email, password, name, role_type, member_status, subscription_status, warning_count, created_at, updated_at) " +
                "VALUES (?, ?, ?, 'hashed', '테스터', 'USER', 'ACTIVE', 'FREE', 0, now(), now())")
                .setParameter(1, memberId)
                .setParameter(2, "test_" + memberId)
                .setParameter(3, memberId + "@test.com")
                .executeUpdate();

        Object planIdResult = em.getEntityManager().createNativeQuery(
                "INSERT INTO plans (product_code, plan_name, plan_price, monthly_usage_limit, currency, billing_cycle, is_active, created_at, updated_at) " +
                "VALUES ('interview', 'AI 모의면접', 9900, 20, 'KRW', 'MONTHLY', true, now(), now()) RETURNING plan_id")
                .getSingleResult();
        planId = ((Number) planIdResult).longValue();

        // MemberProductEntitlement.memberId는 @Column UUID라 Hibernate DDL이 FK를 생성하지 않음.
        // FK 제약 테스트를 위해 트랜잭션 내에서 명시적으로 생성 (PostgreSQL DDL은 트랜잭션 내 유효).
        em.getEntityManager().createNativeQuery(
                "DO $$ BEGIN " +
                "  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_entitlement_member_test') THEN " +
                "    ALTER TABLE member_product_entitlements ADD CONSTRAINT fk_entitlement_member_test " +
                "    FOREIGN KEY (member_id) REFERENCES members (member_id); " +
                "  END IF; " +
                "END $$")
                .executeUpdate();

        em.getEntityManager().flush();
    }

    @Nested
    @DisplayName("MemberProductEntitlement UNIQUE 제약")
    class EntitlementUnique {

        @Test
        @DisplayName("(member_id, product_code) 중복 저장 시 DataIntegrityViolationException 발생")
        void duplicate_memberProduct_throws() {
            MemberProductEntitlement first = MemberProductEntitlement.createFree(memberId, "interview");
            entitlementRepository.saveAndFlush(first);

            MemberProductEntitlement second = MemberProductEntitlement.createFree(memberId, "interview");
            assertThatThrownBy(() -> entitlementRepository.saveAndFlush(second))
                    .isInstanceOf(DataIntegrityViolationException.class);
        }

        @Test
        @DisplayName("같은 회원, 다른 상품 코드는 허용")
        void different_productCode_allowed() {
            entitlementRepository.saveAndFlush(
                    MemberProductEntitlement.createFree(memberId, "interview"));
            entitlementRepository.saveAndFlush(
                    MemberProductEntitlement.createFree(memberId, "document-coaching"));

            assertThat(entitlementRepository.findAllByMemberId(memberId)).hasSize(2);
        }
    }

    @Nested
    @DisplayName("ServiceUsageRecord UNIQUE 제약")
    class UsageRecordUnique {

        @Test
        @DisplayName("(resource_type, resource_id) 중복 저장 시 DataIntegrityViolationException 발생")
        void duplicate_resource_throws() {
            UUID resourceId = UUID.randomUUID();

            ServiceUsageRecord first = ServiceUsageRecord.reserveFree(
                    memberId, "interview", ResourceType.INTERVIEW_SESSION, resourceId);
            usageRecordRepository.saveAndFlush(first);

            ServiceUsageRecord second = ServiceUsageRecord.reserveFree(
                    memberId, "interview", ResourceType.INTERVIEW_SESSION, resourceId);
            assertThatThrownBy(() -> usageRecordRepository.saveAndFlush(second))
                    .isInstanceOf(DataIntegrityViolationException.class);
        }

        @Test
        @DisplayName("같은 resource_type이라도 다른 resource_id는 허용")
        void different_resourceId_allowed() {
            usageRecordRepository.saveAndFlush(ServiceUsageRecord.reserveFree(
                    memberId, "interview", ResourceType.INTERVIEW_SESSION, UUID.randomUUID()));
            usageRecordRepository.saveAndFlush(ServiceUsageRecord.reserveFree(
                    memberId, "interview", ResourceType.INTERVIEW_SESSION, UUID.randomUUID()));

            assertThat(usageRecordRepository.count()).isEqualTo(2);
        }
    }

    @Nested
    @DisplayName("SubscriptionUsagePeriod UNIQUE 제약")
    class UsagePeriodUnique {

        @Test
        @DisplayName("(subscription_id, period_start) 중복 저장 시 DataIntegrityViolationException 발생")
        void duplicate_subscriptionPeriodStart_throws() {
            ZonedDateTime now = ZonedDateTime.now();
            Subscription sub = Subscription.create(memberId, planId, now, now.plusMonths(1));
            subscriptionRepository.saveAndFlush(sub);

            SubscriptionUsagePeriod first = SubscriptionUsagePeriod.create(
                    sub.getSubscriptionId(), "interview", now, now.plusMonths(1), 20);
            usagePeriodRepository.saveAndFlush(first);

            SubscriptionUsagePeriod second = SubscriptionUsagePeriod.create(
                    sub.getSubscriptionId(), "interview", now, now.plusMonths(1), 20);
            assertThatThrownBy(() -> usagePeriodRepository.saveAndFlush(second))
                    .isInstanceOf(DataIntegrityViolationException.class);
        }
    }

    @Nested
    @DisplayName("MemberProductEntitlement FK 제약")
    class EntitlementFk {

        @Test
        @DisplayName("존재하지 않는 member_id로 저장 시 DataIntegrityViolationException 발생")
        void nonexistent_memberId_throws() {
            MemberProductEntitlement e = MemberProductEntitlement.createFree(UUID.randomUUID(), "interview");
            assertThatThrownBy(() -> entitlementRepository.saveAndFlush(e))
                    .isInstanceOf(DataIntegrityViolationException.class);
        }
    }

    @Nested
    @DisplayName("MemberProductEntitlementRepository 조회")
    class EntitlementQuery {

        @Test
        @DisplayName("findByMemberIdAndProductCode — 해당 회원·상품 조회 성공")
        void findByMemberIdAndProductCode_found() {
            entitlementRepository.saveAndFlush(
                    MemberProductEntitlement.createFree(memberId, "interview"));

            assertThat(entitlementRepository.findByMemberIdAndProductCode(memberId, "interview"))
                    .isPresent();
        }

        @Test
        @DisplayName("findAllByMemberId — 상품 2개 모두 조회")
        void findAllByMemberId_twoProducts() {
            entitlementRepository.saveAndFlush(
                    MemberProductEntitlement.createFree(memberId, "interview"));
            entitlementRepository.saveAndFlush(
                    MemberProductEntitlement.createFree(memberId, "document-coaching"));

            assertThat(entitlementRepository.findAllByMemberId(memberId)).hasSize(2);
        }
    }

    @Nested
    @DisplayName("SubscriptionRepository 조회")
    class SubscriptionQuery {

        @Test
        @DisplayName("findActiveLikeByMemberIdAndPlanId — ACTIVE 구독 조회")
        void findActiveLike_returnsActiveSubscription() {
            ZonedDateTime now = ZonedDateTime.now();
            Subscription s = Subscription.create(memberId, planId, now, now.plusMonths(1));
            subscriptionRepository.saveAndFlush(s);

            assertThat(subscriptionRepository.findActiveLikeByMemberIdAndPlanId(memberId, planId))
                    .hasSize(1);
        }

        @Test
        @DisplayName("EXPIRED 구독은 findActiveLike 결과에 포함되지 않음")
        void findActiveLike_excludesExpired() {
            ZonedDateTime now = ZonedDateTime.now();
            Subscription s = Subscription.create(memberId, planId, now, now.plusMonths(1));
            s.scheduleCancel(); // expire()는 CANCEL_SCHEDULED/PAYMENT_FAILED에서만 허용 (constitution 4.2)
            s.expire();
            subscriptionRepository.saveAndFlush(s);

            assertThat(subscriptionRepository.findActiveLikeByMemberIdAndPlanId(memberId, planId))
                    .isEmpty();
        }
    }

    @Nested
    @DisplayName("Payment UNIQUE 제약 — order_id, idempotency_key")
    class PaymentUnique {

        private Payment newPayment(String orderId, String idempotencyKey) {
            return Payment.createReady(
                    memberId, planId, null,
                    orderId, idempotencyKey,
                    9900, "KRW",
                    PaymentType.MANUAL, 0,
                    ZonedDateTime.now().plusMinutes(30));
        }

        private Payment newPaidPayment(String orderId, String idempotencyKey, String paymentKey) {
            Payment p = newPayment(orderId, idempotencyKey);
            p.authorize();
            p.confirmStarted();
            p.paid(paymentKey, ZonedDateTime.now());
            return p;
        }

        @Test
        @DisplayName("order_id 중복 저장 시 DataIntegrityViolationException 발생")
        void duplicate_orderId_throws() {
            paymentRepository.saveAndFlush(newPayment("ORDER-001", "IDEM-A"));

            assertThatThrownBy(() -> paymentRepository.saveAndFlush(newPayment("ORDER-001", "IDEM-B")))
                    .isInstanceOf(DataIntegrityViolationException.class);
        }

        @Test
        @DisplayName("idempotency_key 중복 저장 시 DataIntegrityViolationException 발생")
        void duplicate_idempotencyKey_throws() {
            paymentRepository.saveAndFlush(newPayment("ORDER-002", "IDEM-C"));

            assertThatThrownBy(() -> paymentRepository.saveAndFlush(newPayment("ORDER-003", "IDEM-C")))
                    .isInstanceOf(DataIntegrityViolationException.class);
        }

        @Test
        @DisplayName("order_id와 idempotency_key 모두 다른 결제는 허용")
        void different_orderIdAndIdempotencyKey_allowed() {
            paymentRepository.saveAndFlush(newPayment("ORDER-004", "IDEM-D"));
            paymentRepository.saveAndFlush(newPayment("ORDER-005", "IDEM-E"));

            assertThat(paymentRepository.count()).isEqualTo(2);
        }

        @Test
        @DisplayName("payment_key 중복 저장 시 DataIntegrityViolationException 발생 — PAID 결제 두 건 동일 키")
        void duplicate_paymentKey_throws() {
            paymentRepository.saveAndFlush(newPaidPayment("ORDER-006", "IDEM-F", "TOSS-KEY-001"));

            assertThatThrownBy(() ->
                    paymentRepository.saveAndFlush(newPaidPayment("ORDER-007", "IDEM-G", "TOSS-KEY-001")))
                    .isInstanceOf(DataIntegrityViolationException.class);
        }

        @Test
        @DisplayName("payment_key NULL은 여러 건 허용 — PAID 아닌 결제")
        void null_paymentKey_multipleAllowed() {
            // NULL은 UNIQUE 제약 예외 (PostgreSQL: NULL != NULL)
            paymentRepository.saveAndFlush(newPayment("ORDER-008", "IDEM-H"));
            paymentRepository.saveAndFlush(newPayment("ORDER-009", "IDEM-I"));

            assertThat(paymentRepository.count()).isEqualTo(2);
        }
    }
}
