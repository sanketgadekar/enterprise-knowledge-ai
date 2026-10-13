from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


# Project root: enterprise-knowledge-ai/
PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):

    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Deployment
    deployment_mode: str = Field(..., validation_alias="DEPLOYMENT_MODE")

    # LLM
    llm_provider: str = Field(..., validation_alias="LLM_PROVIDER")
    groq_api_key: str | None = Field(None, validation_alias="GROQ_API_KEY")
    groq_model: str = Field(
        "openai/gpt-oss-120b",
        validation_alias="GROQ_MODEL",
    )

    # Vector DB
    vector_db: str = Field(..., validation_alias="VECTOR_DB")

    # Embeddings
    embedding_model: str = Field(..., validation_alias="EMBEDDING_MODEL")

    # Memory
    memory_backend: str = Field(..., validation_alias="MEMORY_BACKEND")
    memory_retention_days: int = Field(
        ..., validation_alias="MEMORY_RETENTION_DAYS"
    )

    # Chunking
    chunk_size: int = Field(..., validation_alias="CHUNK_SIZE")
    chunk_overlap: int = Field(..., validation_alias="CHUNK_OVERLAP")

    # Logging
    log_level: str = "INFO"
    log_file: str = "logs/app.log"

    # Database
    database_url: str = Field(..., validation_alias="DATABASE_URL")
    database_echo: bool = False

    # JWT
    jwt_secret_key: str = Field(..., validation_alias="JWT_SECRET_KEY")
    jwt_algorithm: str = Field("HS256", validation_alias="JWT_ALGORITHM")
    jwt_expire_minutes: int = Field(
        60, validation_alias="JWT_EXPIRE_MINUTES"
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()