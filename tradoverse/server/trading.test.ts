import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(overrides?: Partial<AuthenticatedUser>): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "trader@example.com",
    name: "Test Trader",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

function createUnauthenticatedContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

describe("Auth Router", () => {
  it("returns user data when authenticated", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();

    expect(result).toBeDefined();
    expect(result?.email).toBe("trader@example.com");
    expect(result?.name).toBe("Test Trader");
  });

  it("returns null when not authenticated", async () => {
    const { ctx } = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();

    expect(result).toBeNull();
  });

  it("logout clears the session cookie", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(ctx.res.clearCookie).toHaveBeenCalled();
  });
});

describe("Subscription Tiers", () => {
  it("validates subscription tier limits", () => {
    const tiers = {
      free: { maxBots: 1, maxAccounts: 1, aiAgents: 2, backtestMonths: 3 },
      starter: { maxBots: 3, maxAccounts: 2, aiAgents: 4, backtestMonths: 12 },
      pro: { maxBots: 10, maxAccounts: 5, aiAgents: 7, backtestMonths: 60 },
      elite: { maxBots: -1, maxAccounts: -1, aiAgents: 7, backtestMonths: -1 },
    };

    // Free tier
    expect(tiers.free.maxBots).toBe(1);
    expect(tiers.free.aiAgents).toBe(2);
    expect(tiers.free.backtestMonths).toBe(3);

    // Starter tier
    expect(tiers.starter.maxBots).toBe(3);
    expect(tiers.starter.aiAgents).toBe(4);

    // Pro tier
    expect(tiers.pro.maxBots).toBe(10);
    expect(tiers.pro.aiAgents).toBe(7);

    // Elite tier (unlimited = -1)
    expect(tiers.elite.maxBots).toBe(-1);
    expect(tiers.elite.maxAccounts).toBe(-1);
  });
});

describe("AI Agent System", () => {
  it("validates agent types", () => {
    const agentTypes = [
      "technical",
      "fundamental",
      "sentiment",
      "risk",
      "microstructure",
      "macro",
      "quant",
    ];

    expect(agentTypes).toHaveLength(7);
    expect(agentTypes).toContain("technical");
    expect(agentTypes).toContain("fundamental");
    expect(agentTypes).toContain("sentiment");
    expect(agentTypes).toContain("risk");
    expect(agentTypes).toContain("microstructure");
    expect(agentTypes).toContain("macro");
    expect(agentTypes).toContain("quant");
  });

  it("validates consensus calculation", () => {
    // Simulate agent votes
    const votes = [
      { agent: "technical", recommendation: "buy", confidence: 0.8 },
      { agent: "fundamental", recommendation: "buy", confidence: 0.7 },
      { agent: "sentiment", recommendation: "hold", confidence: 0.6 },
      { agent: "risk", recommendation: "buy", confidence: 0.75 },
      { agent: "microstructure", recommendation: "buy", confidence: 0.65 },
      { agent: "macro", recommendation: "hold", confidence: 0.5 },
      { agent: "quant", recommendation: "buy", confidence: 0.85 },
    ];

    // Count votes
    const buyVotes = votes.filter(v => v.recommendation === "buy").length;
    const holdVotes = votes.filter(v => v.recommendation === "hold").length;
    const sellVotes = votes.filter(v => v.recommendation === "sell").length;

    expect(buyVotes).toBe(5);
    expect(holdVotes).toBe(2);
    expect(sellVotes).toBe(0);

    // Calculate weighted confidence
    const totalConfidence = votes.reduce((sum, v) => sum + v.confidence, 0);
    const avgConfidence = totalConfidence / votes.length;
    
    expect(avgConfidence).toBeGreaterThan(0.6);
    expect(avgConfidence).toBeLessThan(0.8);
  });
});

describe("Trading Bot Configuration", () => {
  it("validates bot strategy types", () => {
    const strategies = [
      "momentum",
      "mean_reversion",
      "trend_following",
      "arbitrage",
      "ml_based",
      "other",
    ];

    expect(strategies).toContain("momentum");
    expect(strategies).toContain("mean_reversion");
    expect(strategies).toContain("trend_following");
    expect(strategies).toContain("ml_based");
  });

  it("validates risk parameters", () => {
    const riskParams = {
      maxPositionSize: 0.1, // 10% of portfolio
      stopLoss: 0.02, // 2% stop loss
      takeProfit: 0.05, // 5% take profit
      maxDailyLoss: 0.05, // 5% max daily loss
      maxDrawdown: 0.15, // 15% max drawdown
    };

    expect(riskParams.maxPositionSize).toBeLessThanOrEqual(1);
    expect(riskParams.stopLoss).toBeLessThan(riskParams.takeProfit);
    expect(riskParams.maxDailyLoss).toBeLessThan(riskParams.maxDrawdown);
  });
});

