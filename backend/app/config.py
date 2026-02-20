from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    # No JWT secret needed — Supabase uses ES256 (ECC P-256), verified via JWKS public key
    FRONTEND_URL: str = "http://localhost:3000"


settings = Settings()
