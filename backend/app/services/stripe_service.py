"""
TradoVerse Stripe Service

Handles subscription management, checkout sessions, and webhooks.
"""
from typing import Optional, Dict, Any
import stripe
from datetime import datetime

from ..core.config import get_settings, SUBSCRIPTION_TIERS
from ..schemas.schemas import SubscriptionTier

settings = get_settings()

# Initialize Stripe
if settings.STRIPE_SECRET_KEY:
    stripe.api_key = settings.STRIPE_SECRET_KEY


# Stripe Price IDs (should be created in Stripe Dashboard)
STRIPE_PRICE_IDS = {
    "starter_monthly": "price_starter_monthly",
    "starter_yearly": "price_starter_yearly",
    "pro_monthly": "price_pro_monthly",
    "pro_yearly": "price_pro_yearly",
    "elite_monthly": "price_elite_monthly",
    "elite_yearly": "price_elite_yearly",
}


class StripeService:
    """Service for Stripe payment operations."""
    
    async def create_customer(
        self, 
        email: str, 
        name: Optional[str] = None,
        metadata: Dict[str, str] = None
    ) -> Optional[str]:
        """
        Create a Stripe customer.
        
        Args:
            email: Customer email
            name: Customer name
            metadata: Additional metadata
        
        Returns:
            Stripe customer ID
        """
        try:
            customer = stripe.Customer.create(
                email=email,
                name=name,
                metadata=metadata or {}
            )
            return customer.id
        except stripe.error.StripeError as e:
            print(f"Stripe error creating customer: {e}")
            return None
    
    async def create_checkout_session(
        self,
        customer_id: str,
        tier: SubscriptionTier,
        billing_period: str = "monthly",
        success_url: str = "",
        cancel_url: str = ""
    ) -> Optional[Dict[str, str]]:
        """
        Create a Stripe checkout session for subscription.
        
        Args:
            customer_id: Stripe customer ID
            tier: Subscription tier
            billing_period: 'monthly' or 'yearly'
            success_url: URL to redirect on success
            cancel_url: URL to redirect on cancel
        
        Returns:
            Dictionary with session_id and url
        """
        try:
            price_key = f"{tier.value}_{billing_period}"
            price_id = STRIPE_PRICE_IDS.get(price_key)
            
            if not price_id:
                # Create price dynamically if not pre-configured
                tier_info = SUBSCRIPTION_TIERS.get(tier.value)
                if not tier_info:
                    return None
                
                price = tier_info["price"]
                if billing_period == "yearly":
                    price = price * 10  # 2 months free
                
                # For demo, use a test price or create one
                # In production, prices should be pre-created in Stripe Dashboard
                price_id = await self._get_or_create_price(tier.value, price, billing_period)
            
            session = stripe.checkout.Session.create(
                customer=customer_id,
                payment_method_types=["card"],
                line_items=[{
                    "price": price_id,
                    "quantity": 1,
                }],
                mode="subscription",
                success_url=success_url + "?session_id={CHECKOUT_SESSION_ID}",
                cancel_url=cancel_url,
                metadata={
                    "tier": tier.value,
                    "billing_period": billing_period
                }
            )
            
            return {
                "session_id": session.id,
                "url": session.url
            }
        except stripe.error.StripeError as e:
            print(f"Stripe error creating checkout session: {e}")
            return None
    
    async def _get_or_create_price(
        self, 
        tier: str, 
        amount: float, 
        billing_period: str
    ) -> str:
        """Get or create a Stripe price for a tier."""
        try:
            # First, try to find existing product
            products = stripe.Product.list(limit=100)
            product_id = None
            
            for product in products.data:
                if product.metadata.get("tier") == tier:
                    product_id = product.id
                    break
            
            # Create product if not exists
            if not product_id:
                product = stripe.Product.create(
                    name=f"TradoVerse {tier.title()} Plan",
                    metadata={"tier": tier}
                )
                product_id = product.id
            
            # Create price
            interval = "month" if billing_period == "monthly" else "year"
            price = stripe.Price.create(
                product=product_id,
                unit_amount=int(amount * 100),  # Convert to cents
                currency="usd",
                recurring={"interval": interval},
                metadata={"tier": tier, "billing_period": billing_period}
            )
            
            return price.id
        except stripe.error.StripeError as e:
            print(f"Stripe error creating price: {e}")
            raise
    
    async def create_portal_session(
        self, 
        customer_id: str, 
        return_url: str
    ) -> Optional[str]:
        """
        Create a Stripe billing portal session.
        
        Args:
            customer_id: Stripe customer ID
            return_url: URL to return to after portal
        
        Returns:
            Portal session URL
        """
        try:
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=return_url
            )
            return session.url
        except stripe.error.StripeError as e:
            print(f"Stripe error creating portal session: {e}")
            return None
    
    async def cancel_subscription(self, subscription_id: str) -> bool:
        """
        Cancel a subscription at period end.
        
        Args:
            subscription_id: Stripe subscription ID
        
        Returns:
            True if successful
        """
        try:
            stripe.Subscription.modify(
                subscription_id,
                cancel_at_period_end=True
            )
            return True
        except stripe.error.StripeError as e:
            print(f"Stripe error canceling subscription: {e}")
            return False
    
    async def reactivate_subscription(self, subscription_id: str) -> bool:
        """
        Reactivate a canceled subscription.
        
        Args:
            subscription_id: Stripe subscription ID
        
        Returns:
            True if successful
        """
        try:
            stripe.Subscription.modify(
                subscription_id,
                cancel_at_period_end=False
            )
            return True
        except stripe.error.StripeError as e:
            print(f"Stripe error reactivating subscription: {e}")
            return False
    
    async def get_subscription(self, subscription_id: str) -> Optional[Dict[str, Any]]:
        """
        Get subscription details.
        
        Args:
            subscription_id: Stripe subscription ID
        
        Returns:
            Subscription details
        """
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            return {
                "id": subscription.id,
                "status": subscription.status,
                "current_period_start": datetime.fromtimestamp(subscription.current_period_start),
                "current_period_end": datetime.fromtimestamp(subscription.current_period_end),
                "cancel_at_period_end": subscription.cancel_at_period_end,
                "tier": subscription.metadata.get("tier", "free")
            }
        except stripe.error.StripeError as e:
            print(f"Stripe error getting subscription: {e}")
            return None
    
    def verify_webhook_signature(
        self, 
        payload: bytes, 
        signature: str
    ) -> Optional[Dict[str, Any]]:
        """
        Verify and parse a Stripe webhook event.
        
        Args:
            payload: Raw request body
            signature: Stripe signature header
        
        Returns:
            Parsed event data
        """
        try:
            event = stripe.Webhook.construct_event(
                payload,
                signature,
                settings.STRIPE_WEBHOOK_SECRET
            )
            return {
                "type": event.type,
                "data": event.data.object
            }
        except (stripe.error.SignatureVerificationError, ValueError) as e:
            print(f"Webhook signature verification failed: {e}")
            return None


# Global Stripe service instance
stripe_service = StripeService()


async def create_checkout(
    customer_id: str,
    tier: SubscriptionTier,
    billing_period: str,
    success_url: str,
    cancel_url: str
) -> Optional[Dict[str, str]]:
    """Create checkout session."""
    return await stripe_service.create_checkout_session(
        customer_id, tier, billing_period, success_url, cancel_url
    )


async def create_portal(customer_id: str, return_url: str) -> Optional[str]:
    """Create billing portal session."""
    return await stripe_service.create_portal_session(customer_id, return_url)


async def cancel_sub(subscription_id: str) -> bool:
    """Cancel subscription."""
    return await stripe_service.cancel_subscription(subscription_id)


def verify_webhook(payload: bytes, signature: str) -> Optional[Dict[str, Any]]:
    """Verify webhook signature."""
    return stripe_service.verify_webhook_signature(payload, signature)
