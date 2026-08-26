"""Application configuration via environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    ML_SERVICE_URL: str = "http://localhost:8001"
    GROQ_API_KEY: str
    GROQ_MODEL: str = "openai/gpt-oss-20b"
    AI_INSIGHTS_CACHE_TTL_SECONDS: int = 10800
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_WHATSAPP_FROM: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
