"""
TradoVerse Pydantic Schemas for API Validation
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field
from enum import Enum


# Enums
class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"


class SubscriptionTier(str, Enum):
    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    ELITE = "elite"


class AccountType(str, Enum):
    PAPER = "paper"
    LIVE = "live"


class BotStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    STOPPED = "stopped"


class StrategyType(str, Enum):
    MOMENTUM = "momentum"
    MEAN_REVERSION = "mean_reversion"
    TREND_FOLLOWING = "trend_following"
    ARBITRAGE = "arbitrage"
    ML_BASED = "ml_based"
    OTHER = "other"


class OrderSide(str, Enum):
    BUY = "buy"
    SELL = "sell"


class AgentType(str, Enum):
    TECHNICAL = "technical"
    FUNDAMENTAL = "fundamental"
    SENTIMENT = "sentiment"
    RISK = "risk"
    MICROSTRUCTURE = "microstructure"
    MACRO = "macro"
    QUANT = "quant"


class Recommendation(str, Enum):
    BUY = "buy"
    SELL = "sell"
    HOLD = "hold"


# User Schemas
class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None


class UserCreate(UserBase):
    open_id: str


class UserUpdate(UserBase):
    subscription_tier: Optional[SubscriptionTier] = None


class UserResponse(UserBase):
    id: int
    open_id: str
    role: UserRole
    subscription_tier: SubscriptionTier
    created_at: datetime
    last_signed_in: datetime
    
    class Config:
        from_attributes = True


class UserWithStats(UserResponse):
    total_accounts: int = 0
    total_bots: int = 0
    total_trades: int = 0


# Authentication Schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: int
    open_id: str
    email: Optional[str] = None
    name: Optional[str] = None
    role: str
    subscription_tier: str


class LoginRequest(BaseModel):
    open_id: str
    email: Optional[str] = None
    name: Optional[str] = None
    login_method: Optional[str] = None


# Trading Account Schemas
class TradingAccountBase(BaseModel):
    name: str
    account_type: AccountType = AccountType.PAPER
    initial_balance: float = 100000.0
    currency: str = "USD"


class TradingAccountCreate(TradingAccountBase):
    pass


class TradingAccountUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None


class TradingAccountResponse(TradingAccountBase):
    id: int
    user_id: int
    balance: float
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Trading Bot Schemas
class RiskSettings(BaseModel):
    max_position_size: float = 0.1  # 10% of portfolio
    stop_loss_percent: float = 0.02  # 2%
    take_profit_percent: float = 0.05  # 5%
    max_daily_trades: int = 10
    max_drawdown: float = 0.1  # 10%


class TradingBotBase(BaseModel):
    name: str
    description: Optional[str] = None
    strategy: StrategyType = StrategyType.OTHER
    symbols: List[str] = []
    risk_settings: RiskSettings = RiskSettings()


class TradingBotCreate(TradingBotBase):
    account_id: int


class TradingBotUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    strategy: Optional[StrategyType] = None
    symbols: Optional[List[str]] = None
    risk_settings: Optional[RiskSettings] = None
    status: Optional[BotStatus] = None


class TradingBotResponse(TradingBotBase):
    id: int
    user_id: int
    account_id: int
    status: BotStatus
    total_trades: int
    winning_trades: int
    total_pnl: float
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class BotWithStats(TradingBotResponse):
    win_rate: float = 0.0
    avg_trade_pnl: float = 0.0


# Trade Schemas
class TradeBase(BaseModel):
    symbol: str
    side: OrderSide
    quantity: float
    price: float


class TradeCreate(TradeBase):
    account_id: int
    bot_id: Optional[int] = None
    notes: Optional[str] = None


class TradeResponse(TradeBase):
    id: int
    account_id: int
    bot_id: Optional[int]
    total_value: float
    status: str
    pnl: Optional[float]
    fees: float
    executed_at: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


# Backtest Schemas
class BacktestCreate(BaseModel):
    name: str
    bot_id: Optional[int] = None
    symbols: List[str]
    start_date: datetime
    end_date: datetime
    initial_capital: float = 100000.0
    strategy: StrategyType = StrategyType.OTHER
    parameters: Dict[str, Any] = {}


class BacktestResponse(BaseModel):
    id: int
    user_id: int
    bot_id: Optional[int]
    name: str
    symbols: List[str]
    start_date: datetime
    end_date: datetime
    initial_capital: float
    final_capital: Optional[float]
    total_return: Optional[float]
    sharpe_ratio: Optional[float]
    max_drawdown: Optional[float]
    win_rate: Optional[float]
    profit_factor: Optional[float]
    total_trades: int
    status: str
    created_at: datetime
    completed_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class BacktestResults(BaseModel):
    total_return: float
    sharpe_ratio: float
    max_drawdown: float
    win_rate: float
    profit_factor: float
    total_trades: int
    winning_trades: int
    losing_trades: int
    avg_win: float
    avg_loss: float
    equity_curve: List[Dict[str, Any]]
    trades: List[Dict[str, Any]]


# AI Agent Schemas
class AgentAnalysisRequest(BaseModel):
    symbol: str
    agents: List[AgentType] = [
        AgentType.TECHNICAL,
        AgentType.FUNDAMENTAL,
        AgentType.SENTIMENT,
        AgentType.RISK,
        AgentType.MICROSTRUCTURE,
        AgentType.MACRO,
        AgentType.QUANT,
    ]


class AgentAnalysisResult(BaseModel):
    agent_type: AgentType
    recommendation: Recommendation
    confidence: float = Field(ge=0, le=1)
    reasoning: str
    data_points: Dict[str, Any] = {}


class ConsensusRequest(BaseModel):
    symbol: str
    agents: List[AgentType] = []


class ConsensusResponse(BaseModel):
    id: int
    symbol: str
    final_recommendation: Recommendation
    consensus_confidence: float
    vote_breakdown: Dict[str, int]
    agent_analyses: List[AgentAnalysisResult]
    reasoning_summary: str
    created_at: datetime


# Portfolio Schemas
class PortfolioPosition(BaseModel):
    symbol: str
    quantity: float
    avg_cost: float
    current_price: float
    market_value: float
    unrealized_pnl: float
    unrealized_pnl_percent: float


class PortfolioSummary(BaseModel):
    total_value: float
    cash_balance: float
    positions_value: float
    total_pnl: float
    total_pnl_percent: float
    daily_pnl: float
    positions: List[PortfolioPosition]


class PortfolioAnalytics(BaseModel):
    sharpe_ratio: float
    sortino_ratio: float
    max_drawdown: float
    win_rate: float
    profit_factor: float
    avg_trade_duration: float
    total_trades: int
    best_trade: float
    worst_trade: float
    avg_win: float
    avg_loss: float


# Marketplace Schemas
class MarketplaceListingCreate(BaseModel):
    bot_id: int
    title: str
    description: str
    price: float = 0.0
    category: str


class MarketplaceListingResponse(BaseModel):
    id: int
    bot_id: int
    seller_id: int
    title: str
    description: str
    price: float
    category: str
    total_copies: int
    rating: float
    total_reviews: int
    is_featured: bool
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class MarketplaceListingWithBot(MarketplaceListingResponse):
    bot: TradingBotResponse
    seller_name: str


class LeaderboardEntry(BaseModel):
    rank: int
    bot_id: int
    bot_name: str
    user_name: str
    total_return: float
    sharpe_ratio: float
    win_rate: float
    total_trades: int


# Market Data Schemas
class StockQuote(BaseModel):
    symbol: str
    price: float
    change: float
    change_percent: float
    volume: int
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    high_52w: Optional[float] = None
    low_52w: Optional[float] = None


class StockChart(BaseModel):
    symbol: str
    timestamps: List[int]
    open: List[float]
    high: List[float]
    low: List[float]
    close: List[float]
    volume: List[int]


# Subscription Schemas
class SubscriptionTierInfo(BaseModel):
    id: str
    name: str
    description: str
    price: float
    features: Dict[str, Any]
    feature_list: List[str]


class CheckoutSessionRequest(BaseModel):
    tier: SubscriptionTier
    success_url: str
    cancel_url: str


class CheckoutSessionResponse(BaseModel):
    session_id: str
    url: str


# Admin Schemas
class AdminStats(BaseModel):
    total_users: int
    active_users: int
    total_bots: int
    active_bots: int
    total_trades: int
    total_revenue: float
    users_by_tier: Dict[str, int]
    new_users_today: int
    new_users_week: int


class AdminUserUpdate(BaseModel):
    role: Optional[UserRole] = None
    subscription_tier: Optional[SubscriptionTier] = None
    is_active: Optional[bool] = None


# Watchlist Schemas
class WatchlistCreate(BaseModel):
    name: str
    symbols: List[str] = []


class WatchlistUpdate(BaseModel):
    name: Optional[str] = None
    symbols: Optional[List[str]] = None


class WatchlistResponse(BaseModel):
    id: int
    user_id: int
    name: str
    symbols: List[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
