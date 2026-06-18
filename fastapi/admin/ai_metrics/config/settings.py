from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class AiMetricsSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    database_url: str = Field(
        default="postgresql://careerwave:@localhost:5432/careerwave",
        alias="DATABASE_URL",
    )

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
    aws_s3_bucket: str = Field(default="", alias="AWS_S3_BUCKET")

    vector_store_provider: str = Field(default="mock", alias="VECTOR_STORE_PROVIDER")
    vector_store_collection: str = Field(
        default="admin_ai_metrics_rag_documents",
        alias="VECTOR_STORE_COLLECTION",
    )
    vector_store_base_path: str = Field(
        default="./storage/vector-store",
        alias="VECTOR_STORE_BASE_PATH",
    )


@lru_cache
def get_ai_metrics_settings() -> AiMetricsSettings:
    return AiMetricsSettings()
