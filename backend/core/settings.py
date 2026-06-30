import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Global settings configuration for the FastAPI backend.
    Enables environment variable overrides.
    """
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "Agentic Decision Intelligence Platform"

    # CORS settings - default to allow all in development
    CORS_ORIGINS: list = ["*"]

    # Database & Memory Configuration
    DATABASE_URL: str = "sqlite:///./data/platform.db"
    CHROMA_PATH: str = "./data/chroma"
    MEMORY_COLLECTION_PREFIX: str = "domain_"

    # Environment settings
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    LANGSMITH_API_KEY: str = os.getenv("LANGSMITH_API_KEY", "")
    LANGCHAIN_TRACING_V2: str = os.getenv("LANGCHAIN_TRACING_V2", "false")
    LANGCHAIN_PROJECT: str = os.getenv("LANGCHAIN_PROJECT", "agentic-decision-platform")

    # Hardening & Guardrail parameters
    ENABLE_PII_REDACTION: bool = os.getenv("ENABLE_PII_REDACTION", "true").lower() == "true"
    ENABLE_PROMPT_GUARD: bool = os.getenv("ENABLE_PROMPT_GUARD", "true").lower() == "true"
    ENABLE_HEURISTIC_FALLBACK: bool = os.getenv("ENABLE_HEURISTIC_FALLBACK", "true").lower() == "true"
    ENABLE_LEARNING_FILTER: bool = os.getenv("ENABLE_LEARNING_FILTER", "true").lower() == "true"
    LLM_TIMEOUT_SECONDS: int = int(os.getenv("LLM_TIMEOUT_SECONDS", "20"))
    MAX_LLM_RETRIES: int = int(os.getenv("MAX_LLM_RETRIES", "2"))
    MAX_LLM_CALLS_PER_REQUEST: int = int(os.getenv("MAX_LLM_CALLS_PER_REQUEST", "5"))
    USE_SYNTHESIS_ONLY_IF_NEEDED: bool = os.getenv("USE_SYNTHESIS_ONLY_IF_NEEDED", "true").lower() == "true"

    class Config:
        env_file = ".env"
        extra = "allow"


# Global settings instance
settings = Settings()
