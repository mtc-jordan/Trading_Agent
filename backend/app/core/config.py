"""
TradoVerse FastAPI Configuration
"""
from pydantic_settings import BaseSettings
from typing import Optional, List
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "TradoVerse"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_PREFIX: str = "/api/v1"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Database
    DATABASE_URL: str = "mysql+aiomysql://user:password@localhost:3306/tradoverse"
    
    # JWT Authentication
    JWT_SECRET: str = "your-super-secret-jwt-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # OAuth
    OAUTH_SERVER_URL: Optional[str] = None
    OAUTH_CLIENT_ID: Optional[str] = None
    OAUTH_CLIENT_SECRET: Optional[str] = None
    
    # Stripe
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    STRIPE_PUBLISHABLE_KEY: Optional[str] = None
    
    # AI/LLM Configuration
    OPENAI_API_KEY: Optional[str] = None
    DEEPSEEK_API_KEY: Optional[str] = None
    LLM_MODEL: str = "deepseek-chat"
    LLM_BASE_URL: str = "https://api.deepseek.com/v1"
    
    # Yahoo Finance API (via built-in data API)
    FORGE_API_URL: Optional[str] = None
    FORGE_API_KEY: Optional[str] = None
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Subscription tier configurations
SUBSCRIPTION_TIERS = {
    "free": {
        "id": "free",
        "name": "Free",
        "description": "Perfect for learning and paper trading",
        "price": 0,
        "features": {
            "max_bots": 1,
            "max_accounts": 1,
            "ai_agents": 2,
            "backtest_months": 3,
            "live_trading_enabled": False,
            "api_access_enabled": False,
            "priority_support": False,
        },
        "feature_list": [
            "Paper trading only",
            "2 AI agents",
            "1 trading bot",
            "1 trading account",
            "3-month backtest history",
        ],
    },
    "starter": {
        "id": "starter",
        "name": "Starter",
        "description": "For serious traders getting started",
        "price": 29,
        "features": {
            "max_bots": 3,
            "max_accounts": 2,
            "ai_agents": 4,
            "backtest_months": 12,
            "live_trading_enabled": True,
            "api_access_enabled": False,
            "priority_support": False,
        },
        "feature_list": [
            "Paper & live trading",
            "4 AI agents",
            "3 trading bots",
            "2 trading accounts",
            "1-year backtest history",
        ],
    },
    "pro": {
        "id": "pro",
        "name": "Pro",
        "description": "Full power for active traders",
        "price": 79,
        "features": {
            "max_bots": 10,
            "max_accounts": 5,
            "ai_agents": 7,
            "backtest_months": 60,
            "live_trading_enabled": True,
            "api_access_enabled": True,
            "priority_support": False,
        },
        "feature_list": [
            "Paper & live trading",
            "All 7 AI agents",
            "10 trading bots",
            "5 trading accounts",
            "5-year backtest history",
            "API access",
        ],
    },
    "elite": {
        "id": "elite",
        "name": "Elite",
        "description": "Maximum power for professionals",
        "price": 199,
        "features": {
            "max_bots": -1,  # Unlimited
            "max_accounts": -1,  # Unlimited
            "ai_agents": 7,
            "backtest_months": -1,  # Full history
            "live_trading_enabled": True,
            "api_access_enabled": True,
            "priority_support": True,
        },
        "feature_list": [
            "Paper & live trading",
            "All 7 AI agents",
            "Unlimited trading bots",
            "Unlimited accounts",
            "Full backtest history (2010+)",
            "API access",
            "Priority support",
        ],
    },
}


def get_tier_features(tier: str) -> dict:
    """Get features for a subscription tier."""
    return SUBSCRIPTION_TIERS.get(tier, SUBSCRIPTION_TIERS["free"])["features"]


def is_within_limit(tier: str, feature: str, current_count: int) -> bool:
    """Check if current count is within tier limit."""
    features = get_tier_features(tier)
    limit = features.get(feature, 0)
    if limit == -1:  # Unlimited
        return True
    return current_count < limit
