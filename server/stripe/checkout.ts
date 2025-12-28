import Stripe from "stripe";
import { SUBSCRIPTION_TIERS, SubscriptionTier } from "./products";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

interface CreateCheckoutSessionParams {
  userId: number;
  userEmail: string;
  userName: string;
  tier: SubscriptionTier;
  origin: string;
}

/**
 * Create a Stripe Checkout Session for subscription
 */
export async function createCheckoutSession({
  userId,
  userEmail,
  userName,
  tier,
  origin,
}: CreateCheckoutSessionParams): Promise<{ url: string }> {
  const tierConfig = SUBSCRIPTION_TIERS[tier];

  if (tier === "free") {
    throw new Error("Cannot create checkout session for free tier");
  }

  // Create or get price ID
  // In production, you would have pre-created prices in Stripe Dashboard
  // and store their IDs in environment variables
  const priceId = tierConfig.priceId;

  if (!priceId) {
    // Create a price on-the-fly for development
    // In production, use pre-created prices from Stripe Dashboard
    const product = await stripe.products.create({
      name: `TradoVerse ${tierConfig.name}`,
      description: tierConfig.description,
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: tierConfig.price * 100, // Convert to cents
      currency: "usd",
      recurring: {
        interval: "month",
      },
    });

    // Use the newly created price
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      customer_email: userEmail,
      client_reference_id: userId.toString(),
      metadata: {
        user_id: userId.toString(),
        customer_email: userEmail,
        customer_name: userName,
        tier: tier,
      },
      allow_promotion_codes: true,
      success_url: `${origin}/dashboard?subscription=success&tier=${tier}`,
      cancel_url: `${origin}/pricing?subscription=canceled`,
    });

    return { url: session.url! };
  }

  // Use existing price ID
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    customer_email: userEmail,
    client_reference_id: userId.toString(),
    metadata: {
      user_id: userId.toString(),
      customer_email: userEmail,
      customer_name: userName,
      tier: tier,
    },
    allow_promotion_codes: true,
    success_url: `${origin}/dashboard?subscription=success&tier=${tier}`,
    cancel_url: `${origin}/pricing?subscription=canceled`,
  });

  return { url: session.url! };
}

/**
 * Create a Stripe Customer Portal session for managing subscriptions
 */
export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
): Promise<{ url: string }> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return { url: session.url };
}

/**
 * Get subscription details for a customer
 */
export async function getSubscriptionDetails(subscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  return {
    id: subscription.id,
    status: subscription.status,
    currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    priceAmount: subscription.items.data[0]?.price?.unit_amount || 0,
  };
}

/**
 * Cancel a subscription at period end
 */
export async function cancelSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });

  return {
    id: subscription.id,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
  };
}

/**
 * Reactivate a canceled subscription
 */
export async function reactivateSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });

  return {
    id: subscription.id,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
}
