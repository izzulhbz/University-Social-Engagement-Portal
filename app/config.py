from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Project
    PROJECT_NAME: str = "INF2003 API"
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days
    
    # MySQL
    MYSQL_DATABASE_URL: str
    
    # MongoDB
    MONGO_DB_URI: str
    MONGO_DB_DATABASE_NAME: str
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()