from functools import lru_cache
from urllib.parse import quote

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class AiMetricsSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    db_host: str = Field(default="localhost", alias="DB_HOST")
    db_port: int = Field(default=5432, alias="DB_PORT")
    db_name: str = Field(default="careerwave", alias="DB_NAME")
    db_username: str = Field(default="careerwave", alias="DB_USERNAME")
    db_password: str = Field(default="", alias="DB_PASSWORD")

    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    openai_model_light: str = Field(default="gpt-4o-mini", alias="OPENAI_MODEL_LIGHT")
    openai_model_deep: str = Field(default="gpt-4o", alias="OPENAI_MODEL_DEEP")
    openai_embedding_model: str = Field(
        default="text-embedding-3-small",
        alias="OPENAI_EMBEDDING_MODEL",
    )
    rag_chunk_target_chars: int = Field(
        default=1200,
        alias="RAG_CHUNK_TARGET_CHARS",
    )
    rag_chunk_max_chars: int = Field(
        default=1500,
        alias="RAG_CHUNK_MAX_CHARS",
    )

    file_storage_provider: str = Field(default="local", alias="FILE_STORAGE_PROVIDER")
    file_storage_base_path: str = Field(
        default="./storage/rag-documents",
        alias="FILE_STORAGE_BASE_PATH",
    )
    aws_access_key_id: str = Field(default="", alias="AWS_ACCESS_KEY_ID")
    aws_secret_access_key: str = Field(default="", alias="AWS_SECRET_ACCESS_KEY")
    aws_region: str = Field(default="ap-northeast-2", alias="AWS_REGION")
    aws_s3_endpoint: str = Field(default="", alias="AWS_S3_ENDPOINT")
    aws_s3_force_path_style: bool = Field(default=True, alias="AWS_S3_FORCE_PATH_STYLE")
    aws_s3_bucket: str = Field(
        default="",
        validation_alias=AliasChoices("AWS_S3_BUCKET", "AWS_S3_BUCKET_NAME"),
        alias="AWS_S3_BUCKET",
    )

    vector_store_provider: str = Field(default="mock", alias="VECTOR_STORE_PROVIDER")
    vector_store_collection: str = Field(
        default="admin_ai_metrics_rag_documents",
        alias="VECTOR_STORE_COLLECTION",
    )
    vector_store_base_path: str = Field(
        default="./storage/vector-store",
        alias="VECTOR_STORE_BASE_PATH",
    )

    discord_webhook_url: str = Field(default="", alias="DISCORD_WEBHOOK_URL")
    discord_webhook_timeout_seconds: float = Field(
        default=3.0,
        alias="DISCORD_WEBHOOK_TIMEOUT_SECONDS",
    )

    @property
    def database_url(self) -> str:
        username = quote(self.db_username, safe="")
        password = quote(self.db_password, safe="")
        return f"postgresql://{username}:{password}@{self.db_host}:{self.db_port}/{self.db_name}"


@lru_cache
def get_ai_metrics_settings() -> AiMetricsSettings:
    return AiMetricsSettings()
