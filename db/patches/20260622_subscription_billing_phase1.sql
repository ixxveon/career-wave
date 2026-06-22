-- ================================================
-- patch: user/billing Phase 1 DB 스키마
-- branch: feature/user-subscription-billing-phase1
-- date: 2026-06-22
-- 내용:
--   1. subscriptions 테이블 컬럼 추가 (구독 도메인 확장)
--   2. payments 테이블 컬럼·CHECK 제약 추가
--   3. 신규 테이블 6개 생성 (plans, billing_profiles, member_product_entitlements,
--      subscription_usage_periods, service_usage_records, billing_consents)
--
-- 주의:
--   - payments.payment_type은 20260621_payments_add_payment_type.sql에서 이미 추가됨
--   - IF NOT EXISTS를 사용해 중복 실행 안전하게 처리
--   - 트랜잭션으로 래핑 — 중간 실패 시 전체 롤백됨
-- ================================================

BEGIN;

-- ============================================================
-- 1. subscriptions 테이블 확장
-- ============================================================

ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS plan_id              BIGINT       NULL,
    ADD COLUMN IF NOT EXISTS billing_profile_id   UUID         NULL,
    ADD COLUMN IF NOT EXISTS started_at           TIMESTAMPTZ  NULL,
    ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ  NULL,
    ADD COLUMN IF NOT EXISTS current_period_end   TIMESTAMPTZ  NULL,
    ADD COLUMN IF NOT EXISTS next_billing_at      TIMESTAMPTZ  NULL,
    ADD COLUMN IF NOT EXISTS payment_failed_at    TIMESTAMPTZ  NULL,
    ADD COLUMN IF NOT EXISTS retry_count          INTEGER      NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cancel_scheduled_at  TIMESTAMPTZ  NULL,
    ADD COLUMN IF NOT EXISTS cancelled_at         TIMESTAMPTZ  NULL,
    ADD COLUMN IF NOT EXISTS auto_renew           BOOLEAN      NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS updated_at           TIMESTAMPTZ  NULL DEFAULT NOW();

-- 기존 row null 값을 기본값으로 채움
UPDATE subscriptions
SET
    started_at           = created_at   WHERE started_at IS NULL;
UPDATE subscriptions
SET
    current_period_start = created_at   WHERE current_period_start IS NULL;
UPDATE subscriptions
SET
    current_period_end   = created_at + INTERVAL '1 month' WHERE current_period_end IS NULL;
UPDATE subscriptions
SET
    retry_count          = 0            WHERE retry_count IS NULL;
UPDATE subscriptions
SET
    auto_renew           = TRUE         WHERE auto_renew IS NULL;
UPDATE subscriptions
SET
    updated_at           = created_at   WHERE updated_at IS NULL;

-- NOT NULL 설정 (기본값 채운 뒤)
ALTER TABLE subscriptions
    ALTER COLUMN started_at           SET NOT NULL,
    ALTER COLUMN current_period_start SET NOT NULL,
    ALTER COLUMN current_period_end   SET NOT NULL,
    ALTER COLUMN retry_count          SET NOT NULL,
    ALTER COLUMN auto_renew           SET NOT NULL,
    ALTER COLUMN updated_at           SET NOT NULL;

-- subscription_status CHECK 제약 갱신 (기존 제약이 있으면 삭제 후 재추가)
ALTER TABLE subscriptions
    DROP CONSTRAINT IF EXISTS chk_subscription_status;
ALTER TABLE subscriptions
    ADD CONSTRAINT chk_subscription_status
        CHECK (subscription_status IN ('ACTIVE', 'CANCEL_SCHEDULED', 'EXPIRED', 'PAYMENT_FAILED', 'REFUND_PENDING', 'REFUNDED'));

ALTER TABLE subscriptions
    DROP CONSTRAINT IF EXISTS chk_retry_count;
ALTER TABLE subscriptions
    ADD CONSTRAINT chk_retry_count CHECK (retry_count BETWEEN 0 AND 2);

