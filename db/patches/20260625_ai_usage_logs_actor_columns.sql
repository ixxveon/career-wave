-- Extend ai_usage_logs so usage can belong to either a user or an admin actor.

ALTER TABLE ai_usage_logs
    ADD COLUMN admin_id BIGINT NULL;

ALTER TABLE ai_usage_logs
    ALTER COLUMN member_id DROP NOT NULL;

ALTER TABLE ai_usage_logs
    ADD CONSTRAINT fk_ai_usage_admin
        FOREIGN KEY (admin_id) REFERENCES admins (admin_id);

ALTER TABLE ai_usage_logs
    DROP CONSTRAINT chk_ai_usage_feature;

ALTER TABLE ai_usage_logs
    ADD CONSTRAINT chk_ai_usage_feature
        CHECK (feature_type IN ('DOCUMENT', 'INTERVIEW', 'ADMIN_CS', 'ADMIN_REPORT'));

ALTER TABLE ai_usage_logs
    ADD CONSTRAINT chk_ai_usage_actor
        CHECK (
            (member_id IS NOT NULL AND admin_id IS NULL)
            OR
            (member_id IS NULL AND admin_id IS NOT NULL)
        );

COMMENT ON COLUMN ai_usage_logs.admin_id IS 'Admin actor FK';
COMMENT ON COLUMN ai_usage_logs.feature_type IS 'Feature type (DOCUMENT / INTERVIEW / ADMIN_CS / ADMIN_REPORT)';
