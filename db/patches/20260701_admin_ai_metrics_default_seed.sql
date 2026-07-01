-- Seed default AI Metrics reference data for existing databases.
-- Adds a default AI model and singleton ops setting only when missing.

DO $$
DECLARE
    default_model_id BIGINT;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = current_schema()
          AND table_name = 'ai_models'
    ) OR NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = current_schema()
          AND table_name = 'ai_ops_settings'
    ) THEN
        RETURN;
    END IF;

    INSERT INTO ai_models (
        model_name,
        display_type,
        provider,
        input_token_price,
        output_token_price,
        is_enabled
    )
    SELECT
        'gpt-4o-mini',
        'GPT-4o Mini',
        'OPENAI',
        0.150000,
        0.600000,
        TRUE
    WHERE NOT EXISTS (
        SELECT 1
        FROM ai_models
        WHERE model_name = 'gpt-4o-mini'
    );

    SELECT ai_model_id
    INTO default_model_id
    FROM ai_models
    WHERE model_name = 'gpt-4o-mini'
    ORDER BY ai_model_id
    LIMIT 1;

    IF default_model_id IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM ai_ops_settings
           WHERE ai_ops_setting_id = 1
       ) THEN
        INSERT INTO ai_ops_settings (
            ai_ops_setting_id,
            selected_model_id,
            monthly_budget,
            alert_enabled,
            alert_channel,
            alert_threshold,
            rate_limit_enabled
        )
        VALUES (
            1,
            default_model_id,
            3000000.00,
            TRUE,
            'DISCORD',
            85,
            FALSE
        );
    END IF;
END $$;