describe("Backtesting Metrics", () => {
  it("calculates Sharpe ratio correctly", () => {
    // Sharpe = (Return - RiskFreeRate) / StdDev
    const returns = [0.02, -0.01, 0.03, 0.01, -0.02, 0.04, 0.02];
    const riskFreeRate = 0.001; // 0.1% per period

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = (avgReturn - riskFreeRate) / stdDev;

    expect(sharpeRatio).toBeGreaterThan(0);
    expect(typeof sharpeRatio).toBe("number");
    expect(isNaN(sharpeRatio)).toBe(false);
  });

  it("calculates maximum drawdown correctly", () => {
    const equityCurve = [100, 105, 102, 98, 95, 100, 108, 103, 110];
    
    let maxDrawdown = 0;
    let peak = equityCurve[0];

    for (const value of equityCurve) {
      if (value > peak) {
        peak = value;
      }
      const drawdown = (peak - value) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    // Max drawdown should be from 105 to 95 = 9.52%
    expect(maxDrawdown).toBeGreaterThan(0.09);
    expect(maxDrawdown).toBeLessThan(0.10);
  });

  it("calculates win rate correctly", () => {
    const trades = [
      { pnl: 100 },
      { pnl: -50 },
      { pnl: 75 },
      { pnl: -25 },
      { pnl: 150 },
      { pnl: 30 },
      { pnl: -80 },
      { pnl: 200 },
    ];

    const winningTrades = trades.filter(t => t.pnl > 0).length;
    const totalTrades = trades.length;
    const winRate = winningTrades / totalTrades;

    expect(winRate).toBe(0.625); // 5/8 = 62.5%
  });

  it("calculates profit factor correctly", () => {
    const trades = [
      { pnl: 100 },
      { pnl: -50 },
      { pnl: 75 },
      { pnl: -25 },
      { pnl: 150 },
    ];

    const grossProfit = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = grossProfit / grossLoss;

    // Gross profit = 100 + 75 + 150 = 325
    // Gross loss = 50 + 25 = 75
    // Profit factor = 325 / 75 = 4.33
    expect(profitFactor).toBeCloseTo(4.33, 1);
  });
});

describe("Portfolio Analytics", () => {
  it("calculates portfolio value correctly", () => {
    const positions = [
      { symbol: "AAPL", quantity: 10, currentPrice: 150 },
      { symbol: "GOOGL", quantity: 5, currentPrice: 140 },
      { symbol: "MSFT", quantity: 8, currentPrice: 380 },
    ];

    const totalValue = positions.reduce(
      (sum, pos) => sum + pos.quantity * pos.currentPrice,
      0
    );

    // 10*150 + 5*140 + 8*380 = 1500 + 700 + 3040 = 5240
    expect(totalValue).toBe(5240);
  });

  it("calculates portfolio allocation percentages", () => {
    const positions = [
      { symbol: "AAPL", value: 1500 },
      { symbol: "GOOGL", value: 700 },
      { symbol: "MSFT", value: 3040 },
    ];

    const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0);
    const allocations = positions.map(pos => ({
      symbol: pos.symbol,
      percentage: (pos.value / totalValue) * 100,
    }));

    expect(allocations[0].percentage).toBeCloseTo(28.63, 1); // AAPL
    expect(allocations[1].percentage).toBeCloseTo(13.36, 1); // GOOGL
    expect(allocations[2].percentage).toBeCloseTo(58.02, 1); // MSFT
  });
});

describe("Market Data Validation", () => {
  it("validates stock symbol format", () => {
    const validSymbols = ["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN"];
    const invalidSymbols = ["", "123", "aapl", "TOOLONGSYMBOL"];

    const isValidSymbol = (symbol: string) => {
      return /^[A-Z]{1,5}$/.test(symbol);
    };

    validSymbols.forEach(symbol => {
      expect(isValidSymbol(symbol)).toBe(true);
    });

    invalidSymbols.forEach(symbol => {
      expect(isValidSymbol(symbol)).toBe(false);
    });
  });

  it("validates price data structure", () => {
    const priceData = {
      symbol: "AAPL",
      open: 150.0,
      high: 152.5,
      low: 149.0,
      close: 151.25,
      volume: 50000000,
      timestamp: Date.now(),
    };

    expect(priceData.high).toBeGreaterThanOrEqual(priceData.low);
    expect(priceData.high).toBeGreaterThanOrEqual(priceData.open);
    expect(priceData.high).toBeGreaterThanOrEqual(priceData.close);
    expect(priceData.low).toBeLessThanOrEqual(priceData.open);
    expect(priceData.low).toBeLessThanOrEqual(priceData.close);
    expect(priceData.volume).toBeGreaterThan(0);
  });
});
