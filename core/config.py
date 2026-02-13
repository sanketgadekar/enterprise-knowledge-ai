from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):

    # Deployment
    deployment_mode: str = Field(..., env="DEPLOYMENT_MODE")

    # LLM
    llm_provider: str = Field(..., env="LLM_PROVIDER")
    openai_api_key: str | None = Field(None, env="OPENAI_API_KEY")

    # Vector DB
    vector_db: str = Field(..., env="VECTOR_DB")

    # Embeddings
    embedding_model: str = Field(..., env="EMBEDDING_MODEL")

    # Memory
    memory_backend: str = Field(..., env="MEMORY_BACKEND")
    memory_retention_days: int = Field(..., env="MEMORY_RETENTION_DAYS")

    # Chunking
    chunk_size: int = Field(..., env="CHUNK_SIZE")
    chunk_overlap: int = Field(..., env="CHUNK_OVERLAP")
    
    # Logging
    log_level: str = "INFO"
    log_file: str = "logs/app.log"

    # Database
    database_url: str
    database_echo: bool = False

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()