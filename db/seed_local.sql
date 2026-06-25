-- ================================================
-- 로컬 개발·테스트용 Seed 데이터
-- init.sql 실행 후 별도로 실행한다.
-- 비밀번호: Test1234! (BCrypt rounds=12)
-- ================================================

-- plans
INSERT INTO plans (product_code, plan_name, plan_price, monthly_usage_limit, currency, billing_cycle)
VALUES
    ('document-coaching', '서류 AI 코칭 PREMIUM', 9900,  30, 'KRW', 'MONTHLY'),
    ('interview',         'AI 면접 PREMIUM',       9900,  20, 'KRW', 'MONTHLY')
ON CONFLICT (product_code) DO NOTHING;

-- members
-- testuser01: FREE / testuser02: PREMIUM(면접) / testuser03: PREMIUM(서류)
-- testuser04: PREMIUM(전체) / testuser05: SUSPENDED
INSERT INTO members (member_id, login_id, email, password, name, role_type, member_status, subscription_status)
VALUES
    ('aaaaaaaa-0001-0001-0001-000000000001', 'testuser01', 'testuser01@careerwave.test', '$2b$12$8MqNOftEy6rMJIwO9YjL5.IT3U3/71kRcDSVf0zT5hgOA7FKBKwjq', '테스트유저01', 'USER', 'ACTIVE',    'FREE'),
    ('aaaaaaaa-0002-0002-0002-000000000002', 'testuser02', 'testuser02@careerwave.test', '$2b$12$8MqNOftEy6rMJIwO9YjL5.IT3U3/71kRcDSVf0zT5hgOA7FKBKwjq', '테스트유저02', 'USER', 'ACTIVE',    'PREMIUM'),
    ('aaaaaaaa-0003-0003-0003-000000000003', 'testuser03', 'testuser03@careerwave.test', '$2b$12$8MqNOftEy6rMJIwO9YjL5.IT3U3/71kRcDSVf0zT5hgOA7FKBKwjq', '테스트유저03', 'USER', 'ACTIVE',    'PREMIUM'),
    ('aaaaaaaa-0004-0004-0004-000000000004', 'testuser04', 'testuser04@careerwave.test', '$2b$12$8MqNOftEy6rMJIwO9YjL5.IT3U3/71kRcDSVf0zT5hgOA7FKBKwjq', '테스트유저04', 'USER', 'ACTIVE',    'PREMIUM'),
    ('aaaaaaaa-0005-0005-0005-000000000005', 'testuser05', 'testuser05@careerwave.test', '$2b$12$8MqNOftEy6rMJIwO9YjL5.IT3U3/71kRcDSVf0zT5hgOA7FKBKwjq', '테스트유저05', 'USER', 'SUSPENDED', 'FREE')
ON CONFLICT (login_id) DO NOTHING;

-- subscriptions (testuser02: 면접 PREMIUM, testuser03: 서류 PREMIUM, testuser04: 전체 PREMIUM)
INSERT INTO subscriptions (subscription_id, member_id, plan_id, subscription_status, started_at, current_period_start, current_period_end, auto_renew)
VALUES
    ('bbbbbbbb-0002-0002-0002-000000000001', 'aaaaaaaa-0002-0002-0002-000000000002', (SELECT plan_id FROM plans WHERE product_code = 'interview'),         'ACTIVE', NOW(), NOW(), NOW() + INTERVAL '1 month', TRUE),
    ('bbbbbbbb-0003-0003-0003-000000000001', 'aaaaaaaa-0003-0003-0003-000000000003', (SELECT plan_id FROM plans WHERE product_code = 'document-coaching'), 'ACTIVE', NOW(), NOW(), NOW() + INTERVAL '1 month', TRUE),
    ('bbbbbbbb-0004-0004-0004-000000000001', 'aaaaaaaa-0004-0004-0004-000000000004', (SELECT plan_id FROM plans WHERE product_code = 'interview'),         'ACTIVE', NOW(), NOW(), NOW() + INTERVAL '1 month', TRUE),
    ('bbbbbbbb-0004-0004-0004-000000000002', 'aaaaaaaa-0004-0004-0004-000000000004', (SELECT plan_id FROM plans WHERE product_code = 'document-coaching'), 'ACTIVE', NOW(), NOW(), NOW() + INTERVAL '1 month', TRUE)
ON CONFLICT DO NOTHING;

-- member_product_entitlements
INSERT INTO member_product_entitlements (member_id, product_code, plan_type, free_remaining, free_usage_status, active_subscription_id)
VALUES
    -- testuser01: FREE (무료 이용권 각 1회)
    ('aaaaaaaa-0001-0001-0001-000000000001', 'document-coaching', 'FREE',    1, 'AVAILABLE', NULL),
    ('aaaaaaaa-0001-0001-0001-000000000001', 'interview',         'FREE',    1, 'AVAILABLE', NULL),
    -- testuser02: 면접 PREMIUM
    ('aaaaaaaa-0002-0002-0002-000000000002', 'interview',         'PREMIUM', 0, 'USED',      'bbbbbbbb-0002-0002-0002-000000000001'),
    ('aaaaaaaa-0002-0002-0002-000000000002', 'document-coaching', 'FREE',    1, 'AVAILABLE', NULL),
    -- testuser03: 서류 PREMIUM
    ('aaaaaaaa-0003-0003-0003-000000000003', 'document-coaching', 'PREMIUM', 0, 'USED',      'bbbbbbbb-0003-0003-0003-000000000001'),
    ('aaaaaaaa-0003-0003-0003-000000000003', 'interview',         'FREE',    1, 'AVAILABLE', NULL),
    -- testuser04: 전체 PREMIUM
    ('aaaaaaaa-0004-0004-0004-000000000004', 'interview',         'PREMIUM', 0, 'USED',      'bbbbbbbb-0004-0004-0004-000000000001'),
    ('aaaaaaaa-0004-0004-0004-000000000004', 'document-coaching', 'PREMIUM', 0, 'USED',      'bbbbbbbb-0004-0004-0004-000000000002'),
    -- testuser05: SUSPENDED FREE
    ('aaaaaaaa-0005-0005-0005-000000000005', 'document-coaching', 'FREE',    1, 'AVAILABLE', NULL),
    ('aaaaaaaa-0005-0005-0005-000000000005', 'interview',         'FREE',    1, 'AVAILABLE', NULL)
ON CONFLICT (member_id, product_code) DO NOTHING;
