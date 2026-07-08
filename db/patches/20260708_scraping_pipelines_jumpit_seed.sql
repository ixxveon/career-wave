INSERT INTO scraping_pipelines (
    source_name,
    display_name,
    pipeline_status,
    is_enabled
)
VALUES
    ('jumpit', 'Jumpit', 'IDLE', TRUE)
ON CONFLICT (source_name) DO UPDATE
SET
    display_name = EXCLUDED.display_name,
    is_enabled = EXCLUDED.is_enabled,
    updated_at = NOW();
