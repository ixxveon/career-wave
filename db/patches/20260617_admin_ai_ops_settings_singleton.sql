-- Admin AI metrics singleton constraint patch.
-- Ensures ai_ops_settings always keeps a single row with id = 1.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'ai_ops_settings'
    ) THEN
        IF EXISTS (
            SELECT 1
            FROM ai_ops_settings
            WHERE ai_ops_setting_id <> 1
        ) OR (
            SELECT COUNT(*)
            FROM ai_ops_settings
        ) > 1 THEN
            RAISE EXCEPTION 'ai_ops_settings must contain at most one row with ai_ops_setting_id = 1 before applying this patch.';
        END IF;

        ALTER TABLE ai_ops_settings
            ALTER COLUMN ai_ops_setting_id SET DEFAULT 1;

        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'chk_ai_ops_singleton'
        ) THEN
            ALTER TABLE ai_ops_settings
                ADD CONSTRAINT chk_ai_ops_singleton CHECK (ai_ops_setting_id = 1);
        END IF;
    END IF;
END $$;
