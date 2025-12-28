import { describe, expect, it, vi } from "vitest";
import { SUBSCRIPTION_TIERS, getTierFeatures, getTierByPrice, canAccessFeature, isWithinLimit } from "./stripe/products";

describe("Subscription Tiers Configuration", () => {
  it("has all required tiers defined", () => {
    expect(SUBSCRIPTION_TIERS).toHaveProperty("free");
    expect(SUBSCRIPTION_TIERS).toHaveProperty("starter");
    expect(SUBSCRIPTION_TIERS).toHaveProperty("pro");
    expect(SUBSCRIPTION_TIERS).toHaveProperty("elite");
  });

  it("free tier has correct pricing", () => {
    expect(SUBSCRIPTION_TIERS.free.price).toBe(0);
    expect(SUBSCRIPTION_TIERS.free.priceId).toBeNull();
  });

  it("paid tiers have correct pricing", () => {
    expect(SUBSCRIPTION_TIERS.starter.price).toBe(29);
    expect(SUBSCRIPTION_TIERS.pro.price).toBe(79);
    expect(SUBSCRIPTION_TIERS.elite.price).toBe(199);
  });

  it("each tier has required feature properties", () => {
    const requiredFeatures = [
      "maxBots",
      "maxAccounts",
      "aiAgents",
      "backtestMonths",
      "liveTradingEnabled",
      "apiAccessEnabled",
      "prioritySupport",
    ];

    Object.values(SUBSCRIPTION_TIERS).forEach((tier) => {
      requiredFeatures.forEach((feature) => {
        expect(tier.features).toHaveProperty(feature);
      });
    });
  });

  it("each tier has a feature list for display", () => {
    Object.values(SUBSCRIPTION_TIERS).forEach((tier) => {
      expect(Array.isArray(tier.featureList)).toBe(true);
      expect(tier.featureList.length).toBeGreaterThan(0);
    });
  });
});

describe("getTierFeatures", () => {
  it("returns correct features for free tier", () => {
    const features = getTierFeatures("free");
    expect(features.maxBots).toBe(1);
    expect(features.aiAgents).toBe(2);
    expect(features.liveTradingEnabled).toBe(false);
  });

  it("returns correct features for pro tier", () => {
    const features = getTierFeatures("pro");
    expect(features.maxBots).toBe(10);
    expect(features.aiAgents).toBe(7);
    expect(features.liveTradingEnabled).toBe(true);
    expect(features.apiAccessEnabled).toBe(true);
  });

  it("returns correct features for elite tier", () => {
    const features = getTierFeatures("elite");
    expect(features.maxBots).toBe(-1); // Unlimited
    expect(features.maxAccounts).toBe(-1); // Unlimited
    expect(features.prioritySupport).toBe(true);
  });
});

describe("getTierByPrice", () => {
  it("returns free for $0", () => {
    expect(getTierByPrice(0)).toBe("free");
  });

  it("returns starter for $29", () => {
    expect(getTierByPrice(29)).toBe("starter");
  });

  it("returns pro for $79", () => {
    expect(getTierByPrice(79)).toBe("pro");
  });

  it("returns elite for $199", () => {
    expect(getTierByPrice(199)).toBe("elite");
  });

  it("returns appropriate tier for intermediate prices", () => {
    expect(getTierByPrice(15)).toBe("free");
    expect(getTierByPrice(50)).toBe("starter");
    expect(getTierByPrice(100)).toBe("pro");
    expect(getTierByPrice(300)).toBe("elite");
  });
});

describe("canAccessFeature", () => {
  it("free tier cannot access live trading", () => {
    expect(canAccessFeature("free", "liveTradingEnabled")).toBe(false);
  });

  it("starter tier can access live trading", () => {
    expect(canAccessFeature("starter", "liveTradingEnabled")).toBe(true);
  });

  it("free tier cannot access API", () => {
    expect(canAccessFeature("free", "apiAccessEnabled")).toBe(false);
  });

  it("pro tier can access API", () => {
    expect(canAccessFeature("pro", "apiAccessEnabled")).toBe(true);
  });

  it("elite tier has priority support", () => {
    expect(canAccessFeature("elite", "prioritySupport")).toBe(true);
  });

  it("pro tier does not have priority support", () => {
    expect(canAccessFeature("pro", "prioritySupport")).toBe(false);
  });
});

describe("isWithinLimit", () => {
  it("free tier allows 1 bot", () => {
    expect(isWithinLimit("free", "maxBots", 0)).toBe(true);
    expect(isWithinLimit("free", "maxBots", 1)).toBe(false);
  });

  it("starter tier allows 3 bots", () => {
    expect(isWithinLimit("starter", "maxBots", 0)).toBe(true);
    expect(isWithinLimit("starter", "maxBots", 2)).toBe(true);
    expect(isWithinLimit("starter", "maxBots", 3)).toBe(false);
  });

  it("elite tier has unlimited bots", () => {
    expect(isWithinLimit("elite", "maxBots", 0)).toBe(true);
    expect(isWithinLimit("elite", "maxBots", 100)).toBe(true);
    expect(isWithinLimit("elite", "maxBots", 1000)).toBe(true);
  });

  it("free tier allows 1 account", () => {
    expect(isWithinLimit("free", "maxAccounts", 0)).toBe(true);
    expect(isWithinLimit("free", "maxAccounts", 1)).toBe(false);
  });

  it("pro tier allows 5 accounts", () => {
    expect(isWithinLimit("pro", "maxAccounts", 4)).toBe(true);
    expect(isWithinLimit("pro", "maxAccounts", 5)).toBe(false);
  });

  it("elite tier has unlimited accounts", () => {
    expect(isWithinLimit("elite", "maxAccounts", 50)).toBe(true);
  });

  it("free tier allows 3 months backtest", () => {
    expect(isWithinLimit("free", "backtestMonths", 2)).toBe(true);
    expect(isWithinLimit("free", "backtestMonths", 3)).toBe(false);
  });

  it("elite tier has unlimited backtest history", () => {
    expect(isWithinLimit("elite", "backtestMonths", 120)).toBe(true);
  });
});

describe("Tier Feature Progression", () => {
  it("higher tiers have more bots than lower tiers", () => {
    const free = getTierFeatures("free").maxBots;
    const starter = getTierFeatures("starter").maxBots;
    const pro = getTierFeatures("pro").maxBots;
    const elite = getTierFeatures("elite").maxBots;

    expect(starter).toBeGreaterThan(free);
    expect(pro).toBeGreaterThan(starter);
    // Elite is -1 (unlimited), which is special
    expect(elite).toBe(-1);
  });

  it("higher tiers have more AI agents", () => {
    const free = getTierFeatures("free").aiAgents;
    const starter = getTierFeatures("starter").aiAgents;
    const pro = getTierFeatures("pro").aiAgents;
    const elite = getTierFeatures("elite").aiAgents;

    expect(starter).toBeGreaterThan(free);
    expect(pro).toBeGreaterThan(starter);
    expect(elite).toBe(pro); // Both have all 7 agents
    expect(elite).toBe(7);
  });

  it("all paid tiers have live trading enabled", () => {
    expect(getTierFeatures("free").liveTradingEnabled).toBe(false);
    expect(getTierFeatures("starter").liveTradingEnabled).toBe(true);
    expect(getTierFeatures("pro").liveTradingEnabled).toBe(true);
    expect(getTierFeatures("elite").liveTradingEnabled).toBe(true);
  });
});
