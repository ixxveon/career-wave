-- ============================================================
-- Add report_status column to interview_sessions (#1235)
-- 리포트 생성 중/완료/실패 상태를 totalScore null 단독 추론 대신
-- 명시적 컬럼으로 관리하기 위해 추가
-- 실행 방법: psql -U careerwave -d careerwave -f 20260713_interview_sessions_report_status.sql
-- ============================================================

ALTER TABLE interview_sessions
    ADD COLUMN IF NOT EXISTS report_status VARCHAR(20);

-- 기존 데이터 backfill:
--   totalScore IS NOT NULL → COMPLETED
--   sessionStatus = 'COMPLETED' AND totalScore IS NULL → FAILED (부분 콜백 수신됨)
--   그 외(IN_PROGRESS / FAILED 세션) → NULL 유지
UPDATE interview_sessions
SET report_status = CASE
    WHEN total_score IS NOT NULL THEN 'COMPLETED'
    WHEN session_status = 'COMPLETED' AND total_score IS NULL THEN 'FAILED'
    ELSE NULL
END
WHERE session_status IN ('COMPLETED');
