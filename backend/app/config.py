from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/nbfc_loan_db"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Groq Configuration (FREE - using Llama 3.1)
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.1-8b-instant"  # Fast & free
    
    # CORS
    FRONTEND_URL: str = "http://localhost:3000"
    
    # External Credit Bureau API (optional)
    CREDIT_API_URL: str = ""  # e.g. "https://api.yourcreditbureau.com/score"
    CREDIT_API_KEY: str = ""  # set in .env for real integration
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # File Upload
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 10485760  # 10MB
    
    # Mock APIs
    MOCK_CRM_ENABLED: bool = True
    MOCK_CREDIT_BUREAU_ENABLED: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()
