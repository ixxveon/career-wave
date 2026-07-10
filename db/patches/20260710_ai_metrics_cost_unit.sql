-- Store AI usage costs in USD and preserve sub-cent precision.
-- Model prices use their explicit pricing_unit so token, second, and character billing remain distinct.

ALTER TABLE ai_models
    ADD COLUMN IF NOT EXISTS pricing_unit VARCHAR(30) NOT NULL DEFAULT 'PER_MILLION_TOKENS';

UPDATE ai_models
SET pricing_unit = CASE model_name
    WHEN 'whisper-1' THEN 'PER_SECOND'
    WHEN 'tts-1' THEN 'PER_CHARACTER'
    ELSE 'PER_MILLION_TOKENS'
END;

ALTER TABLE ai_models
    DROP CONSTRAINT IF EXISTS chk_ai_model_pricing_unit;

ALTER TABLE ai_models
    ADD CONSTRAINT chk_ai_model_pricing_unit CHECK (
        pricing_unit IN ('PER_MILLION_TOKENS', 'PER_SECOND', 'PER_CHARACTER')
    );

ALTER TABLE ai_usage_logs
    ALTER COLUMN cost TYPE NUMERIC(15,6) USING cost::NUMERIC(15,6);

ALTER TABLE ai_ops_settings
    ADD COLUMN IF NOT EXISTS budget_currency CHAR(3) NOT NULL DEFAULT 'KRW';

UPDATE ai_ops_settings
SET monthly_budget = ROUND(monthly_budget / 1400, 2),
    budget_currency = 'USD'
WHERE budget_currency = 'KRW';

ALTER TABLE ai_ops_settings
    DROP CONSTRAINT IF EXISTS chk_budget_currency;

ALTER TABLE ai_ops_settings
    ADD CONSTRAINT chk_budget_currency CHECK (budget_currency = 'USD');

COMMENT ON COLUMN ai_models.input_token_price IS '입력 사용량 단가 (pricing_unit 기준, USD)';
COMMENT ON COLUMN ai_models.output_token_price IS '출력 사용량 단가 (pricing_unit 기준, USD)';
COMMENT ON COLUMN ai_models.pricing_unit IS '단가 기준 (PER_MILLION_TOKENS / PER_SECOND / PER_CHARACTER)';
COMMENT ON COLUMN ai_usage_logs.cost IS '소모 비용 (USD 단위)';
COMMENT ON COLUMN ai_ops_settings.monthly_budget IS '월간 AI API 예산 (USD 단위)';
COMMENT ON COLUMN ai_ops_settings.budget_currency IS '월간 AI API 예산 통화 (USD 고정)';

-- Historical ai_usage_logs.cost values are intentionally not transformed here.
-- Recalculate only after validating each existing model's pricing_unit and usage-unit history.
