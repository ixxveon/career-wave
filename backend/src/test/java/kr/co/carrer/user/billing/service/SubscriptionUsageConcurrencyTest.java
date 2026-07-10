package kr.co.carrer.user.billing.service;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.support.PostgreSqlTestContainerSupport;
import kr.co.carrer.user.billing.entity.MemberProductEntitlement;
import kr.co.carrer.user.billing.entity.Subscription;
import kr.co.carrer.user.billing.entity.SubscriptionUsagePeriod;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import kr.co.carrer.user.billing.repository.MemberProductEntitlementRepository;
import kr.co.carrer.user.billing.repository.ServiceUsageRecordRepository;
import kr.co.carrer.user.billing.repository.SubscriptionRepository;
import kr.co.carrer.user.billing.repository.SubscriptionUsagePeriodRepository;
import kr.co.carrer.user.billing.service.impl.EntitlementServiceImpl;
import kr.co.carrer.user.billing.type.ResourceType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.data.jpa.JpaRepositoriesAutoConfiguration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ContextConfiguration(classes = SubscriptionUsageConcurrencyTest.TestJpaConfig.class)
@TestPropertySource(properties = {"spring.sql.init.mode=never"})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class SubscriptionUsageConcurrencyTest extends PostgreSqlTestContainerSupport {

    @SpringBootConfiguration
    @EnableAutoConfiguration(exclude = JpaRepositoriesAutoConfiguration.class)
    @EntityScan(basePackages = "kr.co.carrer.user.billing.entity")
    @EnableJpaRepositories(basePackages = "kr.co.carrer.user.billing.repository")
    static class TestJpaConfig {}

    @Autowired MemberProductEntitlementRepository entitlementRepository;
    @Autowired ServiceUsageRecordRepository usageRecordRepository;
    @Autowired SubscriptionRepository subscriptionRepository;
    @Autowired SubscriptionUsagePeriodRepository usagePeriodRepository;
    @Autowired PlatformTransactionManager transactionManager;

    @Test
    @DisplayName("limit=1, 2-thread 경쟁 — 한 건만 예약 성공")
    void limitOne_twoThreads_onlyOneSucceeds() throws Exception {
        Fixture fixture = createFixture(1);
        CompetitionResult result = compete(fixture, 2);

        assertThat(result.success()).isEqualTo(1);
        assertThat(result.limitExceeded()).isEqualTo(1);
        assertThat(currentPeriod(fixture).getReservedCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("limit=N, N+1-thread 경쟁 — 정확히 N건만 예약 성공")
    void limitN_nPlusOneThreads_exactlyNSucceed() throws Exception {
        int limit = 5;
        Fixture fixture = createFixture(limit);
        CompetitionResult result = compete(fixture, limit + 1);

        assertThat(result.success()).isEqualTo(limit);
        assertThat(result.limitExceeded()).isEqualTo(1);
        assertThat(currentPeriod(fixture).getReservedCount()).isEqualTo(limit);
    }

    private CompetitionResult compete(Fixture fixture, int threadCount) throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch ready = new CountDownLatch(threadCount);
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger success = new AtomicInteger();
        AtomicInteger limitExceeded = new AtomicInteger();
        List<Future<?>> futures = new ArrayList<>();

        for (int i = 0; i < threadCount; i++) {
            UUID resourceId = UUID.randomUUID();
            futures.add(executor.submit(() -> {
                ready.countDown();
                start.await();
                try {
                    new TransactionTemplate(transactionManager).executeWithoutResult(status ->
                            service().reserve(
                                    fixture.memberId(), "interview",
                                    ResourceType.INTERVIEW_SESSION, resourceId));
                    success.incrementAndGet();
                } catch (CustomException e) {
                    if (e.getErrorCode() == BillingErrorCode.MONTHLY_LIMIT_EXCEEDED) {
                        limitExceeded.incrementAndGet();
                    } else {
                        throw e;
                    }
                }
                return null;
            }));
        }

        ready.await();
        start.countDown();
        try {
            for (Future<?> future : futures) {
                future.get();
            }
        } finally {
            executor.shutdown();
        }
        return new CompetitionResult(success.get(), limitExceeded.get());
    }

    private Fixture createFixture(int limit) {
        return new TransactionTemplate(transactionManager).execute(status -> {
            UUID memberId = UUID.randomUUID();
            ZonedDateTime now = ZonedDateTime.now(ZoneId.of("Asia/Seoul"));
            Subscription subscription = subscriptionRepository.save(
                    Subscription.create(memberId, 1L, now.minusDays(1), now.plusDays(29)));
            SubscriptionUsagePeriod period = usagePeriodRepository.save(
                    SubscriptionUsagePeriod.create(
                            subscription.getSubscriptionId(), "interview",
                            now.minusDays(1), now.plusDays(29), limit));
            MemberProductEntitlement entitlement =
                    MemberProductEntitlement.createFree(memberId, "interview");
            entitlement.activatePremium(subscription.getSubscriptionId());
            entitlementRepository.save(entitlement);
            return new Fixture(memberId, subscription.getSubscriptionId(), period.getUsagePeriodId());
        });
    }

    private SubscriptionUsagePeriod currentPeriod(Fixture fixture) {
        return usagePeriodRepository.findById(fixture.usagePeriodId()).orElseThrow();
    }

    private EntitlementServiceImpl service() {
        BillingMemberPort memberPort = new BillingMemberPort() {
            @Override public boolean isEligibleForBilling(java.util.UUID id) { return true; }
            @Override public BillingMemberPort.MemberBillingInfo getMemberBillingInfo(java.util.UUID id) { return null; }
            @Override public void markPremium(java.util.UUID id) {}
            @Override public void markFreeIfNoActivePlan(java.util.UUID id) {}
        };
        return new EntitlementServiceImpl(
                entitlementRepository,
                usageRecordRepository,
                memberPort,
                subscriptionRepository,
                usagePeriodRepository
        );
    }

    private record Fixture(UUID memberId, UUID subscriptionId, UUID usagePeriodId) {}

    private record CompetitionResult(int success, int limitExceeded) {}
}
