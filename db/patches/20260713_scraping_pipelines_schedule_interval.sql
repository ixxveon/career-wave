-- Per-source automatic scraping interval (#1154)

ALTER TABLE scraping_pipelines
    ADD COLUMN IF NOT EXISTS schedule_interval_minutes INTEGER;

UPDATE scraping_pipelines
SET schedule_interval_minutes = 360
WHERE schedule_interval_minutes IS NULL;

ALTER TABLE scraping_pipelines
    ALTER COLUMN schedule_interval_minutes SET DEFAULT 360,
    ALTER COLUMN schedule_interval_minutes SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_pipeline_schedule_interval'
    ) THEN
        ALTER TABLE scraping_pipelines
            ADD CONSTRAINT chk_pipeline_schedule_interval
            CHECK (schedule_interval_minutes > 0);
    END IF;
END $$;

COMMENT ON COLUMN scraping_pipelines.schedule_interval_minutes
    IS 'Automatic scraping interval in minutes (default: 360)';
