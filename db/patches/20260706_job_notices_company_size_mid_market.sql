ALTER TABLE job_notices
    DROP CONSTRAINT IF EXISTS chk_company_size;

ALTER TABLE job_notices
    ADD CONSTRAINT chk_company_size
        CHECK (company_size IN ('STARTUP', 'SME', 'MID_MARKET', 'LARGE'));

COMMENT ON COLUMN job_notices.company_size IS '기업 규모 (STARTUP / SME / MID_MARKET / LARGE)';
