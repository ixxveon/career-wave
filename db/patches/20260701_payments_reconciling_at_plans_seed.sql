-- ================================================
-- patch: payments.reconciling_at 컬럼 추가 및 plans 기본 상품 데이터 삽입
-- issue: #943
-- date:  2026-07-01
-- ================================================

-- 1. payments 테이블에 reconciling_at 컬럼 추가
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS reconciling_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN payments.reconciling_at IS '결제 결과 불확실 시 대사 처리 시작 일시 (RECONCILING 상태 진입 시각)';

-- 2. plans 기본 상품 데이터 삽입 (없는 경우에만 추가, 있으면 갱신)
INSERT INTO plans (product_code, plan_name, plan_price, monthly_usage_limit, currency, billing_cycle, is_active, created_at, updated_at)
VALUES
    ('interview',         'AI 모의면접',  29000, 20, 'KRW', 'MONTHLY', TRUE, NOW(), NOW()),
    ('document-coaching', '서류 AI 코칭', 29000, 30, 'KRW', 'MONTHLY', TRUE, NOW(), NOW())
ON CONFLICT (product_code) DO UPDATE SET
    plan_name             = EXCLUDED.plan_name,
    plan_price            = EXCLUDED.plan_price,
    monthly_usage_limit   = EXCLUDED.monthly_usage_limit,
    currency              = EXCLUDED.currency,
    billing_cycle         = EXCLUDED.billing_cycle,
    is_active             = EXCLUDED.is_active,
    updated_at            = NOW();
