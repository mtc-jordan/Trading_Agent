"""
TradoVerse Authentication API Routes
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..core.database import get_db
from ..core.security import create_access_token, get_current_user
from ..models.models import User
from ..schemas.schemas import Token, LoginRequest, UserResponse

router = APIRouter()


@router.post("/login", response_model=Token)
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticate user via OAuth and return JWT token.
    Creates user if not exists.
    """
    # Check if user exists
    result = await db.execute(
        select(User).where(User.open_id == request.open_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        # Create new user
        user = User(
            open_id=request.open_id,
            email=request.email,
            name=request.name,
            login_method=request.login_method,
            last_signed_in=datetime.utcnow()
        )
        db.add(user)
        await db.flush()
    else:
        # Update last signed in
        user.last_signed_in = datetime.utcnow()
        if request.email:
            user.email = request.email
        if request.name:
            user.name = request.name
    
    await db.commit()
    await db.refresh(user)
    
    # Create access token
    token_data = {
        "sub": user.id,
        "open_id": user.open_id,
        "email": user.email,
        "name": user.name,
        "role": user.role.value,
        "subscription_tier": user.subscription_tier.value
    }
    access_token = create_access_token(token_data)
    
    return Token(access_token=access_token)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current authenticated user information."""
    result = await db.execute(
        select(User).where(User.id == current_user["id"])
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """
    Logout current user.
    Note: JWT tokens are stateless, so this just returns success.
    Client should discard the token.
    """
    return {"success": True, "message": "Logged out successfully"}


@router.post("/refresh", response_model=Token)
async def refresh_token(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Refresh the access token."""
    result = await db.execute(
        select(User).where(User.id == current_user["id"])
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Create new access token
    token_data = {
        "sub": user.id,
        "open_id": user.open_id,
        "email": user.email,
        "name": user.name,
        "role": user.role.value,
        "subscription_tier": user.subscription_tier.value
    }
    access_token = create_access_token(token_data)
    
    return Token(access_token=access_token)
