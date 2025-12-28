"""
TradoVerse Marketplace API Routes
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from ..core.database import get_db
from ..core.security import get_current_user
from ..models.models import MarketplaceListing, TradingBot, User
from ..schemas.schemas import (
    MarketplaceListingCreate, MarketplaceListingResponse,
    MarketplaceListingWithBot, LeaderboardEntry
)

router = APIRouter()


@router.get("/listings", response_model=List[MarketplaceListingWithBot])
async def list_marketplace_listings(
    category: Optional[str] = Query(None),
    sort_by: str = Query("rating", enum=["rating", "copies", "price", "newest"]),
    limit: int = Query(20, le=100),
    offset: int = Query(0),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List marketplace listings."""
    query = select(MarketplaceListing).where(MarketplaceListing.is_active == True)
    
    if category:
        query = query.where(MarketplaceListing.category == category)
    
    # Sort
    if sort_by == "rating":
        query = query.order_by(desc(MarketplaceListing.rating))
    elif sort_by == "copies":
        query = query.order_by(desc(MarketplaceListing.total_copies))
    elif sort_by == "price":
        query = query.order_by(MarketplaceListing.price)
    else:
        query = query.order_by(desc(MarketplaceListing.created_at))
    
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    listings = result.scalars().all()
    
    # Fetch related data
    response = []
    for listing in listings:
        # Get bot
        bot_result = await db.execute(
            select(TradingBot).where(TradingBot.id == listing.bot_id)
        )
        bot = bot_result.scalar_one_or_none()
        
        # Get seller
        seller_result = await db.execute(
            select(User).where(User.id == listing.seller_id)
        )
        seller = seller_result.scalar_one_or_none()
        
        if bot and seller:
            response.append(MarketplaceListingWithBot(
                id=listing.id,
                bot_id=listing.bot_id,
                seller_id=listing.seller_id,
                title=listing.title,
                description=listing.description,
                price=listing.price,
                category=listing.category,
                total_copies=listing.total_copies,
                rating=listing.rating,
                total_reviews=listing.total_reviews,
                is_featured=listing.is_featured,
                is_active=listing.is_active,
                created_at=listing.created_at,
                bot=bot,
                seller_name=seller.name or "Anonymous"
            ))
    
    return response


@router.post("/listings", response_model=MarketplaceListingResponse)
async def create_listing(
    listing_data: MarketplaceListingCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new marketplace listing."""
    # Verify bot ownership
    result = await db.execute(
        select(TradingBot).where(
            TradingBot.id == listing_data.bot_id,
            TradingBot.user_id == current_user["id"]
        )
    )
    bot = result.scalar_one_or_none()
    
    if not bot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bot not found or you don't own it"
        )
    
    # Check if already listed
    existing = await db.execute(
        select(MarketplaceListing).where(
            MarketplaceListing.bot_id == listing_data.bot_id,
            MarketplaceListing.is_active == True
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bot is already listed in marketplace"
        )
    
    listing = MarketplaceListing(
        bot_id=listing_data.bot_id,
        seller_id=current_user["id"],
        title=listing_data.title,
        description=listing_data.description,
        price=listing_data.price,
        category=listing_data.category
    )
    
    db.add(listing)
    await db.commit()
    await db.refresh(listing)
    
    return listing


@router.get("/listings/{listing_id}")
async def get_listing(
    listing_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific marketplace listing."""
    result = await db.execute(
        select(MarketplaceListing).where(MarketplaceListing.id == listing_id)
    )
    listing = result.scalar_one_or_none()
    
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )
    
    # Get bot and seller
    bot_result = await db.execute(
        select(TradingBot).where(TradingBot.id == listing.bot_id)
    )
    bot = bot_result.scalar_one_or_none()
    
    seller_result = await db.execute(
        select(User).where(User.id == listing.seller_id)
    )
    seller = seller_result.scalar_one_or_none()
    
    return {
        "listing": listing,
        "bot": bot,
        "seller_name": seller.name if seller else "Anonymous"
    }


@router.post("/listings/{listing_id}/copy")
async def copy_bot(
    listing_id: int,
    account_id: int = Query(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Copy a bot from marketplace."""
    # Get listing
    result = await db.execute(
        select(MarketplaceListing).where(
            MarketplaceListing.id == listing_id,
            MarketplaceListing.is_active == True
        )
    )
    listing = result.scalar_one_or_none()
    
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )
    
    # Get original bot
    bot_result = await db.execute(
        select(TradingBot).where(TradingBot.id == listing.bot_id)
    )
    original_bot = bot_result.scalar_one_or_none()
    
    if not original_bot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Original bot not found"
        )
    
    # Create copy
    new_bot = TradingBot(
        user_id=current_user["id"],
        account_id=account_id,
        name=f"{original_bot.name} (Copy)",
        description=original_bot.description,
        strategy=original_bot.strategy,
        symbols=original_bot.symbols,
        risk_settings=original_bot.risk_settings
    )
    
    db.add(new_bot)
    
    # Update listing copy count
    listing.total_copies += 1
    
    await db.commit()
    await db.refresh(new_bot)
    
    return {"success": True, "bot_id": new_bot.id, "message": "Bot copied successfully"}


@router.delete("/listings/{listing_id}")
async def delete_listing(
    listing_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a marketplace listing."""
    result = await db.execute(
        select(MarketplaceListing).where(
            MarketplaceListing.id == listing_id,
            MarketplaceListing.seller_id == current_user["id"]
        )
    )
    listing = result.scalar_one_or_none()
    
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )
    
    listing.is_active = False
    await db.commit()
    
    return {"success": True, "message": "Listing removed"}


@router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard(
    period: str = Query("all", enum=["day", "week", "month", "all"]),
    limit: int = Query(20, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get bot performance leaderboard."""
    # Get top performing bots
    query = select(TradingBot).where(
        TradingBot.total_trades > 0
    ).order_by(desc(TradingBot.total_pnl)).limit(limit)
    
    result = await db.execute(query)
    bots = result.scalars().all()
    
    leaderboard = []
    for rank, bot in enumerate(bots, 1):
        # Get user
        user_result = await db.execute(
            select(User).where(User.id == bot.user_id)
        )
        user = user_result.scalar_one_or_none()
        
        win_rate = (bot.winning_trades / bot.total_trades * 100) if bot.total_trades > 0 else 0
        
        leaderboard.append(LeaderboardEntry(
            rank=rank,
            bot_id=bot.id,
            bot_name=bot.name,
            user_name=user.name if user else "Anonymous",
            total_return=round(bot.total_pnl, 2),
            sharpe_ratio=0,  # Would need to calculate
            win_rate=round(win_rate, 2),
            total_trades=bot.total_trades
        ))
    
    return leaderboard


@router.get("/categories")
async def get_categories(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get marketplace categories."""
    return [
        {"id": "momentum", "name": "Momentum", "description": "Trend-following strategies"},
        {"id": "mean_reversion", "name": "Mean Reversion", "description": "Counter-trend strategies"},
        {"id": "arbitrage", "name": "Arbitrage", "description": "Market inefficiency strategies"},
        {"id": "ml_based", "name": "ML-Based", "description": "Machine learning strategies"},
        {"id": "other", "name": "Other", "description": "Other strategies"}
    ]
