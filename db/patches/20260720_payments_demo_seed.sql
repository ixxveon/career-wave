-- ================================================
-- 결제 내역 데모용 더미 데이터
-- subscriptions + payments + subscription_usage_periods + member_product_entitlements
-- 실행 전제: seed-local.sql + community 더미 (demouser01~08) 실행 완료 상태
-- ================================================

-- ────────────────────────────────────────────
-- 기존 더미 데이터 정리 (재실행 안전)
-- ────────────────────────────────────────────
DELETE FROM refunds
WHERE payment_id IN (
  SELECT payment_id FROM payments WHERE order_id LIKE 'DEMO2-%'
);
DELETE FROM payments WHERE order_id LIKE 'DEMO2-%';

DELETE FROM member_product_entitlements
WHERE member_id IN (
  SELECT member_id FROM members
  WHERE login_id IN (
    'demouser01','demouser02','demouser03','demouser04',
    'demouser05','demouser06','demouser07','demouser08'
  )
);

DELETE FROM subscription_usage_periods
WHERE subscription_id IN (
  SELECT subscription_id FROM subscriptions
  WHERE member_id IN (
    SELECT member_id FROM members
    WHERE login_id IN (
      'demouser01','demouser02','demouser03','demouser04',
      'demouser05','demouser06','demouser07','demouser08'
    )
  )
);

DELETE FROM subscriptions
WHERE member_id IN (
  SELECT member_id FROM members
  WHERE login_id IN (
    'demouser01','demouser02','demouser03','demouser04',
    'demouser05','demouser06','demouser07','demouser08'
  )
);

DO $$
DECLARE
  v_d01 UUID; v_d02 UUID; v_d03 UUID; v_d04 UUID;
  v_d05 UUID; v_d06 UUID; v_d07 UUID; v_d08 UUID;
  v_plan_iv  BIGINT;
  v_plan_doc BIGINT;

  -- subscription IDs
  s01 UUID := gen_random_uuid();  -- demouser01 면접 ACTIVE
  s02 UUID := gen_random_uuid();  -- demouser01 서류 ACTIVE
  s03 UUID := gen_random_uuid();  -- demouser03 면접 ACTIVE
  s04 UUID := gen_random_uuid();  -- demouser03 서류 ACTIVE
  s05 UUID := gen_random_uuid();  -- demouser05 면접 ACTIVE
  s06 UUID := gen_random_uuid();  -- demouser06 서류 ACTIVE
  s07 UUID := gen_random_uuid();  -- demouser08 면접 ACTIVE
  s08 UUID := gen_random_uuid();  -- demouser02 면접 CANCEL_SCHEDULED
  s09 UUID := gen_random_uuid();  -- demouser04 서류 CANCEL_SCHEDULED
  s10 UUID := gen_random_uuid();  -- demouser07 면접 REFUND_PENDING

  -- payment IDs
  p01 UUID := gen_random_uuid(); p02 UUID := gen_random_uuid();
  p03 UUID := gen_random_uuid(); p04 UUID := gen_random_uuid();
  p05 UUID := gen_random_uuid(); p06 UUID := gen_random_uuid();
  p07 UUID := gen_random_uuid(); p08 UUID := gen_random_uuid();
  p09 UUID := gen_random_uuid(); p10 UUID := gen_random_uuid();
  p11 UUID := gen_random_uuid(); p12 UUID := gen_random_uuid();
  p13 UUID := gen_random_uuid(); p14 UUID := gen_random_uuid();
  p15 UUID := gen_random_uuid();

