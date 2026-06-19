-- Align AI metrics monetary columns with BigDecimal usage in the application.

ALTER TABLE ai_models
    ALTER COLUMN input_token_price TYPE NUMERIC(12,6) USING input_token_price::NUMERIC(12,6);

ALTER TABLE ai_models
    ALTER COLUMN output_token_price TYPE NUMERIC(12,6) USING output_token_price::NUMERIC(12,6);

ALTER TABLE ai_usage_logs
    ALTER COLUMN cost TYPE NUMERIC(15,2) USING cost::NUMERIC(15,2);

ALTER TABLE ai_ops_settings
    ALTER COLUMN monthly_budget TYPE NUMERIC(15,2) USING monthly_budget::NUMERIC(15,2);
