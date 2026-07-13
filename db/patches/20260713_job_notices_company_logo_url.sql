ALTER TABLE job_notices
    ADD COLUMN IF NOT EXISTS company_logo_url VARCHAR(500) NULL;

COMMENT ON COLUMN job_notices.company_logo_url
    IS '공고 게시 기업 로고 URL';