BEGIN
  SELECT member_id INTO v_d01 FROM members WHERE login_id = 'demouser01';
  SELECT member_id INTO v_d02 FROM members WHERE login_id = 'demouser02';
  SELECT member_id INTO v_d03 FROM members WHERE login_id = 'demouser03';
  SELECT member_id INTO v_d04 FROM members WHERE login_id = 'demouser04';
  SELECT member_id INTO v_d05 FROM members WHERE login_id = 'demouser05';
  SELECT member_id INTO v_d06 FROM members WHERE login_id = 'demouser06';
  SELECT member_id INTO v_d07 FROM members WHERE login_id = 'demouser07';
  SELECT member_id INTO v_d08 FROM members WHERE login_id = 'demouser08';
  SELECT plan_id INTO v_plan_iv  FROM plans WHERE product_code = 'interview';
  SELECT plan_id INTO v_plan_doc FROM plans WHERE product_code = 'document-coaching';

  -- ════════════════════════════════════════════
  -- 구독 (subscriptions)
  -- ════════════════════════════════════════════
  INSERT INTO subscriptions (
    subscription_id, member_id, plan_id,
    subscription_status,
    started_at, current_period_start, current_period_end,
    next_billing_at, auto_renew, retry_count,
    created_at, updated_at
  ) VALUES
    -- demouser01: 면접 ACTIVE (4개월째)
    (s01, v_d01, v_plan_iv, 'ACTIVE',
     NOW() - INTERVAL '120 days',
     NOW() - INTERVAL '30 days', NOW() + INTERVAL '0 days',
     NOW(), true, 0,
     NOW() - INTERVAL '120 days', NOW()),

    -- demouser01: 서류 ACTIVE (2개월째)
    (s02, v_d01, v_plan_doc, 'ACTIVE',
     NOW() - INTERVAL '60 days',
     NOW() - INTERVAL '30 days', NOW() + INTERVAL '0 days',
     NOW(), true, 0,
     NOW() - INTERVAL '60 days', NOW()),

    -- demouser03: 면접 ACTIVE (2개월째)
    (s03, v_d03, v_plan_iv, 'ACTIVE',
     NOW() - INTERVAL '65 days',
     NOW() - INTERVAL '35 days', NOW() - INTERVAL '5 days',
     NOW() - INTERVAL '5 days', true, 0,
     NOW() - INTERVAL '65 days', NOW()),

    -- demouser03: 서류 ACTIVE
    (s04, v_d03, v_plan_doc, 'ACTIVE',
     NOW() - INTERVAL '35 days',
     NOW() - INTERVAL '35 days', NOW() - INTERVAL '5 days',
     NOW() - INTERVAL '5 days', true, 0,
     NOW() - INTERVAL '35 days', NOW()),

    -- demouser05: 면접 ACTIVE
    (s05, v_d05, v_plan_iv, 'ACTIVE',
     NOW() - INTERVAL '30 days',
     NOW() - INTERVAL '30 days', NOW() + INTERVAL '0 days',
     NOW(), true, 0,
     NOW() - INTERVAL '30 days', NOW()),

    -- demouser06: 서류 ACTIVE
    (s06, v_d06, v_plan_doc, 'ACTIVE',
     NOW() - INTERVAL '20 days',
     NOW() - INTERVAL '20 days', NOW() + INTERVAL '10 days',
     NOW() + INTERVAL '10 days', true, 0,
     NOW() - INTERVAL '20 days', NOW()),

    -- demouser08: 면접 ACTIVE
    (s07, v_d08, v_plan_iv, 'ACTIVE',
     NOW() - INTERVAL '10 days',
     NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days',
     NOW() + INTERVAL '20 days', true, 0,
     NOW() - INTERVAL '10 days', NOW()),

    -- demouser02: 면접 CANCEL_SCHEDULED (해지 예약)
    (s08, v_d02, v_plan_iv, 'CANCEL_SCHEDULED',
     NOW() - INTERVAL '60 days',
     NOW() - INTERVAL '30 days', NOW() + INTERVAL '0 days',
     NOW(), false, 0,
     NOW() - INTERVAL '60 days', NOW()),

    -- demouser04: 서류 CANCEL_SCHEDULED (해지 예약)
    (s09, v_d04, v_plan_doc, 'CANCEL_SCHEDULED',
     NOW() - INTERVAL '45 days',
     NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days',
     NOW() + INTERVAL '15 days', false, 0,
     NOW() - INTERVAL '45 days', NOW()),

    -- demouser07: 면접 REFUND_PENDING (환불 요청)
    (s10, v_d07, v_plan_iv, 'REFUND_PENDING',
     NOW() - INTERVAL '15 days',
     NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days',
     NOW() + INTERVAL '15 days', false, 0,
     NOW() - INTERVAL '15 days', NOW());

  -- ════════════════════════════════════════════
  -- 결제 내역 (payments) — 16건
  -- ════════════════════════════════════════════
  INSERT INTO payments (
    payment_id, member_id, subscription_id, plan_id,
    order_id, payment_key, idempotency_key,
    amount, currency,
    payment_status, payment_method, payment_type,
    attempt_sequence, approved_at, created_at, updated_at
  ) VALUES
    -- demouser01 면접 최초결제 (4개월 전)
    (p01, v_d01, s01, v_plan_iv,
     'DEMO2-IV-D01-001', 'DEMO2-TOSS-IV-D01-001', 'DEMO2-IDEM-IV-D01-001',
     29000, 'KRW', 'PAID', 'CARD', 'MANUAL',
     0, NOW() - INTERVAL '120 days', NOW() - INTERVAL '120 days', NOW() - INTERVAL '120 days'),

    -- demouser01 면접 자동갱신 (3개월 전)
    (p02, v_d01, s01, v_plan_iv,
     'DEMO2-IV-D01-002', 'DEMO2-TOSS-IV-D01-002', 'DEMO2-IDEM-IV-D01-002',
     29000, 'KRW', 'PAID', 'CARD', 'AUTO_RENEWAL',
     0, NOW() - INTERVAL '90 days', NOW() - INTERVAL '90 days', NOW() - INTERVAL '90 days'),

    -- demouser01 면접 자동갱신 (2개월 전)
    (p03, v_d01, s01, v_plan_iv,
     'DEMO2-IV-D01-003', 'DEMO2-TOSS-IV-D01-003', 'DEMO2-IDEM-IV-D01-003',
     29000, 'KRW', 'PAID', 'CARD', 'AUTO_RENEWAL',
     0, NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days'),

    -- demouser01 서류 최초결제 (2개월 전)
    (p04, v_d01, s02, v_plan_doc,
     'DEMO2-DOC-D01-001', 'DEMO2-TOSS-DOC-D01-001', 'DEMO2-IDEM-DOC-D01-001',
     29000, 'KRW', 'PAID', 'CARD', 'MANUAL',
     0, NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days'),

    -- demouser01 면접 자동갱신 (1개월 전)
    (p05, v_d01, s01, v_plan_iv,
     'DEMO2-IV-D01-004', 'DEMO2-TOSS-IV-D01-004', 'DEMO2-IDEM-IV-D01-004',
     29000, 'KRW', 'PAID', 'CARD', 'AUTO_RENEWAL',
     0, NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),

    -- demouser01 서류 자동갱신 (1개월 전)
    (p06, v_d01, s02, v_plan_doc,
     'DEMO2-DOC-D01-002', 'DEMO2-TOSS-DOC-D01-002', 'DEMO2-IDEM-DOC-D01-002',
     29000, 'KRW', 'PAID', 'CARD', 'AUTO_RENEWAL',
     0, NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),

    -- demouser02 면접 최초결제 (2개월 전)
    (p07, v_d02, s08, v_plan_iv,
     'DEMO2-IV-D02-001', 'DEMO2-TOSS-IV-D02-001', 'DEMO2-IDEM-IV-D02-001',
     29000, 'KRW', 'PAID', 'CARD', 'MANUAL',
     0, NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days'),

    -- demouser02 면접 자동갱신 (1개월 전, 해지 예약 상태)
    (p08, v_d02, s08, v_plan_iv,
     'DEMO2-IV-D02-002', 'DEMO2-TOSS-IV-D02-002', 'DEMO2-IDEM-IV-D02-002',
     29000, 'KRW', 'PAID', 'CARD', 'AUTO_RENEWAL',
     0, NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),

    -- demouser03 면접 최초결제 (2개월 전)
    (p09, v_d03, s03, v_plan_iv,
     'DEMO2-IV-D03-001', 'DEMO2-TOSS-IV-D03-001', 'DEMO2-IDEM-IV-D03-001',
     29000, 'KRW', 'PAID', 'CARD', 'MANUAL',
     0, NOW() - INTERVAL '65 days', NOW() - INTERVAL '65 days', NOW() - INTERVAL '65 days'),

    -- demouser03 면접 자동갱신 (35일 전)
    (p10, v_d03, s03, v_plan_iv,
     'DEMO2-IV-D03-002', 'DEMO2-TOSS-IV-D03-002', 'DEMO2-IDEM-IV-D03-002',
     29000, 'KRW', 'PAID', 'CARD', 'AUTO_RENEWAL',
     0, NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days'),

    -- demouser03 서류 최초결제 (35일 전)
    (p11, v_d03, s04, v_plan_doc,
     'DEMO2-DOC-D03-001', 'DEMO2-TOSS-DOC-D03-001', 'DEMO2-IDEM-DOC-D03-001',
     29000, 'KRW', 'PAID', 'CARD', 'MANUAL',
     0, NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days'),

    -- demouser04 서류 최초결제 (45일 전, 해지 예약 상태)
    (p12, v_d04, s09, v_plan_doc,
     'DEMO2-DOC-D04-001', 'DEMO2-TOSS-DOC-D04-001', 'DEMO2-IDEM-DOC-D04-001',
     29000, 'KRW', 'PAID', 'KAKAO_PAY', 'MANUAL',
     0, NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days'),

    -- demouser05 면접 최초결제 (1개월 전)
    (p13, v_d05, s05, v_plan_iv,
     'DEMO2-IV-D05-001', 'DEMO2-TOSS-IV-D05-001', 'DEMO2-IDEM-IV-D05-001',
     29000, 'KRW', 'PAID', 'NAVER_PAY', 'MANUAL',
     0, NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),

    -- demouser06 서류 최초결제 (20일 전)
    (p14, v_d06, s06, v_plan_doc,
     'DEMO2-DOC-D06-001', 'DEMO2-TOSS-DOC-D06-001', 'DEMO2-IDEM-DOC-D06-001',
     29000, 'KRW', 'PAID', 'CARD', 'MANUAL',
     0, NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),

    -- demouser07 면접 최초결제 (15일 전, 환불 요청 중)
    (p15, v_d07, s10, v_plan_iv,
     'DEMO2-IV-D07-001', 'DEMO2-TOSS-IV-D07-001', 'DEMO2-IDEM-IV-D07-001',
     29000, 'KRW', 'PAID', 'CARD', 'MANUAL',
     0, NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days');

  -- demouser08 면접 최초결제 (10일 전)
  INSERT INTO payments (
    payment_id, member_id, subscription_id, plan_id,
    order_id, payment_key, idempotency_key,
    amount, currency,
    payment_status, payment_method, payment_type,
    attempt_sequence, approved_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_d08, s07, v_plan_iv,
    'DEMO2-IV-D08-001', 'DEMO2-TOSS-IV-D08-001', 'DEMO2-IDEM-IV-D08-001',
    29000, 'KRW', 'PAID', 'CARD', 'MANUAL',
    0, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'
  );

  -- ════════════════════════════════════════════
  -- 환불 요청 (demouser07)
  -- ════════════════════════════════════════════
  INSERT INTO refunds (payment_id, amount, reason, refund_status, created_at)
  VALUES (p15, 29000, '서비스 불만족으로 인한 환불 요청', 'PENDING', NOW() - INTERVAL '3 days');

  -- ════════════════════════════════════════════
  -- 구독 사용 기간 (subscription_usage_periods)
  -- ════════════════════════════════════════════
  INSERT INTO subscription_usage_periods (
    usage_period_id, subscription_id, product_code,
    period_start, period_end,
    limit_count, used_count, reserved_count,
    created_at, updated_at
  ) VALUES
    (gen_random_uuid(), s01, 'interview',
     NOW() - INTERVAL '30 days', NOW(),
     20, 14, 0, NOW(), NOW()),
    (gen_random_uuid(), s02, 'document-coaching',
     NOW() - INTERVAL '30 days', NOW(),
     30, 22, 0, NOW(), NOW()),
    (gen_random_uuid(), s03, 'interview',
     NOW() - INTERVAL '35 days', NOW() - INTERVAL '5 days',
     20, 18, 0, NOW(), NOW()),
    (gen_random_uuid(), s04, 'document-coaching',
     NOW() - INTERVAL '35 days', NOW() - INTERVAL '5 days',
     30, 11, 0, NOW(), NOW()),
    (gen_random_uuid(), s05, 'interview',
     NOW() - INTERVAL '30 days', NOW(),
     20, 7, 0, NOW(), NOW()),
    (gen_random_uuid(), s06, 'document-coaching',
     NOW() - INTERVAL '20 days', NOW() + INTERVAL '10 days',
     30, 5, 0, NOW(), NOW()),
    (gen_random_uuid(), s07, 'interview',
     NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days',
     20, 3, 0, NOW(), NOW()),
    (gen_random_uuid(), s10, 'interview',
     NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days',
     20, 2, 0, NOW(), NOW());

  -- ════════════════════════════════════════════
  -- 구독 권한 (member_product_entitlements)
  -- ════════════════════════════════════════════
  INSERT INTO member_product_entitlements (
    entitlement_id, member_id, product_code,
    plan_type, free_remaining, free_usage_status,
    active_subscription_id, created_at, updated_at
  ) VALUES
    (gen_random_uuid(), v_d01, 'interview',         'PREMIUM', 0, 'FORFEITED', s01, NOW(), NOW()),
    (gen_random_uuid(), v_d01, 'document-coaching', 'PREMIUM', 0, 'FORFEITED', s02, NOW(), NOW()),
    (gen_random_uuid(), v_d02, 'interview',         'PREMIUM', 0, 'FORFEITED', s08, NOW(), NOW()),
    (gen_random_uuid(), v_d03, 'interview',         'PREMIUM', 0, 'FORFEITED', s03, NOW(), NOW()),
    (gen_random_uuid(), v_d03, 'document-coaching', 'PREMIUM', 0, 'FORFEITED', s04, NOW(), NOW()),
    (gen_random_uuid(), v_d04, 'document-coaching', 'PREMIUM', 0, 'FORFEITED', s09, NOW(), NOW()),
    (gen_random_uuid(), v_d05, 'interview',         'PREMIUM', 0, 'FORFEITED', s05, NOW(), NOW()),
    (gen_random_uuid(), v_d06, 'document-coaching', 'PREMIUM', 0, 'FORFEITED', s06, NOW(), NOW()),
    (gen_random_uuid(), v_d07, 'interview',         'PREMIUM', 0, 'FORFEITED', s10, NOW(), NOW()),
    (gen_random_uuid(), v_d08, 'interview',         'PREMIUM', 0, 'FORFEITED', s07, NOW(), NOW())
  ON CONFLICT (member_id, product_code) DO UPDATE SET
    plan_type              = EXCLUDED.plan_type,
    active_subscription_id = EXCLUDED.active_subscription_id,
    updated_at             = NOW();

END $$;

-- 결과 확인
SELECT payment_method, payment_type, COUNT(*) AS 건수, SUM(amount) AS 합계금액
FROM payments
WHERE order_id LIKE 'DEMO2-%'
GROUP BY payment_method, payment_type
ORDER BY payment_method, payment_type;

SELECT payment_status, COUNT(*) AS 건수
FROM payments
WHERE order_id LIKE 'DEMO2-%'
GROUP BY payment_status;
