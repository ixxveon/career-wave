from admin.ai_metrics.config.settings import AiMetricsSettings


def test_database_url_is_built_from_shared_db_env_values():
    settings = AiMetricsSettings(
        DB_HOST="postgres.internal",
        DB_PORT=5432,
        DB_NAME="career_wave",
        DB_USERNAME="career_user",
        DB_PASSWORD="secret",
    )

    assert settings.database_url == "postgresql://career_user:secret@postgres.internal:5432/career_wave"


def test_database_url_escapes_credentials():
    settings = AiMetricsSettings(
        DB_HOST="postgres.internal",
        DB_PORT=5432,
        DB_NAME="career_wave",
        DB_USERNAME="career@user",
        DB_PASSWORD="p@ss/w:rd",
    )

    assert settings.database_url == "postgresql://career%40user:p%40ss%2Fw%3Ard@postgres.internal:5432/career_wave"


def test_discord_webhook_defaults_to_disabled():
    settings = AiMetricsSettings()

    assert settings.discord_webhook_url == ""
    assert settings.discord_webhook_timeout_seconds == 3.0