COMMENT ON COLUMN subscriptions.plan_id              IS '플랜 FK';
COMMENT ON COLUMN subscriptions.billing_profile_id   IS 'Toss 자동결제 수단 FK (Phase 4 이전 생성된 row는 NULL)';
COMMENT ON COLUMN subscriptions.started_at           IS '구독 시작 일시';
COMMENT ON COLUMN subscriptions.current_period_start IS '현재 이용 기간 시작';
COMMENT ON COLUMN subscriptions.current_period_end   IS '현재 기간 종료';
COMMENT ON COLUMN subscriptions.next_billing_at      IS '다음 자동결제 시각';
COMMENT ON COLUMN subscriptions.payment_failed_at    IS '최초 자동결제 실패 시각';
COMMENT ON COLUMN subscriptions.retry_count          IS '완료된 자동 재시도 횟수 (최대 2)';
COMMENT ON COLUMN subscriptions.cancel_scheduled_at  IS '해지 신청 시각';
COMMENT ON COLUMN subscriptions.cancelled_at         IS '실제 해지(만료) 처리 시각';
COMMENT ON COLUMN subscriptions.auto_renew           IS '자동 갱신 여부';
COMMENT ON COLUMN subscriptions.updated_at           IS '마지막 변경 일시';

-- ============================================================
-- 2. payments 테이블 컬럼 및 CHECK 제약 추가
--    (payment_type은 20260621 패치에서 이미 추가됨)
-- ============================================================

ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS subscription_id  UUID         NULL,
    ADD COLUMN IF NOT EXISTS plan_id          BIGINT       NULL,
    ADD COLUMN IF NOT EXISTS attempt_sequence INTEGER      NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS expires_at       TIMESTAMPTZ  NULL,
    ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ  NULL DEFAULT NOW();

UPDATE payments SET attempt_sequence = 0     WHERE attempt_sequence IS NULL;
UPDATE payments SET updated_at       = created_at WHERE updated_at IS NULL;

ALTER TABLE payments
    ALTER COLUMN attempt_sequence SET NOT NULL,
    ALTER COLUMN updated_at       SET NOT NULL;

-- CHECK 제약 추가 (중복 실행 안전)
ALTER TABLE payments
    DROP CONSTRAINT IF EXISTS chk_payment_status;
ALTER TABLE payments
    ADD CONSTRAINT chk_payment_status
        CHECK (payment_status IN ('READY', 'AUTHORIZED', 'CONFIRMING', 'PAID', 'FAILED', 'CANCELED', 'RECONCILING', 'REFUNDED'));

ALTER TABLE payments
    DROP CONSTRAINT IF EXISTS chk_failure_reason;
ALTER TABLE payments
    ADD CONSTRAINT chk_failure_reason
        CHECK (failure_reason IN ('USER_CANCELED', 'CARD_DECLINED', 'TIMEOUT', 'DUPLICATE_ORDER', 'CONFIRM_FAILED', 'FORBIDDEN', 'UNKNOWN'));

ALTER TABLE payments
    DROP CONSTRAINT IF EXISTS chk_paid_approved_at;
ALTER TABLE payments
    ADD CONSTRAINT chk_paid_approved_at CHECK (payment_status != 'PAID' OR approved_at IS NOT NULL);

ALTER TABLE payments
    DROP CONSTRAINT IF EXISTS chk_payment_amount;
ALTER TABLE payments
    ADD CONSTRAINT chk_payment_amount CHECK (amount > 0);

ALTER TABLE payments
    DROP CONSTRAINT IF EXISTS chk_attempt_sequence;
ALTER TABLE payments
    ADD CONSTRAINT chk_attempt_sequence CHECK (attempt_sequence IN (0, 1, 2));

COMMENT ON COLUMN payments.subscription_id  IS '연결 구독 FK';
COMMENT ON COLUMN payments.plan_id          IS '결제 당시 플랜 FK';
COMMENT ON COLUMN payments.attempt_sequence IS '동일 주문 재시도 순번 (0: 최초, 1~2: 재시도)';
COMMENT ON COLUMN payments.expires_at       IS 'READY 상태 만료 시각 (30분)';
COMMENT ON COLUMN payments.updated_at       IS '마지막 변경 일시';

