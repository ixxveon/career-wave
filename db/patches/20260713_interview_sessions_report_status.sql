-- Add report_status column to interview_sessions (#1235)
-- Run once against the shared Career Wave database.

ALTER TABLE interview_sessions
    ADD COLUMN IF NOT EXISTS report_status VARCHAR(20);

-- Backfill completed sessions with a deterministic report status.
UPDATE interview_sessions
SET report_status = CASE
    WHEN total_score IS NOT NULL THEN 'COMPLETED'
    WHEN session_status = 'COMPLETED' AND total_score IS NULL THEN 'FAILED'
    ELSE NULL
END
WHERE session_status IN ('COMPLETED');
