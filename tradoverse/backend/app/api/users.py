"""
TradoVerse Users API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from ..core.database import get_db
from ..core.security import get_current_user
from ..models.models import User, TradingAccount, TradingBot, Trade
from ..schemas.schemas import UserResponse, UserUpdate, UserWithStats

router = APIRouter()


@router.get("/profile", response_model=UserWithStats)
async def get_user_profile(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user profile with statistics."""
    result = await db.execute(
        select(User).where(User.id == current_user["id"])
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get statistics
    accounts_result = await db.execute(
        select(func.count(TradingAccount.id)).where(
            TradingAccount.user_id == user.id
        )
    )
    total_accounts = accounts_result.scalar() or 0
    
    bots_result = await db.execute(
        select(func.count(TradingBot.id)).where(
            TradingBot.user_id == user.id
        )
    )
    total_bots = bots_result.scalar() or 0
    
    # Get total trades through accounts
    trades_result = await db.execute(
        select(func.count(Trade.id)).join(
            TradingAccount, Trade.account_id == TradingAccount.id
        ).where(TradingAccount.user_id == user.id)
    )
    total_trades = trades_result.scalar() or 0
    
    return UserWithStats(
        id=user.id,
        open_id=user.open_id,
        email=user.email,
        name=user.name,
        role=user.role,
        subscription_tier=user.subscription_tier,
        created_at=user.created_at,
        last_signed_in=user.last_signed_in,
        total_accounts=total_accounts,
        total_bots=total_bots,
        total_trades=total_trades
    )


@router.put("/profile", response_model=UserResponse)
async def update_user_profile(
    update_data: UserUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user profile."""
    result = await db.execute(
        select(User).where(User.id == current_user["id"])
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update fields
    if update_data.email is not None:
        user.email = update_data.email
    if update_data.name is not None:
        user.name = update_data.name
    
    await db.commit()
    await db.refresh(user)
    
    return user


@router.get("/tier")
async def get_user_tier(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's subscription tier and limits."""
    from ..core.config import SUBSCRIPTION_TIERS, get_tier_features
    
    result = await db.execute(
        select(User).where(User.id == current_user["id"])
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    tier = user.subscription_tier.value
    tier_info = SUBSCRIPTION_TIERS.get(tier, SUBSCRIPTION_TIERS["free"])
    features = get_tier_features(tier)
    
    # Get current usage
    accounts_result = await db.execute(
        select(func.count(TradingAccount.id)).where(
            TradingAccount.user_id == user.id
        )
    )
    current_accounts = accounts_result.scalar() or 0
    
    bots_result = await db.execute(
        select(func.count(TradingBot.id)).where(
            TradingBot.user_id == user.id
        )
    )
    current_bots = bots_result.scalar() or 0
    
    return {
        "tier": tier,
        "tier_info": tier_info,
        "features": features,
        "usage": {
            "accounts": current_accounts,
            "bots": current_bots
        },
        "limits": {
            "max_accounts": features.get("max_accounts", 1),
            "max_bots": features.get("max_bots", 1),
            "ai_agents": features.get("ai_agents", 2)
        }
    }
