import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database functions
vi.mock("./db", () => ({
  getFilteredAnalysisHistory: vi.fn(),
  getAnalysisById: vi.fn(),
  getAnalysisStats: vi.fn(),
  getUniqueSymbols: vi.fn(),
  getAgentAnalysisHistory: vi.fn(),
}));

import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    subscriptionTier: "pro",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("Analysis History Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("agent.getFilteredHistory", () => {
    it("returns filtered analysis history with pagination", async () => {
      const mockData = {
        analyses: [
          {
            id: 1,
            userId: 1,
            symbol: "AAPL",
            consensusAction: "buy",
            confidence: "0.85",
            consensusScore: "0.65",
            technicalScore: "0.7",
            fundamentalScore: "0.6",
            sentimentScore: "0.8",
            riskScore: "0.5",
            microstructureScore: "0.6",
            macroScore: "0.7",
            quantScore: "0.65",
            createdAt: new Date(),
          },
        ],
        total: 1,
      };

      vi.mocked(db.getFilteredAnalysisHistory).mockResolvedValue(mockData);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.agent.getFilteredHistory({
        symbol: "AAPL",
        limit: 20,
        offset: 0,
      });

      expect(result).toEqual(mockData);
      expect(db.getFilteredAnalysisHistory).toHaveBeenCalledWith({
        userId: 1,
        symbol: "AAPL",
        consensusAction: undefined,
        startDate: undefined,
        endDate: undefined,
        minConfidence: undefined,
        limit: 20,
        offset: 0,
      });
    });

    it("filters by consensus action", async () => {
      const mockData = { analyses: [], total: 0 };
      vi.mocked(db.getFilteredAnalysisHistory).mockResolvedValue(mockData);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await caller.agent.getFilteredHistory({
        consensusAction: "strong_buy",
        limit: 20,
        offset: 0,
      });

      expect(db.getFilteredAnalysisHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          consensusAction: "strong_buy",
        })
      );
    });

    it("filters by date range", async () => {
      const mockData = { analyses: [], total: 0 };
      vi.mocked(db.getFilteredAnalysisHistory).mockResolvedValue(mockData);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await caller.agent.getFilteredHistory({
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        limit: 20,
        offset: 0,
      });

      expect(db.getFilteredAnalysisHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        })
      );
    });

    it("filters by minimum confidence", async () => {
      const mockData = { analyses: [], total: 0 };
      vi.mocked(db.getFilteredAnalysisHistory).mockResolvedValue(mockData);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await caller.agent.getFilteredHistory({
        minConfidence: 0.8,
        limit: 20,
        offset: 0,
      });

      expect(db.getFilteredAnalysisHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          minConfidence: 0.8,
        })
      );
    });
  });

  describe("agent.getById", () => {
    it("returns analysis details by ID", async () => {
      const mockAnalysis = {
        id: 1,
        userId: 1,
        symbol: "AAPL",
        consensusAction: "buy",
        confidence: "0.85",
        analysisDetails: { agents: [] },
        createdAt: new Date(),
      };

      vi.mocked(db.getAnalysisById).mockResolvedValue(mockAnalysis);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.agent.getById({ id: 1 });

      expect(result).toEqual(mockAnalysis);
      expect(db.getAnalysisById).toHaveBeenCalledWith(1, 1);
    });

    it("throws NOT_FOUND when analysis doesn't exist", async () => {
      vi.mocked(db.getAnalysisById).mockResolvedValue(undefined);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.agent.getById({ id: 999 })).rejects.toThrow("Analysis not found");
    });
  });

  describe("agent.getStats", () => {
    it("returns analysis statistics", async () => {
      const mockStats = {
        totalAnalyses: 100,
        avgConfidence: "0.75",
        byAction: [
          { action: "buy", count: 40 },
          { action: "sell", count: 30 },
          { action: "hold", count: 30 },
        ],
        bySymbol: [
          { symbol: "AAPL", count: 25 },
          { symbol: "GOOGL", count: 20 },
        ],
      };

      vi.mocked(db.getAnalysisStats).mockResolvedValue(mockStats);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.agent.getStats();

      expect(result).toEqual(mockStats);
      expect(db.getAnalysisStats).toHaveBeenCalledWith(1);
    });
  });

  describe("agent.getUniqueSymbols", () => {
    it("returns list of unique symbols", async () => {
      const mockSymbols = ["AAPL", "GOOGL", "MSFT", "TSLA"];

      vi.mocked(db.getUniqueSymbols).mockResolvedValue(mockSymbols);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.agent.getUniqueSymbols();

      expect(result).toEqual(mockSymbols);
      expect(db.getUniqueSymbols).toHaveBeenCalledWith(1);
    });
  });
});

describe("Analysis History Filters Validation", () => {
  it("validates consensus action enum", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Valid actions should not throw
    const validActions = ["strong_buy", "buy", "hold", "sell", "strong_sell"];
    for (const action of validActions) {
      vi.mocked(db.getFilteredAnalysisHistory).mockResolvedValue({ analyses: [], total: 0 });
      await expect(
        caller.agent.getFilteredHistory({ consensusAction: action as any, limit: 20, offset: 0 })
      ).resolves.toBeDefined();
    }
  });

  it("validates limit range", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Limit must be between 1 and 100
    vi.mocked(db.getFilteredAnalysisHistory).mockResolvedValue({ analyses: [], total: 0 });
    
    await expect(
      caller.agent.getFilteredHistory({ limit: 0, offset: 0 })
    ).rejects.toThrow();

    await expect(
      caller.agent.getFilteredHistory({ limit: 101, offset: 0 })
    ).rejects.toThrow();
  });

  it("validates minConfidence range", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    vi.mocked(db.getFilteredAnalysisHistory).mockResolvedValue({ analyses: [], total: 0 });

    // minConfidence must be between 0 and 1
    await expect(
      caller.agent.getFilteredHistory({ minConfidence: -0.1, limit: 20, offset: 0 })
    ).rejects.toThrow();

    await expect(
      caller.agent.getFilteredHistory({ minConfidence: 1.1, limit: 20, offset: 0 })
    ).rejects.toThrow();
  });
});
