import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { runAgentConsensus, getAvailableAgents, AgentType } from "./services/aiAgents";
import { runBacktest, BacktestConfig } from "./services/backtesting";
import { callDataApi } from "./_core/dataApi";
import { createCheckoutSession, createCustomerPortalSession } from "./stripe/checkout";
import { SUBSCRIPTION_TIERS, SubscriptionTier } from "./stripe/products";

// Admin procedure - requires admin role
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// Tier-gated procedure helper
function checkTierAccess(userTier: string, requiredTier: string): boolean {
  const tierOrder = ["free", "starter", "pro", "elite"];
  return tierOrder.indexOf(userTier) >= tierOrder.indexOf(requiredTier);
}

export const appRouter = router({
  system: systemRouter,
  
  // ==================== AUTH ROUTES ====================
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ==================== USER ROUTES ====================
  user: router({
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      return ctx.user;
    }),
    
    getTierLimits: protectedProcedure.query(async ({ ctx }) => {
      return db.getTierLimits(ctx.user.subscriptionTier as any);
    }),
  }),

  // ==================== TRADING ACCOUNT ROUTES ====================
  account: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserTradingAccounts(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const account = await db.getTradingAccountById(input.id, ctx.user.id);
        if (!account) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Account not found" });
        }
        return account;
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        type: z.enum(["paper", "live"]),
        initialBalance: z.number().min(0).default(100000),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check tier limits
        const limit = await db.checkTierLimit(ctx.user.id, "maxAccounts");
        if (!limit.allowed) {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: `Account limit reached (${limit.current}/${limit.limit}). Upgrade your plan for more accounts.` 
          });
        }

        // Check if live trading is allowed
        if (input.type === "live") {
          const tierLimits = db.getTierLimits(ctx.user.subscriptionTier as any);
          if (!tierLimits.liveTrading) {
            throw new TRPCError({ 
              code: "FORBIDDEN", 
              message: "Live trading requires Starter plan or higher" 
            });
          }
        }

        const id = await db.createTradingAccount({
          userId: ctx.user.id,
          name: input.name,
          type: input.type,
          balance: input.initialBalance.toString(),
          initialBalance: input.initialBalance.toString(),
        });

        return { id, success: true };
      }),
  }),

  // ==================== TRADING BOT ROUTES ====================
  bot: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserTradingBots(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const bot = await db.getTradingBotById(input.id, ctx.user.id);
        if (!bot) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Bot not found" });
        }
        return bot;
      }),

    create: protectedProcedure
      .input(z.object({
        accountId: z.number(),
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        strategy: z.object({
          type: z.enum(["momentum", "mean_reversion", "trend_following", "custom"]),
          parameters: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])),
          entryConditions: z.array(z.string()),
          exitConditions: z.array(z.string()),
          positionSizing: z.enum(["fixed", "percent", "kelly"]),
          maxPositionSize: z.number(),
          stopLoss: z.number().optional(),
          takeProfit: z.number().optional(),
        }),
        symbols: z.array(z.string()),
        riskSettings: z.object({
          maxDrawdown: z.number(),
          maxPositionSize: z.number(),
          maxDailyLoss: z.number(),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check tier limits
        const limit = await db.checkTierLimit(ctx.user.id, "maxBots");
        if (!limit.allowed) {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: `Bot limit reached (${limit.current}/${limit.limit}). Upgrade your plan for more bots.` 
          });
        }

        // Verify account ownership
        const account = await db.getTradingAccountById(input.accountId, ctx.user.id);
        if (!account) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Trading account not found" });
        }

        const id = await db.createTradingBot({
          userId: ctx.user.id,
          accountId: input.accountId,
          name: input.name,
          description: input.description,
          strategy: input.strategy,
          symbols: input.symbols,
          riskSettings: input.riskSettings,
        });

        return { id, success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        status: z.enum(["active", "paused", "stopped"]).optional(),
        strategy: z.any().optional(),
        symbols: z.array(z.string()).optional(),
        riskSettings: z.any().optional(),
        isPublic: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateTradingBot(id, ctx.user.id, data);
        return { success: true };
      }),

    getTrades: protectedProcedure
      .input(z.object({ botId: z.number(), limit: z.number().default(100) }))
      .query(async ({ ctx, input }) => {
        // Verify bot ownership
        const bot = await db.getTradingBotById(input.botId, ctx.user.id);
        if (!bot) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Bot not found" });
        }
        return db.getBotTrades(input.botId, input.limit);
      }),
  }),

  // ==================== AI AGENT ROUTES ====================
  agent: router({
    analyze: protectedProcedure
      .input(z.object({ symbol: z.string() }))
      .mutation(async ({ ctx, input }) => {
        // Get available agents based on subscription tier
        const availableAgents = getAvailableAgents(ctx.user.subscriptionTier);
        
        // Run consensus analysis
        const result = await runAgentConsensus(input.symbol, availableAgents);
        
        // Save analysis to database
        await db.createAgentAnalysis({
          userId: ctx.user.id,
          symbol: input.symbol,
          technicalScore: result.agents.find(a => a.agent === "technical")?.score.toString(),
          fundamentalScore: result.agents.find(a => a.agent === "fundamental")?.score.toString(),
          sentimentScore: result.agents.find(a => a.agent === "sentiment")?.score.toString(),
          riskScore: result.agents.find(a => a.agent === "risk")?.score.toString(),
          microstructureScore: result.agents.find(a => a.agent === "microstructure")?.score.toString(),
          macroScore: result.agents.find(a => a.agent === "macro")?.score.toString(),
          quantScore: result.agents.find(a => a.agent === "quant")?.score.toString(),
          consensusScore: result.consensusScore.toString(),
          consensusAction: result.consensusSignal,
          confidence: result.overallConfidence.toString(),
          analysisDetails: result,
        });

        return result;
      }),

    getHistory: protectedProcedure
      .input(z.object({ symbol: z.string(), limit: z.number().default(10) }))
      .query(async ({ ctx, input }) => {
        return db.getAgentAnalysisHistory(input.symbol, ctx.user.id, input.limit);
      }),

    getAvailableAgents: protectedProcedure.query(async ({ ctx }) => {
      return getAvailableAgents(ctx.user.subscriptionTier);
    }),
  }),

  // ==================== BACKTEST ROUTES ====================
  backtest: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserBacktests(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const backtest = await db.getBacktestById(input.id, ctx.user.id);
        if (!backtest) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Backtest not found" });
        }
        return backtest;
      }),

    run: protectedProcedure
      .input(z.object({
        name: z.string(),
        botId: z.number().optional(),
        strategy: z.object({
          type: z.enum(["momentum", "mean_reversion", "trend_following", "custom"]),
          parameters: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])),
          entryConditions: z.array(z.string()),
          exitConditions: z.array(z.string()),
          positionSizing: z.enum(["fixed", "percent", "kelly"]),
          maxPositionSize: z.number(),
          stopLoss: z.number().optional(),
          takeProfit: z.number().optional(),
        }),
        symbols: z.array(z.string()),
        startDate: z.string(),
        endDate: z.string(),
        initialCapital: z.number().default(100000),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check backtest date range based on tier
        const tierLimits = db.getTierLimits(ctx.user.subscriptionTier as any);
        const startDate = new Date(input.startDate);
        const endDate = new Date(input.endDate);
        const yearsBack = (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
        
        if (yearsBack > tierLimits.backtestYears) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Your plan allows backtesting up to ${tierLimits.backtestYears} years. Upgrade for more historical data.`
          });
        }

        // Create backtest record
        const backtestId = await db.createBacktest({
          userId: ctx.user.id,
          botId: input.botId,
          name: input.name,
          strategy: input.strategy,
          symbols: input.symbols,
          startDate,
          endDate,
          initialCapital: input.initialCapital.toString(),
        });

        // Update status to running
        await db.updateBacktestResults(backtestId, { status: "running" });

        try {
          // Run backtest
          const config: BacktestConfig = {
            strategy: input.strategy as any,
            symbols: input.symbols,
            startDate,
            endDate,
            initialCapital: input.initialCapital,
            commission: 0.001, // 0.1% commission
            slippage: 0.001, // 0.1% slippage
          };

          const result = await runBacktest(config);

          // Save results
          await db.updateBacktestResults(backtestId, {
            status: "completed",
            finalCapital: (input.initialCapital * (1 + result.metrics.totalReturn)).toString(),
            totalReturn: result.metrics.totalReturn.toString(),
            sharpeRatio: result.metrics.sharpeRatio.toString(),
            maxDrawdown: result.metrics.maxDrawdown.toString(),
            winRate: result.metrics.winRate.toString(),
            profitFactor: result.metrics.profitFactor.toString(),
            totalTrades: result.metrics.totalTrades,
            results: result,
            completedAt: new Date(),
          });

          return { id: backtestId, result };
        } catch (error) {
          await db.updateBacktestResults(backtestId, { status: "failed" });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Backtest failed" });
        }
      }),
  }),

  // ==================== MARKET DATA ROUTES ====================
  market: router({
    getChart: publicProcedure
      .input(z.object({
        symbol: z.string(),
        interval: z.enum(["1m", "5m", "15m", "30m", "1h", "1d", "1wk", "1mo"]).default("1d"),
        range: z.enum(["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "max"]).default("3mo"),
      }))
      .query(async ({ input }) => {
        const response = await callDataApi("YahooFinance/get_stock_chart", {
          query: {
            symbol: input.symbol,
            region: "US",
            interval: input.interval,
            range: input.range,
            includeAdjustedClose: true,
          },
        });
        return response;
      }),

    getInsights: protectedProcedure
      .input(z.object({ symbol: z.string() }))
      .query(async ({ input }) => {
        const response = await callDataApi("YahooFinance/get_stock_insights", {
          query: { symbol: input.symbol },
        });
        return response;
      }),

    getHolders: protectedProcedure
      .input(z.object({ symbol: z.string() }))
      .query(async ({ input }) => {
        const response = await callDataApi("YahooFinance/get_stock_holders", {
          query: { symbol: input.symbol, region: "US", lang: "en-US" },
        });
        return response;
      }),
  }),

  // ==================== PORTFOLIO ROUTES ====================
  portfolio: router({
    getSnapshots: protectedProcedure
      .input(z.object({ accountId: z.number(), days: z.number().default(30) }))
      .query(async ({ ctx, input }) => {
        return db.getPortfolioSnapshots(input.accountId, ctx.user.id, input.days);
      }),

    getAnalytics: protectedProcedure
      .input(z.object({ accountId: z.number() }))
      .query(async ({ ctx, input }) => {
        const account = await db.getTradingAccountById(input.accountId, ctx.user.id);
        if (!account) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Account not found" });
        }

        const trades = await db.getAccountTrades(input.accountId, ctx.user.id, 1000);
        const snapshots = await db.getPortfolioSnapshots(input.accountId, ctx.user.id, 365);

        // Calculate metrics
        const winningTrades = trades.filter(t => parseFloat(t.pnl?.toString() || "0") > 0);
        const losingTrades = trades.filter(t => parseFloat(t.pnl?.toString() || "0") <= 0);
        
        const totalPnl = trades.reduce((sum, t) => sum + parseFloat(t.pnl?.toString() || "0"), 0);
        const winRate = trades.length > 0 ? winningTrades.length / trades.length : 0;
        
        const totalWins = winningTrades.reduce((sum, t) => sum + parseFloat(t.pnl?.toString() || "0"), 0);
        const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + parseFloat(t.pnl?.toString() || "0"), 0));
        const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

        // Calculate Sharpe ratio from snapshots
        let sharpeRatio = 0;
        if (snapshots.length > 1) {
          const returns = [];
          for (let i = 1; i < snapshots.length; i++) {
            const prevValue = parseFloat(snapshots[i - 1].totalValue.toString());
            const currValue = parseFloat(snapshots[i].totalValue.toString());
            returns.push((currValue - prevValue) / prevValue);
          }
          const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
          const stdReturn = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
          sharpeRatio = stdReturn > 0 ? (avgReturn * 252) / (stdReturn * Math.sqrt(252)) : 0;
        }

        // Calculate max drawdown
        let maxDrawdown = 0;
        let peak = parseFloat(account.initialBalance.toString());
        for (const snapshot of snapshots) {
          const value = parseFloat(snapshot.totalValue.toString());
          if (value > peak) peak = value;
          const drawdown = (peak - value) / peak;
          if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        }

        return {
          totalPnl,
          totalReturn: totalPnl / parseFloat(account.initialBalance.toString()),
          winRate,
          profitFactor,
          sharpeRatio,
          maxDrawdown,
          totalTrades: trades.length,
          winningTrades: winningTrades.length,
          losingTrades: losingTrades.length,
        };
      }),
  }),

  // ==================== MARKETPLACE ROUTES ====================
  marketplace: router({
    list: publicProcedure
      .input(z.object({ category: z.string().optional() }))
      .query(async ({ input }) => {
        return db.getMarketplaceListings(input.category);
      }),

    featured: publicProcedure.query(async () => {
      return db.getFeaturedListings();
    }),

    leaderboard: publicProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(async ({ input }) => {
        return db.getLeaderboard(input.limit);
      }),

    copyBot: protectedProcedure
      .input(z.object({ listingId: z.number(), accountId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Check tier limits
        const limit = await db.checkTierLimit(ctx.user.id, "maxBots");
        if (!limit.allowed) {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: `Bot limit reached. Upgrade your plan for more bots.` 
          });
        }

        // Get the listing and original bot
        const listings = await db.getMarketplaceListings();
        const listing = listings.find(l => l.id === input.listingId);
        if (!listing) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found" });
        }

        const originalBot = await db.getTradingBotById(listing.botId, undefined);
        if (!originalBot) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Original bot not found" });
        }

        // Verify account ownership
        const account = await db.getTradingAccountById(input.accountId, ctx.user.id);
        if (!account) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Trading account not found" });
        }

        // Create a copy of the bot
        const copiedBotId = await db.createTradingBot({
          userId: ctx.user.id,
          accountId: input.accountId,
          name: `${originalBot.name} (Copy)`,
          description: originalBot.description,
          strategy: originalBot.strategy,
          symbols: originalBot.symbols,
          riskSettings: originalBot.riskSettings,
        });

        // Record the copy
        await db.createBotCopy({
          originalBotId: listing.botId,
          copiedBotId,
          userId: ctx.user.id,
          listingId: input.listingId,
        });

        // Update listing stats
        await db.updateListingStats(input.listingId, {
          totalCopies: listing.totalCopies + 1,
        });

        return { copiedBotId, success: true };
      }),
  }),

  // ==================== WATCHLIST ROUTES ====================
  watchlist: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserWatchlists(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        symbols: z.array(z.string()),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createWatchlist({
          userId: ctx.user.id,
          name: input.name,
          symbols: input.symbols,
        });
        return { id, success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        symbols: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateWatchlist(id, ctx.user.id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteWatchlist(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ==================== SUBSCRIPTION ROUTES ====================
  subscription: router({
    getTiers: publicProcedure.query(() => {
      return Object.entries(SUBSCRIPTION_TIERS).map(([id, tier]) => ({
        id,
        name: tier.name,
        description: tier.description,
        price: tier.price,
        features: tier.featureList,
      }));
    }),

    createCheckout: protectedProcedure
      .input(z.object({
        tier: z.enum(["starter", "pro", "elite"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const origin = ctx.req.headers.origin || "http://localhost:3000";
        
        const { url } = await createCheckoutSession({
          userId: ctx.user.id,
          userEmail: ctx.user.email || "",
          userName: ctx.user.name || "",
          tier: input.tier as SubscriptionTier,
          origin,
        });

        return { checkoutUrl: url };
      }),

    getCurrentTier: protectedProcedure.query(async ({ ctx }) => {
      const tier = (ctx.user as any).subscriptionTier || "free";
      return {
        tier,
        ...SUBSCRIPTION_TIERS[tier as SubscriptionTier],
      };
    }),
  }),

  // ==================== ADMIN ROUTES ====================
  admin: router({
    getStats: adminProcedure.query(async () => {
      return db.getAdminStats();
    }),

    getUsers: adminProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async () => {
        return db.getAllUsers();
      }),

    updateUserRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(["user", "admin"]),
      }))
      .mutation(async ({ input }) => {
        await db.updateUserRole(input.userId, input.role);
        return { success: true };
      }),

    updateUserSubscription: adminProcedure
      .input(z.object({
        userId: z.number(),
        tier: z.enum(["free", "starter", "pro", "elite"]),
      }))
      .mutation(async ({ input }) => {
        await db.updateUserSubscription(input.userId, { subscriptionTier: input.tier });
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
