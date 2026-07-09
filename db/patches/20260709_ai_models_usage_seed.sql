-- Seed missing OpenAI model rows required by AI usage log persistence.
-- Existing deployments may only have gpt-4o-mini, while usage logs also record
-- gpt-4o, whisper-1, and tts-1 model names.

INSERT INTO ai_models (
    model_name,
    display_type,
    provider,
    input_token_price,
    output_token_price,
    is_enabled
)
SELECT
    seed.model_name,
    seed.display_type,
    seed.provider,
    seed.input_token_price,
    seed.output_token_price,
    seed.is_enabled
FROM (
    VALUES
        ('gpt-4o', 'GPT-4o', 'OPENAI', 2.500000::NUMERIC(12,6), 10.000000::NUMERIC(12,6), TRUE),
        ('whisper-1', 'Whisper-1', 'OPENAI', 0.000000::NUMERIC(12,6), 0.000000::NUMERIC(12,6), TRUE),
        ('tts-1', 'TTS-1', 'OPENAI', 0.000000::NUMERIC(12,6), 0.000000::NUMERIC(12,6), TRUE)
) AS seed(model_name, display_type, provider, input_token_price, output_token_price, is_enabled)
WHERE NOT EXISTS (
    SELECT 1
    FROM ai_models
    WHERE ai_models.model_name = seed.model_name
);
