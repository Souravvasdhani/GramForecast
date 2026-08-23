"""Application configuration via environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://gramuser:grampassword@localhost:5432/gramforecast"
    JWT_SECRET: str = "supersecretjwtkeychangeinprod"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    ML_SERVICE_URL: str = "http://localhost:8001"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    AI_INSIGHTS_CACHE_TTL_SECONDS: int = 10800

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
