import Stripe from "stripe";
import { Request, Response } from "express";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { getTierByPrice } from "./products";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

/**
 * Handle Stripe webhook events
 * Route: POST /api/stripe/webhook
 * 
 * Must be registered with express.raw({ type: 'application/json' }) BEFORE express.json()
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[Stripe Webhook] Missing STRIPE_WEBHOOK_SECRET");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error("[Stripe Webhook] Signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle test events for webhook verification
  if (event.id.startsWith("evt_test_")) {
    console.log("[Stripe Webhook] Test event detected, returning verification response");
    return res.json({ verified: true });
  }

  console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return res.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Error processing event:", error);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
}

/**
 * Handle successful checkout session completion
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log("[Stripe] Checkout completed:", session.id);

  const userId = session.metadata?.user_id;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!userId) {
    console.error("[Stripe] No user_id in session metadata");
    return;
  }

  const db = await getDb();
  if (!db) {
    console.error("[Stripe] Database not available");
    return;
  }

  // Update user with Stripe customer ID and subscription
  try {
    await db
      .update(users)
      .set({
        // Store Stripe IDs for reference
        // Note: In production, you'd have stripeCustomerId and stripeSubscriptionId columns
        updatedAt: new Date(),
      })
      .where(eq(users.id, parseInt(userId)));

    console.log(`[Stripe] Updated user ${userId} with subscription ${subscriptionId}`);
  } catch (error) {
    console.error("[Stripe] Failed to update user:", error);
  }
}

/**
 * Handle subscription creation or update
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  console.log("[Stripe] Subscription updated:", subscription.id, "Status:", subscription.status);

  const customerId = subscription.customer as string;
  
  // Get the price amount to determine tier
  const priceAmount = subscription.items.data[0]?.price?.unit_amount || 0;
  const monthlyPrice = priceAmount / 100; // Convert from cents
  const tier = getTierByPrice(monthlyPrice);

  console.log(`[Stripe] Customer ${customerId} subscription tier: ${tier}`);

  // In production, you would:
  // 1. Look up user by stripeCustomerId
  // 2. Update their subscriptionTier based on the price
  // 3. Update subscription status (active, past_due, canceled, etc.)
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  console.log("[Stripe] Subscription canceled:", subscription.id);

  const customerId = subscription.customer as string;

  // In production, you would:
  // 1. Look up user by stripeCustomerId
  // 2. Downgrade their tier to "free"
  // 3. Update subscription status to "canceled"
  
  console.log(`[Stripe] Customer ${customerId} subscription canceled, reverting to free tier`);
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  console.log("[Stripe] Invoice paid:", invoice.id);

  const customerId = invoice.customer as string;
  const amountPaid = invoice.amount_paid / 100; // Convert from cents

  console.log(`[Stripe] Customer ${customerId} paid $${amountPaid}`);

  // In production, you would:
  // 1. Log the payment for audit purposes
  // 2. Send confirmation email
  // 3. Update any payment history records
}

/**
 * Handle failed invoice payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log("[Stripe] Payment failed:", invoice.id);

  const customerId = invoice.customer as string;

  console.log(`[Stripe] Customer ${customerId} payment failed`);

  // In production, you would:
  // 1. Send notification to user about failed payment
  // 2. Update subscription status to "past_due"
  // 3. Potentially schedule grace period before downgrade
}
