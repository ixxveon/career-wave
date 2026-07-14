-- Hierarchical job notice filters (#1280): retain normalized experience ranges.

ALTER TABLE job_notices
    ADD COLUMN IF NOT EXISTS career_min_years INTEGER NULL,
    ADD COLUMN IF NOT EXISTS career_max_years INTEGER NULL;

ALTER TABLE job_notices
    DROP CONSTRAINT IF EXISTS chk_career_year_range,
    DROP CONSTRAINT IF EXISTS chk_career_year_bounds;

ALTER TABLE job_notices
    ADD CONSTRAINT chk_career_year_range
        CHECK (career_min_years IS NULL OR career_min_years >= 0),
    ADD CONSTRAINT chk_career_year_bounds
        CHECK (career_max_years IS NULL OR career_max_years >= career_min_years);

COMMENT ON COLUMN job_notices.career_min_years IS '경력 최소 연차 (NULL이면 명시되지 않음)';
COMMENT ON COLUMN job_notices.career_max_years IS '경력 최대 연차 (NULL이면 상한 없음 또는 명시되지 않음)';
