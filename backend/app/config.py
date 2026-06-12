from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./terminplanung.db"
    allowed_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    app_title: str = "Terminplanung"
    app_version: str = "1.0.0"
    secret_key: str = "change-me-in-production-use-env-var"

    class Config:
        env_file = ".env"


settings = Settings()
