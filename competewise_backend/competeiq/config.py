"""Application configuration loaded from competeiq/.env."""

from __future__ import annotations

from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Always resolve .env relative to this package (not the process cwd)
_ENV_FILE = Path(__file__).resolve().parent / ".env"


class Settings(BaseSettings):
    """Application settings loaded from the competeiq/.env file."""

    model_config = SettingsConfigDict(
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    anthropic_api_key: str = ""
    gemini_api_key: str = ""
    tavily_api_key: str = ""
    slack_webhook_url: str = ""
    notion_api_key: str = ""
    notion_database_id: str = ""
    debug: bool = False
    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    @field_validator(
        "anthropic_api_key",
        "gemini_api_key",
        "tavily_api_key",
        "slack_webhook_url",
        "notion_api_key",
        "notion_database_id",
        "cors_origins",
        mode="before",
    )
    @classmethod
    def strip_whitespace(cls, value: str) -> str:
        """Strip accidental whitespace from .env values."""
        if isinstance(value, str):
            return value.strip()
        return value

    @property
    def cors_origins_list(self) -> list[str]:
        """CORS origins as a list for FastAPI middleware."""
        return [
            origin.strip()
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]

    @property
    def is_development(self) -> bool:
        """True when running in debug/development mode."""
        return self.debug


_settings: Settings | None = None


def get_settings() -> Settings:
    """Return cached settings instance (singleton per process)."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
