"""
TradoVerse Trading Accounts API Routes
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from ..core.database import get_db
from ..core.security import get_current_user
from ..core.config import get_tier_features, is_within_limit
from ..models.models import User, TradingAccount, AccountType
from ..schemas.schemas import (
    TradingAccountCreate, TradingAccountUpdate, TradingAccountResponse
)

router = APIRouter()


@router.get("/", response_model=List[TradingAccountResponse])
async def list_accounts(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all trading accounts for current user."""
    result = await db.execute(
        select(TradingAccount).where(
            TradingAccount.user_id == current_user["id"]
        ).order_by(TradingAccount.created_at.desc())
    )
    accounts = result.scalars().all()
    return accounts


@router.post("/", response_model=TradingAccountResponse)
async def create_account(
    account_data: TradingAccountCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new trading account."""
    # Check tier limits
    tier = current_user.get("subscription_tier", "free")
    
    # Count existing accounts
    result = await db.execute(
        select(func.count(TradingAccount.id)).where(
            TradingAccount.user_id == current_user["id"]
        )
    )
    current_count = result.scalar() or 0
    
    if not is_within_limit(tier, "max_accounts", current_count):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account limit reached for {tier} tier. Please upgrade to create more accounts."
        )
    
    # Check if live trading is allowed
    features = get_tier_features(tier)
    if account_data.account_type == AccountType.LIVE and not features.get("live_trading_enabled"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Live trading is not available on your current plan. Please upgrade to Starter or higher."
        )
    
    # Create account
    account = TradingAccount(
        user_id=current_user["id"],
        name=account_data.name,
        account_type=account_data.account_type,
        balance=account_data.initial_balance,
        initial_balance=account_data.initial_balance,
        currency=account_data.currency
    )
    
    db.add(account)
    await db.commit()
    await db.refresh(account)
    
    return account


@router.get("/{account_id}", response_model=TradingAccountResponse)
async def get_account(
    account_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific trading account."""
    result = await db.execute(
        select(TradingAccount).where(
            TradingAccount.id == account_id,
            TradingAccount.user_id == current_user["id"]
        )
    )
    account = result.scalar_one_or_none()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    return account


@router.put("/{account_id}", response_model=TradingAccountResponse)
async def update_account(
    account_id: int,
    update_data: TradingAccountUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a trading account."""
    result = await db.execute(
        select(TradingAccount).where(
            TradingAccount.id == account_id,
            TradingAccount.user_id == current_user["id"]
        )
    )
    account = result.scalar_one_or_none()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    # Update fields
    if update_data.name is not None:
        account.name = update_data.name
    if update_data.is_active is not None:
        account.is_active = update_data.is_active
    
    await db.commit()
    await db.refresh(account)
    
    return account


@router.delete("/{account_id}")
async def delete_account(
    account_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a trading account."""
    result = await db.execute(
        select(TradingAccount).where(
            TradingAccount.id == account_id,
            TradingAccount.user_id == current_user["id"]
        )
    )
    account = result.scalar_one_or_none()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    await db.delete(account)
    await db.commit()
    
    return {"success": True, "message": "Account deleted"}


@router.post("/{account_id}/reset")
async def reset_account(
    account_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Reset a paper trading account to initial balance."""
    result = await db.execute(
        select(TradingAccount).where(
            TradingAccount.id == account_id,
            TradingAccount.user_id == current_user["id"]
        )
    )
    account = result.scalar_one_or_none()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    if account.account_type != AccountType.PAPER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only paper trading accounts can be reset"
        )
    
    account.balance = account.initial_balance
    await db.commit()
    await db.refresh(account)
    
    return {"success": True, "message": "Account reset to initial balance", "balance": account.balance}
