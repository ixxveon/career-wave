-- Job notice keyword search optimization (#1265)
-- Run with psql outside a transaction because CREATE INDEX CONCURRENTLY
-- cannot run inside a transaction block.

CREATE EXTENSION IF NOT EXISTS "pg_trgm";

ALTER TABLE job_notices
    ADD COLUMN IF NOT EXISTS search_text TEXT;

COMMENT ON COLUMN job_notices.search_text
    IS 'Keyword search text generated from title, description, company, source, skill tags, and job category';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_notices_search_text_trgm
    ON job_notices USING gin (lower(search_text) gin_trgm_ops);
