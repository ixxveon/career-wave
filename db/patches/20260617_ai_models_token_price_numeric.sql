ALTER TABLE ai_models
    ALTER COLUMN input_token_price TYPE NUMERIC(12,6) USING input_token_price::NUMERIC(12,6),
    ALTER COLUMN output_token_price TYPE NUMERIC(12,6) USING output_token_price::NUMERIC(12,6);
