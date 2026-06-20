import os
import logging
from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Disable EC2 metadata service globally to prevent boto3/botocore connection hangs on local machines
os.environ["AWS_EC2_METADATA_DISABLED"] = "true"

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """Runtime configuration loaded from environment variables."""

    app_name: str = "Flowzint Finance AI"
    environment: str = "development"
    cors_origins: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000",
        description="Comma-separated list of allowed frontend origins.",
    )
    tavily_api_key: str | None = None
    openai_api_key: str | None = None
    gemini_api_key: str | None = None
    openrouter_api_key: str | None = None
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    aws_region_name: str | None = "us-east-1"
    crewai_model: str = "bedrock/amazon.nova-pro-v1:0"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def has_llm_key(self) -> bool:
        """Check if at least one LLM API key is configured or default AWS credentials are used."""
        if self.openai_api_key or self.gemini_api_key or self.openrouter_api_key or (self.aws_access_key_id and self.aws_secret_access_key):
            return True
        if self.crewai_model.startswith("bedrock/"):
            # Check if standard AWS credentials exist in env or local AWS CLI profiles
            if os.environ.get("AWS_ACCESS_KEY_ID") or os.environ.get("AWS_PROFILE"):
                return True
            try:
                import boto3
                session = boto3.Session()
                return session.get_credentials() is not None
            except Exception:
                return False
        return False

    @property
    def has_news_key(self) -> bool:
        """Check if the Tavily news API key is configured."""
        return bool(self.tavily_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
