-- ============================================================
-- Career Wave 로컬 개발용 테스트 데이터 시드
-- 실행 방법: psql -U careerwave -d careerwave -f seed-local.sql
-- 비밀번호: 모든 계정 공통 Test1234! (관리자만 1234)
-- ============================================================

-- 기존 테스트 데이터 초기화 (재실행 안전)
DELETE FROM members WHERE login_id IN ('testuser01','testuser02','testuser03','testuser04','testcompany01');
DELETE FROM admins  WHERE login_id = 'admin';

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
   '테스트유저(전체구독)', 'USER', 'ACTIVE', 'PREMIUM', 0, NOW(), NOW());

-- ────────────────────────────────────────────
-- 기업 회원 (COMPANY / 비밀번호: Test1234!)
-- ────────────────────────────────────────────
INSERT INTO members (member_id, login_id, email, password, name, role_type, member_status, subscription_status, warning_count, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'testcompany01', 'testcompany01@test.com',
   '$2b$10$ZjFpVBbyD9p.j4ZzCznhQultNGDWlje5i0AvrrgZi8pZCzxmDKEgS',
   '테스트기업담당자', 'COMPANY', 'ACTIVE', 'FREE', 0, NOW(), NOW());

-- ────────────────────────────────────────────
-- 관리자 (loginId=admin / 비밀번호: 1234)
-- ────────────────────────────────────────────
INSERT INTO admins (login_id, email, password_hash, name, admin_role, status, created_at, updated_at)
VALUES
  ('admin', 'admin@career-wave.local',
   '$2b$10$NPp0Acje.rj.VrDuRiPT2u.dXnCKzYGmxZn7Ro2BOw4qGDZIPr34W',
   '슈퍼관리자', 'MASTER', 'ACTIVE', NOW(), NOW());

-- ────────────────────────────────────────────
-- 구독 플랜 (데모용)
-- ────────────────────────────────────────────
DELETE FROM plans WHERE product_code IN ('PREMIUM_INTERVIEW_MONTHLY','PREMIUM_RESUME_MONTHLY','PREMIUM_ALL_MONTHLY');

INSERT INTO plans (product_code, plan_name, plan_price, currency, billing_cycle, is_active, created_at)
VALUES
  ('PREMIUM_INTERVIEW_MONTHLY', '면접 프리미엄 월정액', 19900, 'KRW', 'MONTHLY', true, NOW()),
  ('PREMIUM_RESUME_MONTHLY',    '서류 프리미엄 월정액', 14900, 'KRW', 'MONTHLY', true, NOW()),
  ('PREMIUM_ALL_MONTHLY',       '전체 프리미엄 월정액', 29900, 'KRW', 'MONTHLY', true, NOW());

-- ────────────────────────────────────────────
-- 데모용 구독 데이터 (testuser02 — 면접, testuser03 — 서류)
-- ────────────────────────────────────────────
DELETE FROM subscriptions WHERE member_id IN (
  SELECT member_id FROM members WHERE login_id IN ('testuser02', 'testuser03')
);

DO $$
DECLARE
  v_member02 UUID;
  v_member03 UUID;
  v_plan_interview BIGINT;
  v_plan_resume    BIGINT;
BEGIN
  SELECT member_id INTO v_member02 FROM members WHERE login_id = 'testuser02';
  SELECT member_id INTO v_member03 FROM members WHERE login_id = 'testuser03';
  SELECT plan_id INTO v_plan_interview FROM plans WHERE product_code = 'PREMIUM_INTERVIEW_MONTHLY';
  SELECT plan_id INTO v_plan_resume    FROM plans WHERE product_code = 'PREMIUM_RESUME_MONTHLY';

  INSERT INTO subscriptions (subscription_id, member_id, plan_id, subscription_status,
    started_at, current_period_start, current_period_end, next_billing_at, auto_renew, created_at, updated_at)
  VALUES
    (gen_random_uuid(), v_member02, v_plan_interview, 'ACTIVE',
     NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days',
     NOW() + INTERVAL '15 days', true, NOW() - INTERVAL '15 days', NOW()),
    (gen_random_uuid(), v_member03, v_plan_resume, 'ACTIVE',
     NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days',
     NOW() + INTERVAL '25 days', true, NOW() - INTERVAL '5 days', NOW());
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
  SELECT plan_id   INTO v_plan_id   FROM plans   WHERE product_code = 'PREMIUM_ALL_MONTHLY';

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
    amount, currency, payment_status, payment_method, approved_at, created_at)
  VALUES (v_pay_id, v_member_id, v_sub_id, v_plan_id,
    'DEMO-ORDER-001',
    'DEMO-TOSS-KEY-001',
    'DEMO-IDEM-001',
    29900, 'KRW', 'PAID', 'CARD', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days');

  INSERT INTO refunds (payment_id, amount, reason, refund_status, created_at)
  VALUES (v_pay_id, 29900, '서비스 불만족으로 인한 환불 요청', 'PENDING', NOW() - INTERVAL '1 day');
END $$;

-- 결과 확인
SELECT login_id, name, role_type, member_status, subscription_status FROM members ORDER BY login_id;
SELECT login_id, name, admin_role, status FROM admins;
SELECT plan_id, plan_name, plan_price FROM plans;
SELECT p.order_id, p.amount, p.payment_status, r.refund_status
  FROM payments p LEFT JOIN refunds r ON p.payment_id = r.payment_id
 WHERE p.order_id LIKE 'DEMO-%';
