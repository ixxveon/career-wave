-- Backfill subscription_status for existing subscribed members (#1174)
-- Run once against the shared Career Wave database.
-- The WHERE clause keeps the patch idempotent.

BEGIN;

UPDATE members
SET subscription_status = 'PREMIUM',
    updated_at = NOW()
WHERE member_id IN (
    SELECT DISTINCT member_id
    FROM subscriptions
    WHERE subscription_status IN ('ACTIVE', 'CANCEL_SCHEDULED')
)
  AND subscription_status != 'PREMIUM';

COMMIT;