-- ============================================================
-- 3. plans 테이블: 신규 생성 또는 기존 테이블 컬럼 보완
--    develop DB는 plans가 이미 존재하므로 CREATE TABLE IF NOT EXISTS가 스킵됨.
--    이후 ALTER TABLE로 누락된 컬럼을 보장.
-- ============================================================

CREATE TABLE IF NOT EXISTS plans (
    plan_id               BIGSERIAL    NOT NULL,
    product_code          VARCHAR(30)  NOT NULL,
    plan_name             VARCHAR(50)  NOT NULL,
    plan_price            INTEGER      NOT NULL,
    monthly_usage_limit   INTEGER      NOT NULL DEFAULT 0,
    currency              VARCHAR(10)  NOT NULL DEFAULT 'KRW',
    billing_cycle         VARCHAR(20)  NOT NULL DEFAULT 'MONTHLY',
    is_active             BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_plans          PRIMARY KEY (plan_id),
    CONSTRAINT uq_product_code   UNIQUE (product_code),
    CONSTRAINT chk_billing_cycle CHECK (billing_cycle IN ('MONTHLY', 'YEARLY'))
);

-- 기존 plans 테이블에 Phase 1 신규 컬럼 보완 (CREATE TABLE이 스킵된 경우 대응)
ALTER TABLE plans
    ADD COLUMN IF NOT EXISTS monthly_usage_limit INTEGER     NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ============================================================
-- 4. 신규 테이블: billing_profiles
-- ============================================================

CREATE TABLE IF NOT EXISTS billing_profiles (
    billing_profile_id    UUID         NOT NULL DEFAULT gen_random_uuid(),
    member_id             UUID         NOT NULL,
    customer_key          VARCHAR(100) NOT NULL,
    encrypted_billing_key TEXT         NOT NULL,
    card_company          VARCHAR(50)  NULL,
    card_number_masked    VARCHAR(30)  NULL,
    billing_profile_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    authenticated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_billing_profiles            PRIMARY KEY (billing_profile_id),
    CONSTRAINT uq_customer_key                UNIQUE (customer_key),
    CONSTRAINT fk_billing_profile_member      FOREIGN KEY (member_id) REFERENCES members (member_id),
    CONSTRAINT chk_billing_profile_status     CHECK (billing_profile_status IN ('ACTIVE', 'REVOKED'))
);

-- subscriptions.billing_profile_id → billing_profiles FK
-- billing_profiles 생성 이후에 추가해야 하므로 이 위치에 배치
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_subscriptions_billing_profile'
    ) THEN
        ALTER TABLE subscriptions
            ADD CONSTRAINT fk_subscriptions_billing_profile
            FOREIGN KEY (billing_profile_id) REFERENCES billing_profiles(billing_profile_id);
    END IF;
END $$;

-- ============================================================
-- 5. 신규 테이블: member_product_entitlements
-- ============================================================

CREATE TABLE IF NOT EXISTS member_product_entitlements (
    entitlement_id         UUID        NOT NULL DEFAULT gen_random_uuid(),
    member_id              UUID        NOT NULL,
    product_code           VARCHAR(30) NOT NULL,
    plan_type              VARCHAR(20) NOT NULL DEFAULT 'FREE',
    free_remaining         INTEGER     NOT NULL DEFAULT 1,
    free_usage_status      VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    active_subscription_id UUID        NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_entitlements             PRIMARY KEY (entitlement_id),
    CONSTRAINT uq_member_product           UNIQUE (member_id, product_code),
    CONSTRAINT fk_entitlement_member       FOREIGN KEY (member_id)              REFERENCES members (member_id),
    CONSTRAINT fk_entitlement_subscription FOREIGN KEY (active_subscription_id) REFERENCES subscriptions (subscription_id),
    CONSTRAINT chk_plan_type               CHECK (plan_type IN ('FREE', 'PREMIUM')),
    CONSTRAINT chk_free_usage_status       CHECK (free_usage_status IN ('AVAILABLE', 'RESERVED', 'USED', 'FORFEITED')),
    CONSTRAINT chk_free_remaining          CHECK (free_remaining BETWEEN 0 AND 1),
    CONSTRAINT chk_available_remaining     CHECK (free_usage_status != 'AVAILABLE' OR free_remaining = 1),
    CONSTRAINT chk_consumed_remaining      CHECK (free_usage_status NOT IN ('USED', 'FORFEITED') OR free_remaining = 0)
);

