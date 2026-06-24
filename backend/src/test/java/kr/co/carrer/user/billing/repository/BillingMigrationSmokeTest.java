package kr.co.carrer.user.billing.repository;

import kr.co.carrer.support.PostgreSqlTestContainerSupport;
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
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * PostgreSQL(Testcontainers) 환경에서 Hibernate DDL(create-drop)이 적용된 후
 * 핵심 billing 테이블·컬럼·제약이 올바르게 생성되는지 검증한다.
 *
 * - 6개 핵심 테이블 존재 확인
 * - Phase 7 신규 컬럼(reconciling_at) 포함 여부
 * - 주요 UNIQUE 제약: 의도한 컬럼 조합에 대해 정확히 검증
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ContextConfiguration(classes = BillingMigrationSmokeTest.TestJpaConfig.class)
@TestPropertySource(properties = "spring.sql.init.mode=never")
class BillingMigrationSmokeTest extends PostgreSqlTestContainerSupport {

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
    // SELECT WHERE 1=0: schema 이름 대소문자에 무관하게 테이블/컬럼 존재를 확인한다.

    private boolean tableExists(String tableName) {
        try {
            jdbcTemplate.queryForList("SELECT 1 FROM " + tableName + " WHERE 1=0");
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean columnExists(String tableName, String columnName) {
        try {
            jdbcTemplate.queryForList("SELECT " + columnName + " FROM " + tableName + " WHERE 1=0");
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    // 지정한 두 컬럼이 같은 UNIQUE 제약에 묶여 있는지 확인
    private boolean hasCompositeUniqueConstraint(String tableName, String col1, String col2) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM (" +
                "  SELECT tc.constraint_name " +
                "  FROM information_schema.table_constraints tc " +
                "  JOIN information_schema.key_column_usage kcu " +
                "    ON tc.constraint_name = kcu.constraint_name " +
                "    AND LOWER(tc.table_schema) = LOWER(kcu.table_schema) " +
                "  WHERE LOWER(tc.table_schema) = 'public' " +
                "    AND tc.table_name = ? " +
                "    AND tc.constraint_type = 'UNIQUE' " +
                "    AND kcu.column_name IN (?, ?) " +
                "  GROUP BY tc.constraint_name " +
                "  HAVING COUNT(DISTINCT kcu.column_name) = 2" +
                ") sub",
                Integer.class, tableName, col1, col2);
        return count != null && count > 0;
    }

    // ─── 테이블 존재 확인 ─────────────────────────────────────────────────────

    @Test
    @DisplayName("billing 핵심 6개 테이블 전체 생성 성공")
    void createsAllBillingTables() {
        assertThat(tableExists("payments")).isTrue();
        assertThat(tableExists("subscriptions")).isTrue();
        assertThat(tableExists("member_product_entitlements")).isTrue();
        assertThat(tableExists("billing_profiles")).isTrue();
        assertThat(tableExists("subscription_usage_periods")).isTrue();
        assertThat(tableExists("service_usage_records")).isTrue();
    }

    // ─── Phase 7 신규 컬럼 확인 ────────────────────────────────────────────────

    @Test
    @DisplayName("payments — Phase 7 신규 컬럼(reconciling_at) 및 기존 핵심 컬럼 존재")
    void userPayments_includesReconcilingAtAndCoreColumns() {
        assertThat(columnExists("payments", "reconciling_at"))
                .as("Phase 7에서 추가된 reconciling_at 컬럼이 존재해야 한다").isTrue();
        assertThat(columnExists("payments", "order_id")).isTrue();
        assertThat(columnExists("payments", "payment_status")).isTrue();
        assertThat(columnExists("payments", "payment_type")).isTrue();
        assertThat(columnExists("payments", "idempotency_key")).isTrue();
    }

    // ─── UNIQUE 제약 컬럼 조합 검증 ──────────────────────────────────────────

    @Test
    @DisplayName("member_product_entitlements — (member_id, product_code) UNIQUE 제약 존재")
    void entitlements_hasUniqueConstraintOnMemberIdAndProductCode() {
        assertThat(hasCompositeUniqueConstraint("member_product_entitlements", "member_id", "product_code"))
                .as("(member_id, product_code) 복합 UNIQUE 제약이 존재해야 한다").isTrue();
    }

    @Test
    @DisplayName("payments — order_id UNIQUE 제약 존재")
    void userPayments_hasOrderIdUniqueConstraint() {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.table_constraints tc " +
                "JOIN information_schema.key_column_usage kcu " +
                "  ON tc.constraint_name = kcu.constraint_name " +
                "  AND LOWER(tc.table_schema) = LOWER(kcu.table_schema) " +
                "WHERE LOWER(tc.table_schema) = 'public' " +
                "AND tc.table_name = 'payments' " +
                "AND tc.constraint_type = 'UNIQUE' " +
                "AND kcu.column_name = 'order_id'",
                Integer.class);
        assertThat(count).as("order_id UNIQUE 제약이 존재해야 한다").isGreaterThanOrEqualTo(1);
    }

    @Test
    @DisplayName("subscription_usage_periods — (subscription_id, period_start) UNIQUE 제약 존재")
    void usagePeriods_hasUniqueConstraintOnSubscriptionIdAndPeriodStart() {
        assertThat(hasCompositeUniqueConstraint("subscription_usage_periods", "subscription_id", "period_start"))
                .as("(subscription_id, period_start) 복합 UNIQUE 제약이 존재해야 한다").isTrue();
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
