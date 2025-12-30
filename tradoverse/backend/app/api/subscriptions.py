"""
TradoVerse Subscriptions API Routes
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..core.database import get_db
from ..core.security import get_current_user
from ..core.config import SUBSCRIPTION_TIERS, get_tier_features
from ..models.models import User, SubscriptionTier
from ..schemas.schemas import CheckoutSessionRequest, CheckoutSessionResponse
from ..services.stripe_service import (
    stripe_service, create_checkout, create_portal, cancel_sub, verify_webhook
)

router = APIRouter()


@router.get("/tiers")
async def get_subscription_tiers():
    """Get all available subscription tiers."""
    tiers = []
    for tier_id, tier_info in SUBSCRIPTION_TIERS.items():
        features = get_tier_features(tier_id)
        tiers.append({
            "id": tier_id,
            "name": tier_info["name"],
            "description": tier_info["description"],
            "price": tier_info["price"],
            "features": features,
            "feature_list": tier_info["features"]
        })
    return {"tiers": tiers}


@router.get("/current")
async def get_current_subscription(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's subscription."""
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
    
    return {
        "tier": tier,
        "tier_info": tier_info,
        "features": features,
        "stripe_customer_id": user.stripe_customer_id,
        "stripe_subscription_id": user.stripe_subscription_id
    }


@router.post("/checkout", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    request: CheckoutSessionRequest,
    billing_period: str = Query("monthly", enum=["monthly", "yearly"]),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a Stripe checkout session for subscription."""
    result = await db.execute(
        select(User).where(User.id == current_user["id"])
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Create Stripe customer if not exists
    if not user.stripe_customer_id:
        customer_id = await stripe_service.create_customer(
            email=user.email or f"user_{user.id}@tradoverse.com",
            name=user.name,
            metadata={"user_id": str(user.id)}
        )
        if customer_id:
            user.stripe_customer_id = customer_id
            await db.commit()
    
    if not user.stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create Stripe customer"
        )
    
    # Create checkout session
    session = await create_checkout(
        customer_id=user.stripe_customer_id,
        tier=request.tier,
        billing_period=billing_period,
        success_url=request.success_url,
        cancel_url=request.cancel_url
    )
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create checkout session"
        )
    
    return CheckoutSessionResponse(
        session_id=session["session_id"],
        url=session["url"]
    )


@router.post("/portal")
async def create_billing_portal(
    return_url: str = Query(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a Stripe billing portal session."""
    result = await db.execute(
        select(User).where(User.id == current_user["id"])
    )
    user = result.scalar_one_or_none()
    
    if not user or not user.stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active subscription found"
        )
    
    portal_url = await create_portal(user.stripe_customer_id, return_url)
    
    if not portal_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create billing portal"
        )
    
    return {"url": portal_url}


@router.post("/cancel")
async def cancel_subscription(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cancel current subscription."""
    result = await db.execute(
        select(User).where(User.id == current_user["id"])
    )
    user = result.scalar_one_or_none()
    
    if not user or not user.stripe_subscription_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active subscription found"
        )
    
    success = await cancel_sub(user.stripe_subscription_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel subscription"
        )
    
    return {"success": True, "message": "Subscription will be canceled at end of billing period"}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Stripe webhook events."""
    payload = await request.body()
    signature = request.headers.get("stripe-signature", "")
    
    event = verify_webhook(payload, signature)
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook signature"
        )
    
    event_type = event["type"]
    data = event["data"]
    
    # Handle different event types
    if event_type == "checkout.session.completed":
        # Subscription created
        customer_id = data.get("customer")
        subscription_id = data.get("subscription")
        tier = data.get("metadata", {}).get("tier", "starter")
        
        result = await db.execute(
            select(User).where(User.stripe_customer_id == customer_id)
        )
        user = result.scalar_one_or_none()
        
        if user:
            user.stripe_subscription_id = subscription_id
            user.subscription_tier = SubscriptionTier(tier)
            await db.commit()
    
    elif event_type == "customer.subscription.updated":
        # Subscription updated
        subscription_id = data.get("id")
        status_str = data.get("status")
        
        result = await db.execute(
            select(User).where(User.stripe_subscription_id == subscription_id)
        )
        user = result.scalar_one_or_none()
        
        if user and status_str == "canceled":
            user.subscription_tier = SubscriptionTier.FREE
            user.stripe_subscription_id = None
            await db.commit()
    
    elif event_type == "customer.subscription.deleted":
        # Subscription canceled
        subscription_id = data.get("id")
        
        result = await db.execute(
            select(User).where(User.stripe_subscription_id == subscription_id)
        )
        user = result.scalar_one_or_none()
        
        if user:
            user.subscription_tier = SubscriptionTier.FREE
            user.stripe_subscription_id = None
            await db.commit()
    
    elif event_type == "invoice.payment_failed":
        # Payment failed
        customer_id = data.get("customer")
        
        result = await db.execute(
            select(User).where(User.stripe_customer_id == customer_id)
        )
        user = result.scalar_one_or_none()
        
        if user:
            # Could send notification, downgrade, etc.
            pass
    
    return {"received": True}