-- ============================================================
-- 6. 신규 테이블: subscription_usage_periods
-- ============================================================

CREATE TABLE IF NOT EXISTS subscription_usage_periods (
    usage_period_id   UUID        NOT NULL DEFAULT gen_random_uuid(),
    subscription_id   UUID        NOT NULL,
    product_code      VARCHAR(30) NOT NULL,
    period_start      TIMESTAMPTZ NOT NULL,
    period_end        TIMESTAMPTZ NOT NULL,
    limit_count       INTEGER     NOT NULL,
    used_count        INTEGER     NOT NULL DEFAULT 0,
    reserved_count    INTEGER     NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_usage_periods       PRIMARY KEY (usage_period_id),
    CONSTRAINT uq_sub_period_start    UNIQUE (subscription_id, period_start),
    CONSTRAINT fk_usage_period_sub    FOREIGN KEY (subscription_id) REFERENCES subscriptions (subscription_id),
    CONSTRAINT chk_usage_count        CHECK (used_count + reserved_count <= limit_count),
    CONSTRAINT chk_limit_count        CHECK (limit_count > 0),
    CONSTRAINT chk_used_count         CHECK (used_count >= 0),
    CONSTRAINT chk_reserved_count     CHECK (reserved_count >= 0)
);

-- ============================================================
-- 7. 신규 테이블: service_usage_records
-- ============================================================

CREATE TABLE IF NOT EXISTS service_usage_records (
    usage_record_id   UUID        NOT NULL DEFAULT gen_random_uuid(),
    member_id         UUID        NOT NULL,
    product_code      VARCHAR(30) NOT NULL,
    resource_type     VARCHAR(20) NOT NULL,
    resource_id       UUID        NOT NULL,
    usage_source      VARCHAR(20) NOT NULL,
    usage_status      VARCHAR(20) NOT NULL DEFAULT 'RESERVED',
    usage_period_id   UUID        NULL,
    reserved_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    consumed_at       TIMESTAMPTZ NULL,
    released_at       TIMESTAMPTZ NULL,

    CONSTRAINT pk_usage_records        PRIMARY KEY (usage_record_id),
    CONSTRAINT uq_resource             UNIQUE (resource_type, resource_id),
    CONSTRAINT fk_usage_record_member  FOREIGN KEY (member_id)       REFERENCES members (member_id),
    CONSTRAINT fk_usage_record_period  FOREIGN KEY (usage_period_id) REFERENCES subscription_usage_periods (usage_period_id),
    CONSTRAINT chk_resource_type       CHECK (resource_type IN ('DOCUMENT', 'INTERVIEW_SESSION')),
    CONSTRAINT chk_usage_source        CHECK (usage_source IN ('FREE', 'SUBSCRIPTION')),
    CONSTRAINT chk_usage_status        CHECK (usage_status IN ('RESERVED', 'CONSUMED', 'RELEASED'))
);

-- ============================================================
-- 8. 신규 테이블: billing_consents
-- ============================================================

CREATE TABLE IF NOT EXISTS billing_consents (
    billing_consent_id UUID        NOT NULL DEFAULT gen_random_uuid(),
    member_id          UUID        NOT NULL,
    plan_id            BIGINT      NOT NULL,
    terms_version      VARCHAR(30) NOT NULL,
    agreed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at         TIMESTAMPTZ NULL,

    CONSTRAINT pk_billing_consents     PRIMARY KEY (billing_consent_id),
    CONSTRAINT fk_consent_member       FOREIGN KEY (member_id) REFERENCES members (member_id),
    CONSTRAINT fk_consent_plan         FOREIGN KEY (plan_id)   REFERENCES plans (plan_id)
);

-- ============================================================
-- 9. 인덱스
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_payments_status_created
    ON payments (payment_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status_billing
    ON subscriptions (subscription_status, next_billing_at);

COMMIT;
