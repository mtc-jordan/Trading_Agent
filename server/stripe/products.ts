/**
 * TradoVerse Subscription Products Configuration
 * 
 * Defines the subscription tiers and their features for the platform.
 * These are used to create Stripe products and prices.
 */

export const SUBSCRIPTION_TIERS = {
  free: {
    id: "free",
    name: "Free",
    description: "Perfect for learning and paper trading",
    price: 0,
    priceId: null, // Free tier doesn't need a Stripe price
    features: {
      maxBots: 1,
      maxAccounts: 1,
      aiAgents: 2,
      backtestMonths: 3,
      liveTradingEnabled: false,
      apiAccessEnabled: false,
      prioritySupport: false,
    },
    featureList: [
      "Paper trading only",
      "2 AI agents",
      "1 trading bot",
      "1 trading account",
      "3-month backtest history",
    ],
  },
  starter: {
    id: "starter",
    name: "Starter",
    description: "For serious traders getting started",
    price: 29,
    priceId: process.env.STRIPE_STARTER_PRICE_ID || null,
    features: {
      maxBots: 3,
      maxAccounts: 2,
      aiAgents: 4,
      backtestMonths: 12,
      liveTradingEnabled: true,
      apiAccessEnabled: false,
      prioritySupport: false,
    },
    featureList: [
      "Paper & live trading",
      "4 AI agents",
      "3 trading bots",
      "2 trading accounts",
      "1-year backtest history",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "Full power for active traders",
    price: 79,
    priceId: process.env.STRIPE_PRO_PRICE_ID || null,
    features: {
      maxBots: 10,
      maxAccounts: 5,
      aiAgents: 7,
      backtestMonths: 60,
      liveTradingEnabled: true,
      apiAccessEnabled: true,
      prioritySupport: false,
    },
    featureList: [
      "Paper & live trading",
      "All 7 AI agents",
      "10 trading bots",
      "5 trading accounts",
      "5-year backtest history",
      "API access",
    ],
  },
  elite: {
    id: "elite",
    name: "Elite",
    description: "Maximum power for professionals",
    price: 199,
    priceId: process.env.STRIPE_ELITE_PRICE_ID || null,
    features: {
      maxBots: -1, // Unlimited
      maxAccounts: -1, // Unlimited
      aiAgents: 7,
      backtestMonths: -1, // Full history (2010+)
      liveTradingEnabled: true,
      apiAccessEnabled: true,
      prioritySupport: true,
    },
    featureList: [
      "Paper & live trading",
      "All 7 AI agents",
      "Unlimited trading bots",
      "Unlimited accounts",
      "Full backtest history (2010+)",
      "API access",
      "Priority support",
    ],
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

export function getTierFeatures(tier: SubscriptionTier) {
  return SUBSCRIPTION_TIERS[tier].features;
}

export function getTierByPrice(price: number): SubscriptionTier {
  if (price >= 199) return "elite";
  if (price >= 79) return "pro";
  if (price >= 29) return "starter";
  return "free";
}

export function canAccessFeature(
  tier: SubscriptionTier,
  feature: keyof typeof SUBSCRIPTION_TIERS.free.features
): boolean {
  const features = SUBSCRIPTION_TIERS[tier].features;
  const value = features[feature];
  
  if (typeof value === "boolean") {
    return value;
  }
  
  // For numeric limits, any positive value or -1 (unlimited) means access is granted
  return true;  // All numeric values in our config are > 0 or -1 (unlimited)
}

export function isWithinLimit(
  tier: SubscriptionTier,
  feature: "maxBots" | "maxAccounts" | "backtestMonths",
  currentCount: number
): boolean {
  const limit = SUBSCRIPTION_TIERS[tier].features[feature];
  
  // -1 means unlimited
  if (limit === -1) return true;
  
  return currentCount < limit;
}
