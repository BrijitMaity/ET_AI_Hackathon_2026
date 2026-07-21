import os
from pydantic import BaseModel
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env")
load_dotenv(dotenv_path=env_path)

class Settings(BaseModel):
    # Auth Rate Limiter Settings
    AUTH_BASE_DELAY_SECONDS: float = float(os.getenv("AUTH_BASE_DELAY_SECONDS", "1.0"))
    AUTH_MAX_DELAY_SECONDS: float = float(os.getenv("AUTH_MAX_DELAY_SECONDS", "60.0"))
    AUTH_MAX_FAILURES_BEFORE_BACKOFF: int = int(os.getenv("AUTH_MAX_FAILURES_BEFORE_BACKOFF", "3"))
    AUTH_FORGET_AFTER_SECONDS: float = float(os.getenv("AUTH_FORGET_AFTER_SECONDS", "600.0"))

    # Standard Rate Limiter Settings
    PUBLIC_RATE_LIMIT_REQUESTS: int = int(os.getenv("PUBLIC_RATE_LIMIT_REQUESTS", "60"))
    PUBLIC_RATE_LIMIT_WINDOW_SECONDS: int = int(os.getenv("PUBLIC_RATE_LIMIT_WINDOW_SECONDS", "60"))
    
    AUTHENTICATED_RATE_LIMIT_REQUESTS: int = int(os.getenv("AUTHENTICATED_RATE_LIMIT_REQUESTS", "300"))
    AUTHENTICATED_RATE_LIMIT_WINDOW_SECONDS: int = int(os.getenv("AUTHENTICATED_RATE_LIMIT_WINDOW_SECONDS", "60"))

    # Secrets (Strictly Required)
    ADMIN_PASSWORD: str = os.environ["ADMIN_PASSWORD"]
    API_SECRET_KEY: str = os.environ["API_SECRET_KEY"]

settings = Settings()
