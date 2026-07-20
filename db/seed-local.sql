-- ============================================================
-- Career Wave 로컬 개발용 테스트 데이터 시드
-- 실행 방법: psql -U careerwave -d careerwave -f seed-local.sql
-- 비밀번호: 모든 계정 공통 Test1234! (관리자만 1234)
-- testuser05: 정지 계정 테스트용 (SUSPENDED / 커뮤니티 운영정책 위반 / 7일)
-- ============================================================

-- 기존 테스트 데이터 초기화 (재실행 안전)
-- 결제/구독 자식 행 먼저 삭제 (FK 제약 위반 방지)
-- Keep members/admins and upsert them below because many tables can reference them.
-- Clean up only the child rows that this seed recreates.
DELETE FROM refunds
WHERE payment_id IN (
  SELECT payment_id FROM payments
  WHERE member_id IN (
    SELECT member_id FROM members WHERE login_id IN ('testuser01','testuser02','testuser03','testuser04','testuser05','testcompany01')
  )
  OR order_id LIKE 'DEMO-%'
);
DELETE FROM payments
WHERE member_id IN (
  SELECT member_id FROM members WHERE login_id IN ('testuser01','testuser02','testuser03','testuser04','testuser05','testcompany01')
)
OR order_id LIKE 'DEMO-%';
DELETE FROM member_product_entitlements
WHERE member_id IN (
  SELECT member_id FROM members WHERE login_id IN ('testuser01','testuser02','testuser03','testuser04','testuser05','testcompany01')
);
DELETE FROM subscription_usage_periods
WHERE subscription_id IN (
  SELECT subscription_id FROM subscriptions
  WHERE member_id IN (
    SELECT member_id FROM members WHERE login_id IN ('testuser01','testuser02','testuser03','testuser04','testuser05','testcompany01')
  )
);
DELETE FROM subscriptions
WHERE member_id IN (
  SELECT member_id FROM members WHERE login_id IN ('testuser01','testuser02','testuser03','testuser04','testuser05','testcompany01')
);
DELETE FROM suspend_histories
WHERE member_id IN (
  SELECT member_id FROM members WHERE login_id IN ('testuser01','testuser02','testuser03','testuser04','testuser05','testcompany01')
);
DELETE FROM notices WHERE title IN (
  '[필독] 개인정보 처리방침 개정 안내',
  '서버 정기 점검 안내 (6월 28일 새벽 2시~4시)',
  'AI 서류 분석 기능 개선 업데이트',
  '허위 정보 기재 관련 이용 제한 안내',
  '[이벤트] 친구 초대하고 AI 분석 1회 무료 이용권 받기'
);
DELETE FROM faqs WHERE question IN (
  '계정이 정지되었습니다. 어떻게 해야 하나요?',
  '계정 정지 이의 신청은 어떻게 하나요?',
  '구독 해지 후 환불은 어떻게 받나요?',
  'AI 면접 연습은 어떤 방식으로 진행되나요?',
  '회원 탈퇴 후 데이터는 어떻게 되나요?'
);

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
   'CS 담당자', 'CS', 'ACTIVE', NOW(), NOW())
ON CONFLICT (login_id) DO UPDATE SET
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  admin_role = EXCLUDED.admin_role,
  status = EXCLUDED.status,
  updated_at = NOW();

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
   '테스트유저(정지)', 'USER', 'SUSPENDED', 'FREE', 0, NOW(), NOW())
ON CONFLICT (login_id) DO UPDATE SET
  email = EXCLUDED.email,
  password = EXCLUDED.password,
  name = EXCLUDED.name,
  role_type = EXCLUDED.role_type,
  member_status = EXCLUDED.member_status,
  subscription_status = EXCLUDED.subscription_status,
  warning_count = EXCLUDED.warning_count,
  updated_at = NOW();

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
   '테스트기업담당자', 'COMPANY', 'ACTIVE', 'FREE', 0, NOW(), NOW())
ON CONFLICT (login_id) DO UPDATE SET
  email = EXCLUDED.email,
  password = EXCLUDED.password,
  name = EXCLUDED.name,
  role_type = EXCLUDED.role_type,
  member_status = EXCLUDED.member_status,
  subscription_status = EXCLUDED.subscription_status,
  warning_count = EXCLUDED.warning_count,
  updated_at = NOW();


