-- ============================================================
-- Phase 2 Backfill: 기존 USER 회원에 FREE 이용권 생성
-- 실행 방법: psql -U careerwave -d careerwave -f 20260622_member_entitlement_backfill.sql
-- 중복 방지: ON CONFLICT (member_id, product_code) DO NOTHING
-- ============================================================

BEGIN;

INSERT INTO member_product_entitlements (
    entitlement_id,
    member_id,
    product_code,
    plan_type,
    free_remaining,
    free_usage_status,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid(),
    m.member_id,
    p.product_code,
    'FREE',
    1,
    'AVAILABLE',
    NOW(),
    NOW()
FROM members m
         CROSS JOIN (VALUES ('document-coaching'), ('interview')) AS p(product_code)
WHERE m.role_type = 'USER'
ON CONFLICT (member_id, product_code) DO NOTHING;

COMMIT;
