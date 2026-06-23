-- ============================================================
-- Career Wave 로컬 개발용 테스트 데이터 시드
-- 실행 방법: psql -U careerwave -d careerwave -f seed-local.sql
-- 비밀번호: 모든 계정 공통 Test1234! (관리자만 1234)
-- testuser05: 정지 계정 테스트용 (SUSPENDED / 커뮤니티 운영정책 위반 / 7일)
-- ============================================================

-- 기존 테스트 데이터 초기화 (재실행 안전)
-- suspend_histories 자식 행 먼저 삭제 (FK 제약 위반 방지)
DELETE FROM suspend_histories
WHERE member_id IN (
  SELECT member_id FROM members WHERE login_id IN ('testuser01','testuser02','testuser03','testuser04','testuser05','testcompany01')
);
DELETE FROM members WHERE login_id IN ('testuser01','testuser02','testuser03','testuser04','testuser05','testcompany01');
DELETE FROM admins  WHERE login_id IN ('admin', 'cs');

-- ────────────────────────────────────────────
-- 관리자 먼저 삽입 (suspend_histories admin_id FK 보장)
-- loginId=admin / 비밀번호: 1234
-- ────────────────────────────────────────────
INSERT INTO admins (login_id, email, password_hash, name, admin_role, status, created_at, updated_at)
VALUES
  ('admin', 'admin@career-wave.local',
   '$2b$10$NPp0Acje.rj.VrDuRiPT2u.dXnCKzYGmxZn7Ro2BOw4qGDZIPr34W',
   '슈퍼관리자', 'MASTER', 'ACTIVE', NOW(), NOW()),
  ('cs', 'cs@career-wave.com',
   '$2b$10$NPp0Acje.rj.VrDuRiPT2u.dXnCKzYGmxZn7Ro2BOw4qGDZIPr34W',
   'CS 담당자', 'CS', 'ACTIVE', NOW(), NOW());

-- ────────────────────────────────────────────
-- 관리자 먼저 삽입 (suspend_histories admin_id FK 보장)
-- loginId=admin / 비밀번호: 1234

-- ────────────────────────────────────────────
-- 일반 회원 (USER / 비밀번호: Test1234!)
-- ────────────────────────────────────────────
INSERT INTO members (member_id, login_id, email, password, name, role_type, member_status, subscription_status, warning_count, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'testuser01', 'testuser01@test.com',
   '$2b$10$ZjFpVBbyD9p.j4ZzCznhQultNGDWlje5i0AvrrgZi8pZCzxmDKEgS',
   '테스트유저(구독없음)', 'USER', 'ACTIVE', 'FREE',    0, NOW(), NOW()),

  (gen_random_uuid(), 'testuser02', 'testuser02@test.com',
   '$2b$10$ZjFpVBbyD9p.j4ZzCznhQultNGDWlje5i0AvrrgZi8pZCzxmDKEgS',
   '테스트유저(면접구독)', 'USER', 'ACTIVE', 'PREMIUM', 0, NOW(), NOW()),

  (gen_random_uuid(), 'testuser03', 'testuser03@test.com',
   '$2b$10$ZjFpVBbyD9p.j4ZzCznhQultNGDWlje5i0AvrrgZi8pZCzxmDKEgS',
   '테스트유저(서류구독)', 'USER', 'ACTIVE', 'PREMIUM', 0, NOW(), NOW()),

  (gen_random_uuid(), 'testuser04', 'testuser04@test.com',
   '$2b$10$ZjFpVBbyD9p.j4ZzCznhQultNGDWlje5i0AvrrgZi8pZCzxmDKEgS',
   '테스트유저(전체구독)', 'USER', 'ACTIVE', 'PREMIUM', 0, NOW(), NOW()),

  (gen_random_uuid(), 'testuser05', 'testuser05@test.com',
   '$2b$10$ZjFpVBbyD9p.j4ZzCznhQultNGDWlje5i0AvrrgZi8pZCzxmDKEgS',
   '테스트유저(정지)', 'USER', 'SUSPENDED', 'FREE', 0, NOW(), NOW());

