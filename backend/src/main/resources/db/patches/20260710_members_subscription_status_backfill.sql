-- ============================================================
-- Backfill: 기존 ACTIVE/CANCEL_SCHEDULED 구독 회원 → PREMIUM 동기화
-- 배경: members.subscription_status가 초기 FREE 이후 갱신되지 않아
--       유효 구독 회원이 관리자 화면에서 FREE로 표시되는 문제(#1174)
-- 실행 방법: psql -U careerwave -d careerwave -f 20260710_members_subscription_status_backfill.sql
-- 멱등성: 이미 PREMIUM인 회원은 WHERE 조건으로 제외되어 중복 실행 안전
-- ============================================================

BEGIN;

UPDATE members
SET subscription_status = 'PREMIUM',
    updated_at           = NOW()
WHERE member_id IN (
    SELECT DISTINCT member_id
    FROM subscriptions
    WHERE subscription_status IN ('ACTIVE', 'CANCEL_SCHEDULED')
)
  AND subscription_status != 'PREMIUM';

COMMIT;
