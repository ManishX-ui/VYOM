import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="allow")

    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "VYOM — Aero Piston Engine Digital Twin Backend"
    VERSION: str = "2.0.0"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "vyom-default-secret-key-for-local-development")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]
    
    # Database & Supabase
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

settings = Settings()
