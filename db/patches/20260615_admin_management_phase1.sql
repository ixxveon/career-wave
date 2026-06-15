-- Admin management Phase 1 schema patch.
-- Apply this to existing local PostgreSQL databases created before the
-- adminManagement entity schema was introduced.

ALTER TABLE admins
    ADD COLUMN IF NOT EXISTS email VARCHAR(255);

UPDATE admins
SET email = login_id || '@career-wave.local'
WHERE email IS NULL;

ALTER TABLE admins
    ALTER COLUMN email SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_admins_email ON admins (email);

ALTER TABLE audit_logs
    ALTER COLUMN target_id TYPE VARCHAR(100) USING target_id::VARCHAR(100),
    ALTER COLUMN target_id DROP NOT NULL;
