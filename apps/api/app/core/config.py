"""
JANASEVA OS — Application Configuration
Reads environment variables with strict validation via Pydantic Settings.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import AliasChoices, AnyHttpUrl, AnyUrl, EmailStr, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "JANASEVA OS"
    app_env: Literal["development", "staging", "production"] = "development"
    app_debug: bool = False
    app_secret_key: str = Field(
        default="janaseva-production-app-secret-key-32chars!",
        validation_alias=AliasChoices("app_secret_key", "secret_key"),
    )

    # Database
    database_url: str = "postgresql+asyncpg://janaseva:janaseva@localhost:5432/janaseva"
    database_sync_url: str = ""
    db_pool_size: int = 10
    db_max_overflow: int = 20
    db_echo: bool = False

    # Redis / Celery
    redis_url: str = "redis://redis:6379/0"
    celery_broker_url: str = "redis://redis:6379/1"
    celery_result_backend: str = "redis://redis:6379/2"

    # JWT
    jwt_secret_key: str = Field(
        default="",
        validation_alias=AliasChoices("jwt_secret_key", "app_secret_key", "secret_key"),
    )
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7

    # Object storage
    minio_endpoint: str = "minio:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket_evidence: str = "janaseva-evidence"
    minio_bucket_documents: str = "janaseva-documents"
    minio_use_ssl: bool = False

    # AI / Gemini
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    gemini_embedding_model: str = "text-embedding-004"
    ai_max_tokens: int = 2048
    ai_temperature: float = 0.1

    # Email
    smtp_host: str = "localhost"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "JANASEVA OS <noreply@janaseva.demo>"

    # SMS / Push
    sms_provider: str = "stub"
    sms_api_key: str = ""
    push_provider: str = "stub"
    push_api_key: str = ""

    # Rate limiting
    rate_limit_requests_per_minute: int = 60
    rate_limit_burst: int = 20

    # Observability
    log_level: str = "INFO"
    otel_exporter_otlp_endpoint: str = ""
    sentry_dsn: str = ""

    # Demo / Seed
    seed_demo_data: bool = True
    demo_district_name: str = "Krishnapur District"
    demo_state_name: str = "Karnatapur"

    # CORS
    allowed_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_cors(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, v: str | None) -> str:
        if not v:
            return "postgresql+asyncpg://janaseva:janaseva@localhost:5432/janaseva"
        # Render / Heroku / Neon compatibility: convert postgres:// and postgresql:// to postgresql+asyncpg://
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+asyncpg://", 1)
        if v.startswith("postgresql://") and not v.startswith("postgresql+"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    @field_validator("database_sync_url", mode="before")
    @classmethod
    def normalize_sync_database_url(cls, v: str | None) -> str:
        if not v:
            return ""
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+psycopg2://", 1)
        if v.startswith("postgresql://") and not v.startswith("postgresql+"):
            return v.replace("postgresql://", "postgresql+psycopg2://", 1)
        return v

    @field_validator("jwt_secret_key", mode="after")
    @classmethod
    def ensure_jwt_secret_key(cls, v: str, info) -> str:
        if not v:
            return info.data.get("app_secret_key") or "janaseva-production-app-secret-key-32chars!"
        return v

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()
