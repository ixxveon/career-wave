from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Spring 연동
    spring_base_url: str = "http://localhost:8080"
    webhook_secret: str = ""
    ai_metrics_internal_base_url: str = "http://localhost:8000/internal/admin/ai-metrics"
    ai_metrics_internal_secret: str = ""
    ai_usage_log_timeout_seconds: float = 2.0

    # JWT (Spring 공유 시크릿 — FastAPI WebSocket 토큰 검증용)
    jwt_secret: str = ""

    # OpenAI — 공용
    openai_api_key: str = ""
    openai_model_light: str = "gpt-4o-mini"
    openai_model_deep: str = "gpt-4o"

    # OpenAI — 면접 전용
    openai_model_interview: str = "gpt-4o"
    openai_model_stt: str = "whisper-1"
    openai_model_tts: str = "tts-1"
    openai_tts_voice: str = "alloy"
    openai_llm_timeout_seconds: int = 10

    # 면접 파이프라인 임계값
    voice_quality_threshold: float = 50.0
    audio_chunk_max_bytes: int = 5 * 1024 * 1024  # 5 MB

    # 서류 파일 허용 기본 디렉터리 (Path Traversal 방지)
    document_base_dir: str = "/app/documents"

    # AWS S3
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "ap-northeast-2"
    aws_s3_bucket: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
