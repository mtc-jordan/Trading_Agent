"""
TradoVerse Admin API Routes
"""
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from ..core.database import get_db
from ..core.security import get_current_user, require_admin
from ..models.models import User, TradingAccount, TradingBot, Trade, UserRole, SubscriptionTier
from ..schemas.schemas import AdminStats, AdminUserUpdate, UserResponse

router = APIRouter()


@router.get("/stats", response_model=AdminStats)
async def get_admin_stats(
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get platform statistics (admin only)."""
    # Total users
    total_users_result = await db.execute(select(func.count(User.id)))
    total_users = total_users_result.scalar() or 0
    
    # Active users (signed in last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    active_users_result = await db.execute(
        select(func.count(User.id)).where(User.last_signed_in >= thirty_days_ago)
    )
    active_users = active_users_result.scalar() or 0
    
    # Total bots
    total_bots_result = await db.execute(select(func.count(TradingBot.id)))
    total_bots = total_bots_result.scalar() or 0
    
    # Active bots
    active_bots_result = await db.execute(
        select(func.count(TradingBot.id)).where(TradingBot.status == "active")
    )
    active_bots = active_bots_result.scalar() or 0
    
    # Total trades
    total_trades_result = await db.execute(select(func.count(Trade.id)))
    total_trades = total_trades_result.scalar() or 0
    
    # Users by tier
    users_by_tier = {}
    for tier in SubscriptionTier:
        tier_count_result = await db.execute(
            select(func.count(User.id)).where(User.subscription_tier == tier)
        )
        users_by_tier[tier.value] = tier_count_result.scalar() or 0
    
    # New users today
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    new_today_result = await db.execute(
        select(func.count(User.id)).where(User.created_at >= today)
    )
    new_users_today = new_today_result.scalar() or 0
    
    # New users this week
    week_ago = datetime.utcnow() - timedelta(days=7)
    new_week_result = await db.execute(
        select(func.count(User.id)).where(User.created_at >= week_ago)
    )
    new_users_week = new_week_result.scalar() or 0
    
    # Calculate revenue (simplified - based on paid tiers)
    from ..core.config import SUBSCRIPTION_TIERS
    total_revenue = 0
    for tier, count in users_by_tier.items():
        tier_info = SUBSCRIPTION_TIERS.get(tier, {})
        total_revenue += tier_info.get("price", 0) * count
    
    return AdminStats(
        total_users=total_users,
        active_users=active_users,
        total_bots=total_bots,
        active_bots=active_bots,
        total_trades=total_trades,
        total_revenue=total_revenue,
        users_by_tier=users_by_tier,
        new_users_today=new_users_today,
        new_users_week=new_users_week
    )


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    role: Optional[UserRole] = Query(None),
    tier: Optional[SubscriptionTier] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """List all users (admin only)."""
    query = select(User)
    
    if role:
        query = query.where(User.role == role)
    if tier:
        query = query.where(User.subscription_tier == tier)
    if search:
        query = query.where(
            (User.name.ilike(f"%{search}%")) | 
            (User.email.ilike(f"%{search}%"))
        )
    
    query = query.order_by(User.created_at.desc()).offset(offset).limit(limit)
    
    result = await db.execute(query)
    users = result.scalars().all()
    
    return users


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get user details (admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    update_data: AdminUserUpdate,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update user (admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if update_data.role is not None:
        user.role = update_data.role
    if update_data.subscription_tier is not None:
        user.subscription_tier = update_data.subscription_tier
    
    await db.commit()
    await db.refresh(user)
    
    return user


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Delete user (admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Don't allow deleting yourself
    if user.id == current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    await db.delete(user)
    await db.commit()
    
    return {"success": True, "message": "User deleted"}


@router.get("/activity")
async def get_recent_activity(
    limit: int = Query(50, le=200),
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get recent platform activity (admin only)."""
    # Get recent trades
    trades_result = await db.execute(
        select(Trade).order_by(Trade.created_at.desc()).limit(limit)
    )
    recent_trades = trades_result.scalars().all()
    
    # Get recent signups
    users_result = await db.execute(
        select(User).order_by(User.created_at.desc()).limit(limit)
    )
    recent_users = users_result.scalars().all()
    
    # Get recent bots
    bots_result = await db.execute(
        select(TradingBot).order_by(TradingBot.created_at.desc()).limit(limit)
    )
    recent_bots = bots_result.scalars().all()
    
    return {
        "recent_trades": [
            {
                "id": t.id,
                "symbol": t.symbol,
                "side": t.side,
                "quantity": t.quantity,
                "price": t.price,
                "created_at": t.created_at
            }
            for t in recent_trades
        ],
        "recent_users": [
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "tier": u.subscription_tier.value,
                "created_at": u.created_at
            }
            for u in recent_users
        ],
        "recent_bots": [
            {
                "id": b.id,
                "name": b.name,
                "strategy": b.strategy.value,
                "status": b.status.value,
                "created_at": b.created_at
            }
            for b in recent_bots
        ]
    }