-- ────────────────────────────────────────────
-- 구독 플랜 (데모용)
-- ────────────────────────────────────────────
INSERT INTO plans (
  product_code, plan_name, plan_price, monthly_usage_limit,
  currency, billing_cycle, is_active, created_at
)
VALUES
  ('interview',         'AI 모의면접',   29000, 20, 'KRW', 'MONTHLY', true, NOW()),
  ('document-coaching', '서류 AI 코칭', 29000, 30, 'KRW', 'MONTHLY', true, NOW())
ON CONFLICT (product_code) DO UPDATE SET
  plan_name = EXCLUDED.plan_name,
  plan_price = EXCLUDED.plan_price,
  monthly_usage_limit = EXCLUDED.monthly_usage_limit,
  currency = EXCLUDED.currency,
  billing_cycle = EXCLUDED.billing_cycle,
  is_active = EXCLUDED.is_active;

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
    started_at, current_period_start, current_period_end, next_billing_at, auto_renew, retry_count, created_at, updated_at)
  VALUES
    (v_sub_interview, v_member02, v_plan_interview, 'ACTIVE',
     NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days',
     NOW() + INTERVAL '15 days', true, 0, NOW() - INTERVAL '15 days', NOW()),
    (v_sub_resume, v_member03, v_plan_resume, 'ACTIVE',
     NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days',
     NOW() + INTERVAL '25 days', true, 0, NOW() - INTERVAL '5 days', NOW());

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
    started_at, current_period_start, current_period_end, next_billing_at, auto_renew, retry_count, created_at, updated_at)
  VALUES (v_sub_id, v_member_id, v_plan_id, 'REFUND_PENDING',
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '10 days',
    NOW() + INTERVAL '20 days',
    NOW() + INTERVAL '20 days',
    true, 0, NOW() - INTERVAL '10 days', NOW());

  INSERT INTO payments (payment_id, member_id, subscription_id, plan_id,
    order_id, payment_key, idempotency_key,
    payment_type, attempt_sequence, amount, currency, payment_status,
    payment_method, customer_name, customer_email, customer_key, product_code,
    approved_at, created_at, updated_at)
  VALUES (v_pay_id, v_member_id, v_sub_id, v_plan_id,
    'DEMO-ORDER-001',
    'DEMO-TOSS-KEY-001',
    'DEMO-IDEM-001',
    'MANUAL', 0, 29000, 'KRW', 'PAID', 'CARD',
    '테스트유저(전체구독)', 'testuser04@example.com', gen_random_uuid()::text, 'interview',
    NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', NOW());

  INSERT INTO refunds (payment_id, amount, reason, refund_status, created_at)
  VALUES (v_pay_id, 29000, '서비스 불만족으로 인한 환불 요청', 'PENDING', NOW() - INTERVAL '1 day');
END $$;

-- ============================================================
-- 공지사항 / FAQ 샘플 데이터
-- ============================================================

DELETE FROM faqs WHERE question IN (
  '계정이 정지되었습니다. 어떻게 해야 하나요?',
  '계정 정지 이의 신청은 어떻게 하나요?',
  '구독 해지 후 환불은 어떻게 받나요?',
  'AI 면접 연습은 어떤 방식으로 진행되나요?',
  '회원 탈퇴 후 데이터는 어떻게 되나요?'
);
DELETE FROM notices WHERE title IN (
  '[필독] 개인정보 처리방침 개정 안내',
  '서버 정기 점검 안내 (6월 28일 새벽 2시~4시)',
  'AI 서류 분석 기능 개선 업데이트',
  '허위 정보 기재 관련 이용 제한 안내',
  '[이벤트] 친구 초대하고 AI 분석 1회 무료 이용권 받기'
);

DO $$
DECLARE
  v_master_id BIGINT;
  v_cs_id     BIGINT;
BEGIN
  SELECT admin_id INTO v_master_id FROM admins WHERE login_id = 'admin';
  SELECT admin_id INTO v_cs_id     FROM admins WHERE login_id = 'cs';

  -- 공지사항 5개
  INSERT INTO notices (admin_id, category, title, content, is_pinned, is_visible, created_at, updated_at) VALUES
    (v_master_id, 'NOTICE',      '[필독] 개인정보 처리방침 개정 안내',
     '2026년 7월 1일부터 개인정보 처리방침이 일부 개정됩니다. 주요 변경 사항은 수집 항목 명확화 및 보유 기간 조정이며, 변경된 내용은 홈페이지에서 확인하실 수 있습니다.',
     TRUE, TRUE, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

    (v_master_id, 'MAINTENANCE', '서버 정기 점검 안내 (6월 28일 새벽 2시~4시)',
     '서비스 안정성 향상을 위한 정기 점검이 예정되어 있습니다. 점검 시간 동안 모든 서비스 이용이 일시 중단됩니다. 이용에 불편을 드려 죄송합니다.',
     TRUE, TRUE, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),

    (v_master_id, 'UPDATE',      'AI 서류 분석 기능 개선 업데이트',
     '이번 업데이트를 통해 AI 서류 분석의 정확도가 향상되었습니다. 직무 적합도 분석 항목이 추가되었으며, 피드백 레포트 가독성이 개선되었습니다.',
     FALSE, TRUE, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),

    (v_cs_id,     'NOTICE',      '허위 정보 기재 관련 이용 제한 안내',
     '허위 경력·학력 정보 기재 시 서비스 이용이 제한될 수 있습니다. 정확한 정보를 입력해 주시기 바랍니다. 반복 위반 시 영구 정지 처리됩니다.',
     FALSE, TRUE, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),

    (v_cs_id,     'EVENT',       '[이벤트] 친구 초대하고 AI 분석 1회 무료 이용권 받기',
     '친구를 초대하면 초대한 분과 초대받은 분 모두에게 AI 서류 분석 무료 이용권 1회가 지급됩니다. 이벤트 기간: 2026년 6월 1일 ~ 7월 31일',
     FALSE, TRUE, NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days');

  -- FAQ 5개 (계정 제재 항목 포함)
  INSERT INTO faqs (admin_id, category, question, answer, created_at, updated_at) VALUES
    (v_cs_id, 'ACCOUNT',
     '계정이 정지되었습니다. 어떻게 해야 하나요?',
     '계정 정지는 운영 정책 위반 시 적용됩니다. 정지 사유와 기간은 가입 시 등록한 이메일로 안내됩니다. 정지 기간 종료 후 자동으로 이용이 재개되며, 이의 신청은 cs@career-wave.com으로 문의해 주세요.',
     NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),

    (v_cs_id, 'ACCOUNT',
     '계정 정지 이의 신청은 어떻게 하나요?',
     '계정 정지에 이의가 있으신 경우 cs@career-wave.com으로 이메일 문의 또는 고객센터 1:1 문의를 통해 이의 신청을 하실 수 있습니다. 검토 후 3~5 영업일 내에 결과를 안내해 드립니다.',
     NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),

    (v_cs_id, 'PAYMENT',
     '구독 해지 후 환불은 어떻게 받나요?',
     '구독 해지 시 남은 기간에 대한 일할 계산 환불이 가능합니다. 마이페이지 > 구독 관리에서 해지 신청 후 영업일 기준 3~5일 내 환불 처리됩니다. AI 서비스를 1회 이상 이용하신 경우 환불 정책이 다를 수 있습니다.',
     NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),

    (v_master_id, 'SERVICE',
     'AI 면접 연습은 어떤 방식으로 진행되나요?',
     'AI 면접 연습은 카메라와 마이크를 활용한 실시간 영상 면접 방식으로 진행됩니다. 직무에 맞는 질문이 자동으로 출제되며, 답변 내용과 표정·말투 등을 분석해 피드백 리포트를 제공합니다.',
     NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),

    (v_master_id, 'ETC',
     '회원 탈퇴 후 데이터는 어떻게 되나요?',
     '회원 탈퇴 시 개인정보는 즉시 삭제되며, 관련 법령에 따라 일부 거래 정보는 일정 기간 보관 후 파기됩니다. 탈퇴 후에는 동일 아이디로 재가입이 불가하오니 신중하게 결정해 주세요.',
     NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days');

END $$;

-- 결과 확인
SELECT login_id, name, role_type, member_status, subscription_status FROM members ORDER BY login_id;
SELECT login_id, name, admin_role, status FROM admins;
SELECT plan_id, plan_name, plan_price FROM plans;
SELECT p.order_id, p.amount, p.payment_status, r.refund_status
  FROM payments p LEFT JOIN refunds r ON p.payment_id = r.payment_id
 WHERE p.order_id LIKE 'DEMO-%';
SELECT category, title FROM notices ORDER BY created_at DESC;
SELECT category, question FROM faqs ORDER BY created_at DESC;
