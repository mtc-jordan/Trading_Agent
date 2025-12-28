"""
TradoVerse Database Models
"""
from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime, 
    ForeignKey, Enum, JSON, Index
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
import enum

from ..core.database import Base


class UserRole(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"


class SubscriptionTier(str, enum.Enum):
    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    ELITE = "elite"


class AccountType(str, enum.Enum):
    PAPER = "paper"
    LIVE = "live"


class BotStatus(str, enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    STOPPED = "stopped"


class StrategyType(str, enum.Enum):
    MOMENTUM = "momentum"
    MEAN_REVERSION = "mean_reversion"
    TREND_FOLLOWING = "trend_following"
    ARBITRAGE = "arbitrage"
    ML_BASED = "ml_based"
    OTHER = "other"


class OrderSide(str, enum.Enum):
    BUY = "buy"
    SELL = "sell"


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    FILLED = "filled"
    CANCELLED = "cancelled"
    REJECTED = "rejected"


class AgentType(str, enum.Enum):
    TECHNICAL = "technical"
    FUNDAMENTAL = "fundamental"
    SENTIMENT = "sentiment"
    RISK = "risk"
    MICROSTRUCTURE = "microstructure"
    MACRO = "macro"
    QUANT = "quant"


class User(Base):
    """User model for authentication and profile."""
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    open_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(320), nullable=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    login_method: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.USER, nullable=False)
    subscription_tier: Mapped[SubscriptionTier] = mapped_column(
        Enum(SubscriptionTier), default=SubscriptionTier.FREE, nullable=False
    )
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    stripe_subscription_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    last_signed_in: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    trading_accounts: Mapped[List["TradingAccount"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    trading_bots: Mapped[List["TradingBot"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    watchlists: Mapped[List["Watchlist"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class TradingAccount(Base):
    """Trading account model for paper/live trading."""
    __tablename__ = "trading_accounts"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    account_type: Mapped[AccountType] = mapped_column(Enum(AccountType), default=AccountType.PAPER, nullable=False)
    balance: Mapped[float] = mapped_column(Float, default=100000.0, nullable=False)
    initial_balance: Mapped[float] = mapped_column(Float, default=100000.0, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="USD", nullable=False)
    broker_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    broker_account_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user: Mapped["User"] = relationship(back_populates="trading_accounts")
    bots: Mapped[List["TradingBot"]] = relationship(back_populates="account", cascade="all, delete-orphan")
    trades: Mapped[List["Trade"]] = relationship(back_populates="account", cascade="all, delete-orphan")
    portfolio_snapshots: Mapped[List["PortfolioSnapshot"]] = relationship(back_populates="account", cascade="all, delete-orphan")


class TradingBot(Base):
    """Trading bot model for automated trading."""
    __tablename__ = "trading_bots"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    account_id: Mapped[int] = mapped_column(Integer, ForeignKey("trading_accounts.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    strategy: Mapped[StrategyType] = mapped_column(Enum(StrategyType), default=StrategyType.OTHER, nullable=False)
    symbols: Mapped[str] = mapped_column(JSON, default="[]", nullable=False)  # JSON array of symbols
    risk_settings: Mapped[str] = mapped_column(JSON, default="{}", nullable=False)  # JSON object
    status: Mapped[BotStatus] = mapped_column(Enum(BotStatus), default=BotStatus.STOPPED, nullable=False)
    total_trades: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    winning_trades: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_pnl: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user: Mapped["User"] = relationship(back_populates="trading_bots")
    account: Mapped["TradingAccount"] = relationship(back_populates="bots")
    trades: Mapped[List["Trade"]] = relationship(back_populates="bot", cascade="all, delete-orphan")
    backtests: Mapped[List["Backtest"]] = relationship(back_populates="bot", cascade="all, delete-orphan")


class Trade(Base):
    """Trade/order model for tracking all trades."""
    __tablename__ = "trades"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(Integer, ForeignKey("trading_accounts.id"), nullable=False, index=True)
    bot_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("trading_bots.id"), nullable=True, index=True)
    symbol: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    side: Mapped[OrderSide] = mapped_column(Enum(OrderSide), nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    total_value: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[OrderStatus] = mapped_column(Enum(OrderStatus), default=OrderStatus.PENDING, nullable=False)
    pnl: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    fees: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    executed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    account: Mapped["TradingAccount"] = relationship(back_populates="trades")
    bot: Mapped[Optional["TradingBot"]] = relationship(back_populates="trades")


class Backtest(Base):
    """Backtest model for strategy testing."""
    __tablename__ = "backtests"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    bot_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("trading_bots.id"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    symbols: Mapped[str] = mapped_column(JSON, default="[]", nullable=False)
    start_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    initial_capital: Mapped[float] = mapped_column(Float, default=100000.0, nullable=False)
    final_capital: Mapped[float] = mapped_column(Float, nullable=True)
    total_return: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sharpe_ratio: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    max_drawdown: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    win_rate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    profit_factor: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    total_trades: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    results: Mapped[str] = mapped_column(JSON, default="{}", nullable=False)  # Detailed results
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Relationships
    bot: Mapped[Optional["TradingBot"]] = relationship(back_populates="backtests")


class PortfolioSnapshot(Base):
    """Portfolio snapshot for tracking portfolio value over time."""
    __tablename__ = "portfolio_snapshots"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(Integer, ForeignKey("trading_accounts.id"), nullable=False, index=True)
    total_value: Mapped[float] = mapped_column(Float, nullable=False)
    cash_balance: Mapped[float] = mapped_column(Float, nullable=False)
    positions_value: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    daily_pnl: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    positions: Mapped[str] = mapped_column(JSON, default="[]", nullable=False)  # JSON array of positions
    snapshot_date: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    account: Mapped["TradingAccount"] = relationship(back_populates="portfolio_snapshots")


class AgentAnalysis(Base):
    """AI agent analysis results."""
    __tablename__ = "agent_analyses"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    symbol: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    agent_type: Mapped[AgentType] = mapped_column(Enum(AgentType), nullable=False)
    recommendation: Mapped[str] = mapped_column(String(20), nullable=False)  # buy, sell, hold
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    reasoning: Mapped[str] = mapped_column(Text, nullable=False)
    data_points: Mapped[str] = mapped_column(JSON, default="{}", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class ConsensusResult(Base):
    """Consensus result from all AI agents."""
    __tablename__ = "consensus_results"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    symbol: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    final_recommendation: Mapped[str] = mapped_column(String(20), nullable=False)
    consensus_confidence: Mapped[float] = mapped_column(Float, nullable=False)
    vote_breakdown: Mapped[str] = mapped_column(JSON, nullable=False)  # {buy: 4, sell: 1, hold: 2}
    agent_analyses: Mapped[str] = mapped_column(JSON, nullable=False)  # Array of agent analysis IDs
    reasoning_summary: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class MarketplaceListing(Base):
    """Bot marketplace listing."""
    __tablename__ = "marketplace_listings"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    bot_id: Mapped[int] = mapped_column(Integer, ForeignKey("trading_bots.id"), nullable=False, index=True)
    seller_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    price: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)  # 0 = free
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    total_copies: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    rating: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_reviews: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class BotCopy(Base):
    """Track bot copies from marketplace."""
    __tablename__ = "bot_copies"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    original_bot_id: Mapped[int] = mapped_column(Integer, ForeignKey("trading_bots.id"), nullable=False, index=True)
    copied_bot_id: Mapped[int] = mapped_column(Integer, ForeignKey("trading_bots.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    listing_id: Mapped[int] = mapped_column(Integer, ForeignKey("marketplace_listings.id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class Watchlist(Base):
    """User watchlist for tracking symbols."""
    __tablename__ = "watchlists"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    symbols: Mapped[str] = mapped_column(JSON, default="[]", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user: Mapped["User"] = relationship(back_populates="watchlists")
