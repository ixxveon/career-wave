-- #1328: retain legacy values only until scraped notices are deleted and re-collected.

ALTER TABLE job_notices
    ALTER COLUMN career_level TYPE VARCHAR(20);

ALTER TABLE job_notices
    DROP CONSTRAINT IF EXISTS chk_job_type,
    DROP CONSTRAINT IF EXISTS chk_company_size,
    DROP CONSTRAINT IF EXISTS chk_career_level;

ALTER TABLE job_notices
    ADD CONSTRAINT chk_job_type CHECK (
        job_type IN ('FULLTIME', 'FULL_TIME', 'INTERN', 'CONTRACT', 'FREELANCE', 'DAILY')
    ),
    ADD CONSTRAINT chk_company_size CHECK (
        company_size IN ('STARTUP', 'SME', 'MID_MARKET', 'LARGE', 'PUBLIC', 'UNICORN', 'FOREIGN')
    ),
    ADD CONSTRAINT chk_career_level CHECK (
        career_level IN (
            'JUNIOR', 'SENIOR', 'ANY',
            'FRESHER', 'ANY_EXPERIENCE', 'INTERN', 'UNDER_1',
            'OVER_1', 'OVER_2', 'OVER_3', 'OVER_5', 'OVER_7', 'OVER_10'
        )
    );

COMMENT ON COLUMN job_notices.job_type IS '표준 채용 유형 코드. 레거시 FULLTIME은 재수집 전 호환용이다.';
COMMENT ON COLUMN job_notices.company_size IS '표준 기업 규모 코드.';
COMMENT ON COLUMN job_notices.career_level IS '표준 경력 조건 코드. 레거시 JUNIOR/SENIOR/ANY는 재수집 전 호환용이다.';
