import os
from pathlib import Path
from typing import List, Union
import json

from dotenv import load_dotenv
from pydantic import field_validator
from pydantic_settings import BaseSettings


BASE_DIR = Path(__file__).resolve().parents[2]

ENV_FILE = BASE_DIR / ".env"
load_dotenv(ENV_FILE)


class Settings(BaseSettings):
    PROJECT_NAME: str = "AuditIQ Policy-to-Evidence Compliance Platform"
    API_V1_STR: str = "/api/v1"

    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(
        cls,
        v: Union[str, List[str]]
    ) -> List[str]:

        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass

            return [i.strip() for i in v.split(",") if i.strip()]

        if isinstance(v, list):
            return v

        return ["*"]

    # LLM
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "openrouter")

    OPENROUTER_API_KEY: str = os.getenv(
        "OPENROUTER_API_KEY",
        ""
    )

    OPENROUTER_BASE_URL: str = os.getenv(
        "OPENROUTER_BASE_URL",
        "https://openrouter.ai/api/v1"
    )

    GEMINI_MODEL_NAME: str = os.getenv(
        "GEMINI_MODEL_NAME",
        "nvidia/nemotron-nano-9b-v2:free"
    )

    @property
    def active_gemini_api_key(self) -> str:
        return self.OPENROUTER_API_KEY or os.getenv("OPENROUTER_API_KEY", "")


settings = Settings()