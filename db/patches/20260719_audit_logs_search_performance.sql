-- Audit log list query optimization (#805)
-- Run with psql outside a transaction because CREATE INDEX CONCURRENTLY
-- cannot run inside a transaction block.

CREATE EXTENSION IF NOT EXISTS "pg_trgm";

ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS search_text TEXT;

UPDATE audit_logs
SET search_text = concat_ws(' ', action, target_type, target_id, detail)
WHERE search_text IS NULL;

ALTER TABLE audit_logs
    ALTER COLUMN search_text SET NOT NULL;

COMMENT ON COLUMN audit_logs.search_text
    IS 'Keyword search text generated from action, target type, target ID, and detail';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_created_at
    ON audit_logs (created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_log_type_created_at
    ON audit_logs (log_type, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_severity_created_at
    ON audit_logs (severity, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_log_type_severity_created_at
    ON audit_logs (log_type, severity, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_search_text_trgm
    ON audit_logs USING gin (lower(search_text) gin_trgm_ops);
