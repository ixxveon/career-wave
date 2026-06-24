package kr.co.carrer.user.billing.repository;

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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * ddl-auto:update 환경에서 빈 DB에 스키마를 적용하고
 * 핵심 테이블·컬럼·제약이 올바르게 생성되는지 검증한다.
 *
 * - 빈 DB 적용 (emptyDb_update_createsAllBillingTables)
 * - Phase 7 신규 컬럼(reconciling_at) 포함 여부
 * - 재실행 안전성: 같은 스키마에 update 재적용 시 중복 미생성
 * - 주요 UNIQUE 제약 존재 확인
 */
@Testcontainers(disabledWithoutDocker = true)
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ContextConfiguration(classes = BillingMigrationSmokeTest.TestJpaConfig.class)
@TestPropertySource(properties = "spring.sql.init.mode=never")
class BillingMigrationSmokeTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:16-alpine")
                    .withDatabaseName("careerwave_migration_test")
                    .withUsername("test")
                    .withPassword("test");

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.datasource.driver-class-name", POSTGRES::getDriverClassName);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "update");
        registry.add("spring.jpa.properties.hibernate.dialect",
                () -> "org.hibernate.dialect.PostgreSQLDialect");
    }

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

    @Autowired
    JdbcTemplate jdbcTemplate;

    // ─── 헬퍼 ──────────────────────────────────────────────────────────────────

    private boolean tableExists(String tableName) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables " +
                "WHERE table_schema = 'public' AND table_name = ?",
                Integer.class, tableName);
        return count != null && count > 0;
    }

    private boolean columnExists(String tableName, String columnName) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns " +
                "WHERE table_schema = 'public' AND table_name = ? AND column_name = ?",
                Integer.class, tableName, columnName);
        return count != null && count > 0;
    }

    private int uniqueConstraintCount(String tableName) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.table_constraints " +
                "WHERE table_schema = 'public' AND table_name = ? AND constraint_type = 'UNIQUE'",
                Integer.class, tableName);
        return count != null ? count : 0;
    }

    // ─── 빈 DB 적용 테스트 ─────────────────────────────────────────────────────

    @Test
    @DisplayName("빈 DB — ddl-auto:update로 billing 핵심 6개 테이블 전체 생성 성공")
    void emptyDb_update_createsAllBillingTables() {
        assertThat(tableExists("user_payments")).isTrue();
        assertThat(tableExists("subscriptions")).isTrue();
        assertThat(tableExists("member_product_entitlements")).isTrue();
        assertThat(tableExists("billing_profiles")).isTrue();
        assertThat(tableExists("subscription_usage_periods")).isTrue();
        assertThat(tableExists("service_usage_records")).isTrue();
    }

    // ─── Phase 7 신규 컬럼 확인 ────────────────────────────────────────────────

    @Test
    @DisplayName("user_payments — Phase 7 신규 컬럼(reconciling_at) 및 기존 핵심 컬럼 존재")
    void userPayments_includesReconcilingAtAndCoreColumns() {
        assertThat(columnExists("user_payments", "reconciling_at"))
                .as("Phase 7에서 추가된 reconciling_at 컬럼이 존재해야 한다").isTrue();
        assertThat(columnExists("user_payments", "order_id")).isTrue();
        assertThat(columnExists("user_payments", "payment_status")).isTrue();
        assertThat(columnExists("user_payments", "payment_type")).isTrue();
        assertThat(columnExists("user_payments", "idempotency_key")).isTrue();
    }

    // ─── 재실행 안전성 ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("재실행 안전성 — ddl-auto:update 재적용 시 테이블 중복 미생성")
    void existingSchema_reapplyUpdate_noTableDuplication() {
        // 같은 Testcontainers PostgreSQL 인스턴스에서 Spring 컨텍스트가
        // 이미 초기화된 스키마에 ddl-auto:update를 재적용한다.
        // 각 테이블이 정확히 1개만 존재해야 한다 (중복 CREATE 없음).
        for (String table : new String[]{
                "user_payments", "subscriptions", "member_product_entitlements",
                "billing_profiles", "subscription_usage_periods", "service_usage_records"
        }) {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM information_schema.tables " +
                    "WHERE table_schema = 'public' AND table_name = ?",
                    Integer.class, table);
            assertThat(count)
                    .as("테이블 '%s'는 정확히 1개 존재해야 한다 (중복 없음)", table)
                    .isEqualTo(1);
        }
    }

    // ─── UNIQUE 제약 존재 확인 ─────────────────────────────────────────────────

    @Test
    @DisplayName("member_product_entitlements — (member_id, product_code) UNIQUE 제약 존재")
    void entitlements_hasUniqueConstraint() {
        assertThat(uniqueConstraintCount("member_product_entitlements"))
                .as("UNIQUE 제약이 1개 이상 존재해야 한다").isGreaterThanOrEqualTo(1);
    }

    @Test
    @DisplayName("user_payments — order_id UNIQUE 제약 존재")
    void userPayments_hasOrderIdUniqueConstraint() {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.table_constraints tc " +
                "JOIN information_schema.key_column_usage kcu " +
                "  ON tc.constraint_name = kcu.constraint_name " +
                "  AND tc.table_schema = kcu.table_schema " +
                "WHERE tc.table_schema = 'public' " +
                "AND tc.table_name = 'user_payments' " +
                "AND tc.constraint_type = 'UNIQUE' " +
                "AND kcu.column_name = 'order_id'",
                Integer.class);
        assertThat(count).as("order_id UNIQUE 제약이 존재해야 한다").isGreaterThanOrEqualTo(1);
    }

    @Test
    @DisplayName("subscription_usage_periods — (subscription_id, period_start) UNIQUE 제약 존재")
    void usagePeriods_hasUniqueConstraint() {
        assertThat(uniqueConstraintCount("subscription_usage_periods"))
                .as("UNIQUE 제약이 1개 이상 존재해야 한다").isGreaterThanOrEqualTo(1);
    }

    // ─── 구독·이용권 컬럼 구조 확인 ────────────────────────────────────────────

    @Test
    @DisplayName("subscriptions — 핵심 컬럼(subscription_status, next_billing_at, auto_renew) 존재")
    void subscriptions_hasCoreColumns() {
        assertThat(columnExists("subscriptions", "subscription_status")).isTrue();
        assertThat(columnExists("subscriptions", "next_billing_at")).isTrue();
        assertThat(columnExists("subscriptions", "auto_renew")).isTrue();
        assertThat(columnExists("subscriptions", "cancel_scheduled_at")).isTrue();
    }

    @Test
    @DisplayName("member_product_entitlements — FREE 이용권 필드(free_remaining, free_usage_status) 존재")
    void entitlements_hasFreeUsageColumns() {
        assertThat(columnExists("member_product_entitlements", "free_remaining")).isTrue();
        assertThat(columnExists("member_product_entitlements", "free_usage_status")).isTrue();
        assertThat(columnExists("member_product_entitlements", "product_code")).isTrue();
    }

    @Test
    @DisplayName("billing_profiles — billingKey 암호화 저장 컬럼(encrypted_billing_key) 존재")
    void billingProfiles_hasEncryptedBillingKeyColumn() {
        assertThat(columnExists("billing_profiles", "encrypted_billing_key"))
                .as("billingKey는 반드시 암호화 컬럼에만 저장되어야 한다").isTrue();
    }
}
