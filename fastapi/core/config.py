from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Spring 연동
    spring_base_url: str = "http://localhost:8080"
    webhook_secret: str = ""

    # OpenAI
    openai_api_key: str = ""
    openai_model_light: str = "gpt-4o-mini"
    openai_model_deep: str = "gpt-4o"

    # AWS S3
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "ap-northeast-2"
    aws_s3_bucket: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
