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
    g0i_api_key: str = ""
    groq_api_key: str = ""
    tavily_api_key: str = ""
    slack_webhook_url: str = ""
    notion_api_key: str = ""
    notion_database_id: str = ""
    supabase_url: str = ""
    supabase_key: str = ""
    omium_api_key: str = ""
    omium_api_url: str = "https://api.omium.ai"
    omium_project: str = "production"
    debug: bool = False
    ngrok_authtoken: str = ""
    competitors: str = "linear.app,notion.so,vercel.com"
    cors_origins: str = (
        "http://localhost:3000,"
        "http://127.0.0.1:3000,"
        "http://localhost:5173,"
        "http://127.0.0.1:5173"
    )

    @field_validator(
        "anthropic_api_key",
        "g0i_api_key",
        "groq_api_key",
        "tavily_api_key",
        "slack_webhook_url",
        "notion_api_key",
        "notion_database_id",
        "ngrok_authtoken",
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

    @property
    def default_competitors(self) -> list[str]:
        """Default competitor list from COMPETITORS env (comma-separated)."""
        return [
            item.strip()
            for item in self.competitors.split(",")
            if item.strip()
        ]


_settings: Settings | None = None


def get_settings() -> Settings:
    """Return cached settings instance (singleton per process)."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
