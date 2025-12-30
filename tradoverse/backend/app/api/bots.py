"""
TradoVerse Trading Bots API Routes
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from ..core.database import get_db
from ..core.security import get_current_user
from ..core.config import get_tier_features, is_within_limit
from ..models.models import TradingBot, TradingAccount, BotStatus
from ..schemas.schemas import (
    TradingBotCreate, TradingBotUpdate, TradingBotResponse, BotWithStats
)

router = APIRouter()


@router.get("/", response_model=List[BotWithStats])
async def list_bots(
    account_id: Optional[int] = Query(None),
    status_filter: Optional[BotStatus] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all trading bots for current user."""
    query = select(TradingBot).where(TradingBot.user_id == current_user["id"])
    
    if account_id:
        query = query.where(TradingBot.account_id == account_id)
    if status_filter:
        query = query.where(TradingBot.status == status_filter)
    
    query = query.order_by(TradingBot.created_at.desc())
    
    result = await db.execute(query)
    bots = result.scalars().all()
    
    # Calculate stats for each bot
    bot_responses = []
    for bot in bots:
        win_rate = (bot.winning_trades / bot.total_trades * 100) if bot.total_trades > 0 else 0
        avg_pnl = bot.total_pnl / bot.total_trades if bot.total_trades > 0 else 0
        
        bot_responses.append(BotWithStats(
            id=bot.id,
            user_id=bot.user_id,
            account_id=bot.account_id,
            name=bot.name,
            description=bot.description,
            strategy=bot.strategy,
            symbols=bot.symbols or [],
            risk_settings=bot.risk_settings or {},
            status=bot.status,
            total_trades=bot.total_trades,
            winning_trades=bot.winning_trades,
            total_pnl=bot.total_pnl,
            created_at=bot.created_at,
            updated_at=bot.updated_at,
            win_rate=round(win_rate, 2),
            avg_trade_pnl=round(avg_pnl, 2)
        ))
    
    return bot_responses


@router.post("/", response_model=TradingBotResponse)
async def create_bot(
    bot_data: TradingBotCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new trading bot."""
    # Check tier limits
    tier = current_user.get("subscription_tier", "free")
    
    # Count existing bots
    result = await db.execute(
        select(func.count(TradingBot.id)).where(
            TradingBot.user_id == current_user["id"]
        )
    )
    current_count = result.scalar() or 0
    
    if not is_within_limit(tier, "max_bots", current_count):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Bot limit reached for {tier} tier. Please upgrade to create more bots."
        )
    
    # Verify account ownership
    account_result = await db.execute(
        select(TradingAccount).where(
            TradingAccount.id == bot_data.account_id,
            TradingAccount.user_id == current_user["id"]
        )
    )
    account = account_result.scalar_one_or_none()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trading account not found"
        )
    
    # Create bot
    bot = TradingBot(
        user_id=current_user["id"],
        account_id=bot_data.account_id,
        name=bot_data.name,
        description=bot_data.description,
        strategy=bot_data.strategy,
        symbols=bot_data.symbols,
        risk_settings=bot_data.risk_settings.model_dump() if bot_data.risk_settings else {}
    )
    
    db.add(bot)
    await db.commit()
    await db.refresh(bot)
    
    return bot


@router.get("/{bot_id}", response_model=BotWithStats)
async def get_bot(
    bot_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific trading bot."""
    result = await db.execute(
        select(TradingBot).where(
            TradingBot.id == bot_id,
            TradingBot.user_id == current_user["id"]
        )
    )
    bot = result.scalar_one_or_none()
    
    if not bot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bot not found"
        )
    
    win_rate = (bot.winning_trades / bot.total_trades * 100) if bot.total_trades > 0 else 0
    avg_pnl = bot.total_pnl / bot.total_trades if bot.total_trades > 0 else 0
    
    return BotWithStats(
        id=bot.id,
        user_id=bot.user_id,
        account_id=bot.account_id,
        name=bot.name,
        description=bot.description,
        strategy=bot.strategy,
        symbols=bot.symbols or [],
        risk_settings=bot.risk_settings or {},
        status=bot.status,
        total_trades=bot.total_trades,
        winning_trades=bot.winning_trades,
        total_pnl=bot.total_pnl,
        created_at=bot.created_at,
        updated_at=bot.updated_at,
        win_rate=round(win_rate, 2),
        avg_trade_pnl=round(avg_pnl, 2)
    )


@router.put("/{bot_id}", response_model=TradingBotResponse)
async def update_bot(
    bot_id: int,
    update_data: TradingBotUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a trading bot."""
    result = await db.execute(
        select(TradingBot).where(
            TradingBot.id == bot_id,
            TradingBot.user_id == current_user["id"]
        )
    )
    bot = result.scalar_one_or_none()
    
    if not bot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bot not found"
        )
    
    # Update fields
    if update_data.name is not None:
        bot.name = update_data.name
    if update_data.description is not None:
        bot.description = update_data.description
    if update_data.strategy is not None:
        bot.strategy = update_data.strategy
    if update_data.symbols is not None:
        bot.symbols = update_data.symbols
    if update_data.risk_settings is not None:
        bot.risk_settings = update_data.risk_settings.model_dump()
    if update_data.status is not None:
        bot.status = update_data.status
    
    await db.commit()
    await db.refresh(bot)
    
    return bot


@router.delete("/{bot_id}")
async def delete_bot(
    bot_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a trading bot."""
    result = await db.execute(
        select(TradingBot).where(
            TradingBot.id == bot_id,
            TradingBot.user_id == current_user["id"]
        )
    )
    bot = result.scalar_one_or_none()
    
    if not bot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bot not found"
        )
    
    await db.delete(bot)
    await db.commit()
    
    return {"success": True, "message": "Bot deleted"}


@router.post("/{bot_id}/start")
async def start_bot(
    bot_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Start a trading bot."""
    result = await db.execute(
        select(TradingBot).where(
            TradingBot.id == bot_id,
            TradingBot.user_id == current_user["id"]
        )
    )
    bot = result.scalar_one_or_none()
    
    if not bot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bot not found"
        )
    
    bot.status = BotStatus.ACTIVE
    await db.commit()
    
    return {"success": True, "message": "Bot started", "status": bot.status.value}


@router.post("/{bot_id}/stop")
async def stop_bot(
    bot_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Stop a trading bot."""
    result = await db.execute(
        select(TradingBot).where(
            TradingBot.id == bot_id,
            TradingBot.user_id == current_user["id"]
        )
    )
    bot = result.scalar_one_or_none()
    
    if not bot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bot not found"
        )
    
    bot.status = BotStatus.STOPPED
    await db.commit()
    
    return {"success": True, "message": "Bot stopped", "status": bot.status.value}


@router.post("/{bot_id}/pause")
async def pause_bot(
    bot_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Pause a trading bot."""
    result = await db.execute(
        select(TradingBot).where(
            TradingBot.id == bot_id,
            TradingBot.user_id == current_user["id"]
        )
    )
    bot = result.scalar_one_or_none()
    
    if not bot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bot not found"
        )
    
    bot.status = BotStatus.PAUSED
    await db.commit()
    
    return {"success": True, "message": "Bot paused", "status": bot.status.value}