-- ────────────────────────────────────────────
-- 정지 회원 suspend_histories (testuser05)
-- ────────────────────────────────────────────
DO $$
DECLARE
  v_member_id UUID;
  v_admin_id  BIGINT;
BEGIN
  SELECT member_id INTO v_member_id FROM members WHERE login_id = 'testuser05';
  SELECT admin_id  INTO v_admin_id  FROM admins  WHERE login_id = 'admin';

  INSERT INTO suspend_histories (member_id, admin_id, sanction_type, reason, duration, start_date, end_date, created_at)
  VALUES (v_member_id, v_admin_id, 'SUSPEND', '커뮤니티 운영정책 위반', 'SEVEN_DAYS',
          CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', NOW());
END $$;

-- ────────────────────────────────────────────
-- 기업 회원 (COMPANY / 비밀번호: Test1234!)
-- ────────────────────────────────────────────
INSERT INTO members (member_id, login_id, email, password, name, role_type, member_status, subscription_status, warning_count, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'testcompany01', 'testcompany01@test.com',
   '$2b$10$ZjFpVBbyD9p.j4ZzCznhQultNGDWlje5i0AvrrgZi8pZCzxmDKEgS',
   '테스트기업담당자', 'COMPANY', 'ACTIVE', 'FREE', 0, NOW(), NOW());


-- ────────────────────────────────────────────
-- 구독 플랜 (데모용)
-- ────────────────────────────────────────────
INSERT INTO plans (
  product_code, plan_name, plan_price, monthly_usage_limit,
  currency, billing_cycle, is_active, created_at, updated_at
)
VALUES
  ('interview',         'AI 모의면접',   29000, 20, 'KRW', 'MONTHLY', true, NOW(), NOW()),
  ('document-coaching', '서류 AI 코칭', 29000, 30, 'KRW', 'MONTHLY', true, NOW(), NOW())
ON CONFLICT (product_code) DO UPDATE SET
  plan_name = EXCLUDED.plan_name,
  plan_price = EXCLUDED.plan_price,
  monthly_usage_limit = EXCLUDED.monthly_usage_limit,
  currency = EXCLUDED.currency,
  billing_cycle = EXCLUDED.billing_cycle,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ────────────────────────────────────────────
-- 데모용 구독 데이터 (testuser02 — 면접, testuser03 — 서류)
-- ────────────────────────────────────────────
DELETE FROM member_product_entitlements WHERE member_id IN (
  SELECT member_id FROM members WHERE login_id IN ('testuser02', 'testuser03')
);
DELETE FROM subscription_usage_periods WHERE subscription_id IN (
  SELECT subscription_id FROM subscriptions WHERE member_id IN (
    SELECT member_id FROM members WHERE login_id IN ('testuser02', 'testuser03')
  )
);
DELETE FROM subscriptions WHERE member_id IN (
  SELECT member_id FROM members WHERE login_id IN ('testuser02', 'testuser03')
);

DO $$
DECLARE
  v_member02 UUID;
  v_member03 UUID;
  v_plan_interview BIGINT;
  v_plan_resume    BIGINT;
  v_sub_interview  UUID := gen_random_uuid();
  v_sub_resume     UUID := gen_random_uuid();
BEGIN
  SELECT member_id INTO v_member02 FROM members WHERE login_id = 'testuser02';
  SELECT member_id INTO v_member03 FROM members WHERE login_id = 'testuser03';
  SELECT plan_id INTO v_plan_interview FROM plans WHERE product_code = 'interview';
  SELECT plan_id INTO v_plan_resume    FROM plans WHERE product_code = 'document-coaching';

  INSERT INTO subscriptions (subscription_id, member_id, plan_id, subscription_status,
    started_at, current_period_start, current_period_end, next_billing_at, auto_renew, created_at, updated_at)
  VALUES
    (v_sub_interview, v_member02, v_plan_interview, 'ACTIVE',
     NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days',
     NOW() + INTERVAL '15 days', true, NOW() - INTERVAL '15 days', NOW()),
    (v_sub_resume, v_member03, v_plan_resume, 'ACTIVE',
     NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days',
     NOW() + INTERVAL '25 days', true, NOW() - INTERVAL '5 days', NOW());

  INSERT INTO subscription_usage_periods (
    usage_period_id, subscription_id, product_code, period_start, period_end,
    limit_count, used_count, reserved_count, created_at, updated_at
  )
  VALUES
    (gen_random_uuid(), v_sub_interview, 'interview',
     NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days', 20, 5, 0, NOW(), NOW()),
    (gen_random_uuid(), v_sub_resume, 'document-coaching',
     NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days', 30, 8, 0, NOW(), NOW());

  INSERT INTO member_product_entitlements (
    entitlement_id, member_id, product_code, plan_type, free_remaining,
    free_usage_status, active_subscription_id, created_at, updated_at
  )
  VALUES
    (gen_random_uuid(), v_member02, 'interview', 'PREMIUM', 0, 'FORFEITED', v_sub_interview, NOW(), NOW()),
    (gen_random_uuid(), v_member03, 'document-coaching', 'PREMIUM', 0, 'FORFEITED', v_sub_resume, NOW(), NOW())
  ON CONFLICT (member_id, product_code) DO UPDATE SET
    plan_type = EXCLUDED.plan_type,
    free_remaining = EXCLUDED.free_remaining,
    free_usage_status = EXCLUDED.free_usage_status,
    active_subscription_id = EXCLUDED.active_subscription_id,
    updated_at = NOW();
END $$;

-- ────────────────────────────────────────────
-- 데모용 결제·환불 데이터 (testuser04 — 전체구독)
-- ────────────────────────────────────────────
DELETE FROM refunds   WHERE payment_id IN (SELECT payment_id FROM payments WHERE order_id LIKE 'DEMO-%');
DELETE FROM payments  WHERE order_id LIKE 'DEMO-%';
DELETE FROM subscriptions WHERE member_id = (SELECT member_id FROM members WHERE login_id = 'testuser04');

DO $$
DECLARE
  v_member_id   UUID;
  v_plan_id     BIGINT;
  v_sub_id      UUID := gen_random_uuid();
  v_pay_id      UUID := gen_random_uuid();
BEGIN
  SELECT member_id INTO v_member_id FROM members WHERE login_id = 'testuser04';
  SELECT plan_id   INTO v_plan_id   FROM plans   WHERE product_code = 'interview';

  INSERT INTO subscriptions (subscription_id, member_id, plan_id, subscription_status,
    started_at, current_period_start, current_period_end, next_billing_at, auto_renew, created_at, updated_at)
  VALUES (v_sub_id, v_member_id, v_plan_id, 'REFUND_PENDING',
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '10 days',
    NOW() + INTERVAL '20 days',
    NOW() + INTERVAL '20 days',
    true, NOW() - INTERVAL '10 days', NOW());

  INSERT INTO payments (payment_id, member_id, subscription_id, plan_id,
    order_id, payment_key, idempotency_key,
    payment_type, attempt_sequence, amount, currency, payment_status,
    payment_method, approved_at, created_at, updated_at)
  VALUES (v_pay_id, v_member_id, v_sub_id, v_plan_id,
    'DEMO-ORDER-001',
    'DEMO-TOSS-KEY-001',
    'DEMO-IDEM-001',
    'MANUAL', 0, 29000, 'KRW', 'PAID', 'CARD',
    NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', NOW());

  INSERT INTO refunds (payment_id, amount, reason, refund_status, created_at)
  VALUES (v_pay_id, 29000, '서비스 불만족으로 인한 환불 요청', 'PENDING', NOW() - INTERVAL '1 day');
END $$;

-- 결과 확인
SELECT login_id, name, role_type, member_status, subscription_status FROM members ORDER BY login_id;
SELECT login_id, name, admin_role, status FROM admins;
SELECT plan_id, plan_name, plan_price FROM plans;
SELECT p.order_id, p.amount, p.payment_status, r.refund_status
  FROM payments p LEFT JOIN refunds r ON p.payment_id = r.payment_id
 WHERE p.order_id LIKE 'DEMO-%';
