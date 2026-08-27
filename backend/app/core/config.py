"""Application configuration using Pydantic Settings."""

from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_ENV: str = "development"
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/threat_intel"
    VIRUSTOTAL_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    DEEPSEEK_API_KEY: str = ""
    AI_PROVIDER: str = "gemini"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,https://mail-trace.vercel.app"
    VT_RATE_LIMIT_PER_MINUTE: int = 4
    VT_CONCURRENT_REQUESTS: int = 2
    IP_API_CONCURRENT_REQUESTS: int = 5
    CACHE_TTL_HOURS: int = 24
    AI_MODEL: str = "gemini-3.6-flash"
    OPENAI_MODEL: str = "gpt-4o-mini"
    DEEPSEEK_MODEL: str = "deepseek-chat"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
