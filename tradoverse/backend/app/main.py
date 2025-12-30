"""
TradoVerse FastAPI Application

AI-Powered Trading Platform with 7-Agent Consensus System
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .core.config import get_settings
from .core.database import init_db, close_db
from .api import auth, users, accounts, bots, analysis, backtest, portfolio, marketplace, admin, market_data, subscriptions

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    print("Starting TradoVerse API...")
    await init_db()
    yield
    # Shutdown
    print("Shutting down TradoVerse API...")
    await close_db()


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="""
    TradoVerse - AI-Powered Trading Platform
    
    Features:
    - 7-Agent AI Consensus System for market analysis
    - Automated trading bots with paper and live trading
    - Comprehensive backtesting engine
    - Portfolio analytics and risk management
    - Bot marketplace with leaderboard
    - Subscription-based access with Stripe integration
    """,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS + ["*"],  # Allow all for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "TradoVerse API"}


# Root endpoint
@app.get("/api")
async def root():
    """API root endpoint."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "description": "AI-Powered Trading Platform with 7-Agent Consensus System",
        "docs": "/api/docs"
    }


# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(accounts.router, prefix="/api/v1/accounts", tags=["Trading Accounts"])
app.include_router(bots.router, prefix="/api/v1/bots", tags=["Trading Bots"])
app.include_router(analysis.router, prefix="/api/v1/analysis", tags=["AI Analysis"])
app.include_router(backtest.router, prefix="/api/v1/backtest", tags=["Backtesting"])
app.include_router(portfolio.router, prefix="/api/v1/portfolio", tags=["Portfolio"])
app.include_router(marketplace.router, prefix="/api/v1/marketplace", tags=["Marketplace"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(market_data.router, prefix="/api/v1/market", tags=["Market Data"])
app.include_router(subscriptions.router, prefix="/api/v1/subscriptions", tags=["Subscriptions"])


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Handle all unhandled exceptions."""
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
