import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { runAgentConsensus, getAvailableAgents } from "./services/aiAgents";
import { runEnhancedAnalysis, EnhancedAnalysisResult } from "./services/enhancedAnalysis";
import { 
  encryptApiKey, 
  decryptApiKey, 
  validateApiKey,
  validateApiKeyFormat,
  getAvailableModels, 
  providerMetadata,
  llmPricing,
  calculateCost,
  estimateCost,
  formatCost,
  formatTokens,
  LlmProvider 
} from "./services/llmProvider";
import { runBacktest, BacktestConfig } from "./services/backtesting";
import { runBacktestValidation, getUserBacktests, getBacktestById, BacktestConfig as ValidationConfig } from "./services/backtestingValidation";
import { RLTradingAgent } from "./services/rlAgent";
import { runMonteCarloSimulation, runQuickSimulation, MonteCarloConfig } from "./services/monteCarloSimulation";
import { runWalkForwardOptimization, runQuickWalkForward, WalkForwardConfig } from "./services/walkForwardOptimization";
import { runPortfolioBacktest, runQuickPortfolioAnalysis, PortfolioConfig } from "./services/portfolioBacktesting";
import { analyzeMarketRegime, getQuickRegime, RegimeConfig } from "./services/regimeSwitching";
import { calculateGreeks, calculateImpliedVolatility, generateGreeksVisualization, generateOptionChain, analyzeStrategy, OptionInput } from "./services/optionsGreeks";
import { analyzeSentiment, getQuickSentiment, analyzeBatchSentiment } from "./services/sentimentAnalysis";
import { 
  getCryptoPrice, 
  getCryptoPrices,
  getCryptoOHLCV,
  getCryptoIndicators, 
  analyzeCrypto,
  getDeFiProtocols 
} from "./services/cryptoTrading";
import {
  createPaperAccount,
  getPaperAccount,
  getUserPaperAccounts,
  placePaperOrder,
  getAccountPositions,
  getAccountOrders,
  getTradeHistory,
  cancelOrder,
  calculatePerformanceMetrics,
  resetPaperAccount
} from "./services/paperTrading";
import {
  createPriceAlert,
  createRegimeAlert,
  createSentimentAlert,
  getUserPriceAlerts,
  getUserRegimeAlerts,
  getUserSentimentAlerts,
  getAlertHistory,
  togglePriceAlert,
  toggleRegimeAlert,
  toggleSentimentAlert,
  deletePriceAlert,
  deleteRegimeAlert,
  deleteSentimentAlert,
  markAlertAsRead,
  getAlertSummary
} from "./services/alertSystem";
import { callDataApi } from "./_core/dataApi";
import { getStockQuote, searchStocks, getCachedPrice, getAllCachedPrices, fetchStockPrice } from "./services/marketData";
import { getUserEmailPreferences, updateUserEmailPreferences, testSendGridApiKey } from "./services/twilioEmail";
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

    // Email Preferences
    getEmailPreferences: protectedProcedure.query(async ({ ctx }) => {
      const prefs = await getUserEmailPreferences(ctx.user.id);
      return prefs || {
        userId: ctx.user.id,
        botExecutionComplete: true,
        botExecutionError: true,
        priceTargetAlert: true,
        recommendationChange: true,
        weeklyReport: true,
        monthlyReport: true,
        marketingEmails: false,
        digestFrequency: "immediate" as const,
        timezone: "UTC",
        isUnsubscribed: false,
      };
    }),

    updateEmailPreferences: protectedProcedure
      .input(z.object({
        botExecutionComplete: z.boolean().optional(),
        botExecutionError: z.boolean().optional(),
        priceTargetAlert: z.boolean().optional(),
        recommendationChange: z.boolean().optional(),
        weeklyReport: z.boolean().optional(),
        monthlyReport: z.boolean().optional(),
        marketingEmails: z.boolean().optional(),
        digestFrequency: z.enum(["immediate", "hourly", "daily", "weekly"]).optional(),
        quietHoursStart: z.string().optional(),
        quietHoursEnd: z.string().optional(),
        timezone: z.string().optional(),
        isUnsubscribed: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return updateUserEmailPreferences(ctx.user.id, input);
      }),

    testEmailConnection: protectedProcedure
      .input(z.object({ apiKey: z.string() }))
      .mutation(async ({ input }) => {
        return testSendGridApiKey(input.apiKey);
      }),

    // Email Verification
    getVerificationStatus: protectedProcedure.query(async ({ ctx }) => {
      const verification = await db.getEmailVerificationByUserId(ctx.user.id);
      return {
        isVerified: ctx.user.isEmailVerified || false,
        email: ctx.user.email,
        verifiedAt: ctx.user.emailVerifiedAt,
        hasPendingVerification: verification && !verification.isVerified && new Date(verification.expiresAt) > new Date(),
        canResend: !verification || (verification.resendCount || 0) < 5,
      };
    }),

    sendVerificationEmail: protectedProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ ctx, input }) => {
        // Check if already verified
        if (ctx.user.isEmailVerified) {
          return { success: false, error: "Email already verified" };
        }

        // Check email config
        const canSend = await db.canSendEmail();
        if (!canSend.allowed) {
          return { success: false, error: canSend.reason };
        }

        // Check resend limit
        const existing = await db.getEmailVerificationByUserId(ctx.user.id);
        if (existing && (existing.resendCount || 0) >= 5) {
          return { success: false, error: "Too many verification emails sent. Please contact support." };
        }

        // Generate token
        const token = crypto.randomUUID().replace(/-/g, "");
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Create verification record
        await db.createEmailVerification({
          userId: ctx.user.id,
          email: input.email,
          token,
          expiresAt,
        });

        // Send verification email
        const config = await db.getEmailConfig();
        if (!config?.sendgridApiKey) {
          return { success: false, error: "Email service not configured" };
        }

        try {
          const verifyUrl = `${process.env.VITE_OAUTH_PORTAL_URL || ''}/verify-email?token=${token}`;
          
          const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${config.sendgridApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              personalizations: [{ to: [{ email: config.testMode ? config.testEmail : input.email }] }],
              from: { email: config.senderEmail || "noreply@tradoverse.com", name: config.senderName || "TradoVerse" },
              subject: "Verify your email - TradoVerse",
              content: [{
                type: "text/html",
                value: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #10b981;">Verify Your Email</h2>
                    <p>Hi ${ctx.user.name || 'there'},</p>
                    <p>Please verify your email address to enable notifications and unlock all features.</p>
                    <p style="margin: 30px 0;">
                      <a href="${verifyUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email</a>
                    </p>
                    <p>Or copy and paste this link in your browser:</p>
                    <p style="color: #6b7280; word-break: break-all;">${verifyUrl}</p>
                    <p>This link expires in 24 hours.</p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                    <p style="color: #6b7280; font-size: 12px;">If you didn't request this, please ignore this email.</p>
                  </div>
                `
              }]
            }),
          });

          if (!response.ok) {
            return { success: false, error: "Failed to send verification email" };
          }

          await db.incrementEmailsSentToday();
          return { success: true };
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : "Failed to send email" };
        }
      }),

    verifyEmail: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        const verification = await db.getEmailVerificationByToken(input.token);
        
        if (!verification) {
          return { success: false, error: "Invalid verification token" };
        }

        if (verification.isVerified) {
          return { success: true, message: "Email already verified" };
        }

        if (new Date(verification.expiresAt) < new Date()) {
          return { success: false, error: "Verification link has expired" };
        }

        // Mark as verified
        const success = await db.markEmailVerified(input.token);
        if (!success) {
          return { success: false, error: "Failed to verify email" };
        }

        // Update user record
        const dbInstance = await db.getDb();
        if (dbInstance) {
          const { users } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          await dbInstance.update(users)
            .set({ 
              isEmailVerified: true, 
              emailVerifiedAt: new Date(),
              email: verification.email 
            })
            .where(eq(users.id, verification.userId));
        }

        return { success: true, message: "Email verified successfully" };
      }),

    resendVerification: protectedProcedure.mutation(async ({ ctx }) => {
      const verification = await db.getEmailVerificationByUserId(ctx.user.id);
      
      if (!verification) {
        return { success: false, error: "No pending verification found" };
      }

      if (verification.isVerified) {
        return { success: false, error: "Email already verified" };
      }

      if ((verification.resendCount || 0) >= 5) {
        return { success: false, error: "Too many resend attempts" };
      }

      // Increment resend count
      await db.incrementResendCount(ctx.user.id);

      // Send new verification email
      const config = await db.getEmailConfig();
      if (!config?.sendgridApiKey) {
        return { success: false, error: "Email service not configured" };
      }

      try {
        const verifyUrl = `${process.env.VITE_OAUTH_PORTAL_URL || ''}/verify-email?token=${verification.token}`;
        
        const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${config.sendgridApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: config.testMode ? config.testEmail : verification.email }] }],
            from: { email: config.senderEmail || "noreply@tradoverse.com", name: config.senderName || "TradoVerse" },
            subject: "Verify your email - TradoVerse",
            content: [{
              type: "text/html",
              value: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #10b981;">Verify Your Email</h2>
                  <p>Hi ${ctx.user.name || 'there'},</p>
                  <p>Here's your verification link again:</p>
                  <p style="margin: 30px 0;">
                    <a href="${verifyUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email</a>
                  </p>
                  <p>This link expires in 24 hours.</p>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                  <p style="color: #6b7280; font-size: 12px;">If you didn't request this, please ignore this email.</p>
                </div>
              `
            }]
          }),
        });

        if (!response.ok) {
          return { success: false, error: "Failed to send verification email" };
        }

        await db.incrementEmailsSentToday();
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to send email" };
      }
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
        // Run consensus analysis with user's LLM configuration
        const result = await runAgentConsensus(
          ctx.user.id,
          input.symbol,
          ctx.user.subscriptionTier
        );
        
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

    // Enhanced analysis history with filtering
    getFilteredHistory: protectedProcedure
      .input(z.object({
        symbol: z.string().optional(),
        consensusAction: z.enum(["strong_buy", "buy", "hold", "sell", "strong_sell"]).optional(),
        startDate: z.string().optional(), // ISO date string
        endDate: z.string().optional(),
        minConfidence: z.number().min(0).max(1).optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ ctx, input }) => {
        const filters: db.AnalysisHistoryFilters = {
          userId: ctx.user.id,
          symbol: input.symbol,
          consensusAction: input.consensusAction,
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
          minConfidence: input.minConfidence,
          limit: input.limit,
          offset: input.offset,
        };
        return db.getFilteredAnalysisHistory(filters);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const analysis = await db.getAnalysisById(input.id, ctx.user.id);
        if (!analysis) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found" });
        }
        return analysis;
      }),

    getStats: protectedProcedure.query(async ({ ctx }) => {
      return db.getAnalysisStats(ctx.user.id);
    }),

    getUniqueSymbols: protectedProcedure.query(async ({ ctx }) => {
      return db.getUniqueSymbols(ctx.user.id);
    }),

    // Enhanced Analysis with research-backed strategies
    enhancedAnalysis: protectedProcedure
      .input(z.object({ 
        symbol: z.string(),
        accountBalance: z.number().optional().default(10000)
      }))
      .mutation(async ({ ctx, input }) => {
        // Check tier access - enhanced analysis requires at least starter tier
        if (!checkTierAccess(ctx.user.subscriptionTier, "starter")) {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "Enhanced analysis requires Starter tier or higher" 
          });
        }
        
        const result = await runEnhancedAnalysis(input.symbol, input.accountBalance);
        
        // Save enhanced analysis to database
        await db.createAgentAnalysis({
          userId: ctx.user.id,
          symbol: input.symbol,
          technicalScore: (result.agents.find(a => a.agentType === "Technical Analysis")?.confidence ?? 0.5).toString(),
          fundamentalScore: (result.agents.find(a => a.agentType === "Fundamental Analysis")?.confidence ?? 0.5).toString(),
          sentimentScore: (result.agents.find(a => a.agentType === "Sentiment Analysis")?.confidence ?? 0.5).toString(),
          riskScore: (result.agents.find(a => a.agentType === "Risk Management")?.confidence ?? 0.5).toString(),
          quantScore: (result.agents.find(a => a.agentType === "Quantitative Analysis")?.confidence ?? 0.5).toString(),
          consensusScore: result.overallScore.toString(),
          consensusAction: result.consensusRecommendation,
          confidence: result.consensusConfidence.toString(),
          analysisDetails: result as any,
        });
        
        return result;
      }),

    // Get market regime for a symbol
    getMarketRegime: protectedProcedure
      .input(z.object({ symbol: z.string() }))
      .query(async ({ ctx, input }) => {
        const result = await runEnhancedAnalysis(input.symbol);
        return result.marketRegime;
      }),

    // Calculate position sizing
    calculatePositionSize: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        accountBalance: z.number(),
        winRate: z.number().min(0).max(1).optional().default(0.55),
        avgWinPercent: z.number().optional().default(2),
        avgLossPercent: z.number().optional().default(1),
        maxRiskPercent: z.number().min(0.01).max(0.1).optional().default(0.02)
      }))
      .query(async ({ ctx, input }) => {
        const { calculateKellyPosition } = await import("./services/enhancedAnalysis");
        return calculateKellyPosition(
          input.winRate,
          input.avgWinPercent,
          input.avgLossPercent,
          input.accountBalance,
          input.maxRiskPercent
        );
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

    // Real-time price endpoints
    getQuote: publicProcedure
      .input(z.object({ symbol: z.string() }))
      .query(async ({ input }) => {
        return getStockQuote(input.symbol);
      }),

    getLivePrice: publicProcedure
      .input(z.object({ symbol: z.string() }))
      .query(async ({ input }) => {
        // Try cache first, then fetch
        const cached = getCachedPrice(input.symbol);
        if (cached) return cached;
        return fetchStockPrice(input.symbol);
      }),

    getLivePrices: publicProcedure
      .input(z.object({ symbols: z.array(z.string()) }))
      .query(async ({ input }) => {
        const results: Record<string, any> = {};
        for (const symbol of input.symbols) {
          const cached = getCachedPrice(symbol);
          if (cached) {
            results[symbol] = cached;
          } else {
            const price = await fetchStockPrice(symbol);
            if (price) results[symbol] = price;
          }
        }
        return results;
      }),

    getCachedPrices: publicProcedure
      .query(async () => {
        const cached = getAllCachedPrices();
        const result: Record<string, any> = {};
        cached.forEach((value, key) => {
          result[key] = value;
        });
        return result;
      }),

    search: publicProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input }) => {
        return searchStocks(input.query);
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

  // ==================== LLM SETTINGS ROUTES ====================
  llmSettings: router({
    // Get available providers and models
    getProviders: publicProcedure.query(() => {
      return Object.entries(providerMetadata).map(([id, meta]) => ({
        id: id as LlmProvider,
        name: meta.name,
        description: meta.description,
        website: meta.website,
        models: getAvailableModels(id as LlmProvider),
      }));
    }),

    // Get user's current LLM settings
    getSettings: protectedProcedure.query(async ({ ctx }) => {
      const settings = await db.getUserLlmSettings(ctx.user.id);
      if (!settings) {
        return {
          activeProvider: "openai" as LlmProvider,
          hasOpenaiKey: false,
          hasDeepseekKey: false,
          hasClaudeKey: false,
          hasGeminiKey: false,
          openaiModel: "gpt-4-turbo",
          deepseekModel: "deepseek-reasoner",
          claudeModel: "claude-sonnet-4-20250514",
          geminiModel: "gemini-2.0-flash",
          temperature: 0.7,
          maxTokens: 4096,
          totalTokensUsed: 0,
        };
      }

      return {
        activeProvider: settings.activeProvider as LlmProvider,
        hasOpenaiKey: !!settings.openaiApiKey,
        hasDeepseekKey: !!settings.deepseekApiKey,
        hasClaudeKey: !!settings.claudeApiKey,
        hasGeminiKey: !!settings.geminiApiKey,
        openaiModel: settings.openaiModel || "gpt-4-turbo",
        deepseekModel: settings.deepseekModel || "deepseek-reasoner",
        claudeModel: settings.claudeModel || "claude-sonnet-4-20250514",
        geminiModel: settings.geminiModel || "gemini-2.0-flash",
        temperature: parseFloat(settings.temperature || "0.7"),
        maxTokens: settings.maxTokens || 4096,
        totalTokensUsed: settings.totalTokensUsed || 0,
        lastUsedAt: settings.lastUsedAt,
      };
    }),

    // Update active provider
    setActiveProvider: protectedProcedure
      .input(z.object({
        provider: z.enum(["openai", "deepseek", "claude", "gemini"]),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertUserLlmSettings(ctx.user.id, {
          activeProvider: input.provider,
        });
        return { success: true };
      }),

    // Save API key for a provider
    saveApiKey: protectedProcedure
      .input(z.object({
        provider: z.enum(["openai", "deepseek", "claude", "gemini"]),
        apiKey: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        // Validate the API key first
        const isValid = await validateApiKey(input.provider, input.apiKey);
        if (!isValid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid ${input.provider} API key. Please check and try again.`,
          });
        }

        // Encrypt and save the key
        const encryptedKey = encryptApiKey(input.apiKey);
        const keyField = `${input.provider}ApiKey` as const;
        
        await db.upsertUserLlmSettings(ctx.user.id, {
          [keyField]: encryptedKey,
          activeProvider: input.provider,
        });

        return { success: true, message: `${input.provider} API key saved successfully` };
      }),

    // Remove API key for a provider
    removeApiKey: protectedProcedure
      .input(z.object({
        provider: z.enum(["openai", "deepseek", "claude", "gemini"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const keyField = `${input.provider}ApiKey` as const;
        
        await db.upsertUserLlmSettings(ctx.user.id, {
          [keyField]: null,
        });

        return { success: true };
      }),

    // Update model selection for a provider
    setModel: protectedProcedure
      .input(z.object({
        provider: z.enum(["openai", "deepseek", "claude", "gemini"]),
        model: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const modelField = `${input.provider}Model` as const;
        
        await db.upsertUserLlmSettings(ctx.user.id, {
          [modelField]: input.model,
        });

        return { success: true };
      }),

    // Update general settings (temperature, max tokens)
    updateSettings: protectedProcedure
      .input(z.object({
        temperature: z.number().min(0).max(2).optional(),
        maxTokens: z.number().min(100).max(128000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertUserLlmSettings(ctx.user.id, {
          temperature: input.temperature?.toString(),
          maxTokens: input.maxTokens,
        });

        return { success: true };
      }),

    // Test API key connection with detailed feedback
    testConnection: protectedProcedure
      .input(z.object({
        provider: z.enum(["openai", "deepseek", "claude", "gemini"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const settings = await db.getUserLlmSettings(ctx.user.id);
        if (!settings) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No LLM settings found. Please save an API key first.",
          });
        }

        const keyField = `${input.provider}ApiKey` as keyof typeof settings;
        const encryptedKey = settings[keyField] as string | null;
        
        if (!encryptedKey) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `No API key found for ${input.provider}. Please save one first.`,
          });
        }

        const apiKey = decryptApiKey(encryptedKey);
        const result = await validateApiKey(input.provider, apiKey);

        if (!result.valid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.error || `Connection test failed for ${input.provider}.`,
          });
        }

        return { 
          success: true, 
          message: `Successfully connected to ${input.provider}`,
          responseTimeMs: result.responseTimeMs,
          modelsTested: result.modelsTested,
        };
      }),

    // Validate API key format (quick check without API call)
    validateKeyFormat: publicProcedure
      .input(z.object({
        provider: z.enum(["openai", "deepseek", "claude", "gemini"]),
        apiKey: z.string(),
      }))
      .query(({ input }) => {
        return validateApiKeyFormat(input.provider, input.apiKey);
      }),

    // Get pricing information for all providers
    getPricing: publicProcedure.query(() => {
      return llmPricing;
    }),

    // Estimate cost for an analysis
    estimateCost: protectedProcedure
      .input(z.object({
        provider: z.enum(["openai", "deepseek", "claude", "gemini"]),
        model: z.string(),
        inputLength: z.number(),
        estimatedOutputTokens: z.number().default(1000),
      }))
      .query(({ input }) => {
        const estimate = estimateCost(
          input.provider,
          input.model,
          "x".repeat(input.inputLength),
          input.estimatedOutputTokens
        );
        return {
          ...estimate,
          formattedCost: formatCost(estimate.estimatedCostCents),
        };
      }),

    // Get usage statistics
    getUsageStats: protectedProcedure
      .input(z.object({
        days: z.number().min(1).max(365).default(30),
      }))
      .query(async ({ ctx, input }) => {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - input.days);
        
        const stats = await db.getUserUsageStats(ctx.user.id, startDate);
        
        return {
          ...stats,
          formattedTotalCost: formatCost(stats.totalCostCents),
          formattedTotalTokens: formatTokens(stats.totalTokens),
        };
      }),

    // Get recent usage summary
    getUsageSummary: protectedProcedure.query(async ({ ctx }) => {
      const summary = await db.getRecentUsageSummary(ctx.user.id, 30);
      return {
        ...summary,
        formattedTotalCost: formatCost(summary.totalCostCents),
        formattedDailyAvgCost: formatCost(summary.dailyAvgCostCents),
        formattedTotalTokens: formatTokens(summary.totalTokens),
      };
    }),

    // Get usage logs
    getUsageLogs: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ ctx, input }) => {
        const logs = await db.getUserLlmUsageLogs(ctx.user.id, {
          limit: input.limit,
          offset: input.offset,
        });
        
        return logs.map(log => ({
          ...log,
          formattedCost: formatCost(log.costCents),
          formattedTokens: formatTokens(log.totalTokens),
        }));
      }),

    // Get fallback settings
    getFallbackSettings: protectedProcedure.query(async ({ ctx }) => {
      const settings = await db.getUserFallbackSettings(ctx.user.id);
      if (!settings) {
        return {
          fallbackEnabled: true,
          fallbackPriority: ["openai", "claude", "deepseek", "gemini"],
          maxRetries: 2,
          retryDelayMs: 1000,
          notifyOnFallback: true,
        };
      }
      return {
        fallbackEnabled: settings.fallbackEnabled,
        fallbackPriority: settings.fallbackPriority as string[] || ["openai", "claude", "deepseek", "gemini"],
        maxRetries: settings.maxRetries || 2,
        retryDelayMs: settings.retryDelayMs || 1000,
        notifyOnFallback: settings.notifyOnFallback,
      };
    }),

    // Update fallback settings
    updateFallbackSettings: protectedProcedure
      .input(z.object({
        fallbackEnabled: z.boolean().optional(),
        fallbackPriority: z.array(z.enum(["openai", "deepseek", "claude", "gemini"])).optional(),
        maxRetries: z.number().min(0).max(5).optional(),
        retryDelayMs: z.number().min(0).max(10000).optional(),
        notifyOnFallback: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertUserFallbackSettings(ctx.user.id, input);
        return { success: true };
      }),

    // Get configured providers (which have API keys)
    getConfiguredProviders: protectedProcedure.query(async ({ ctx }) => {
      const settings = await db.getUserLlmSettings(ctx.user.id);
      if (!settings) return [];
      
      const configured: LlmProvider[] = [];
      if (settings.openaiApiKey) configured.push("openai");
      if (settings.deepseekApiKey) configured.push("deepseek");
      if (settings.claudeApiKey) configured.push("claude");
      if (settings.geminiApiKey) configured.push("gemini");
      
      return configured;
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

    listUsers: adminProcedure
      .input(z.object({
        page: z.number().default(1),
        limit: z.number().default(20),
        search: z.string().optional(),
        role: z.enum(["admin", "user"]).optional(),
        tier: z.enum(["free", "starter", "pro", "elite"]).optional(),
      }))
      .query(async ({ input }) => {
        const allUsers = await db.getAllUsers();
        let filtered = allUsers;
        
        // Apply search filter
        if (input.search) {
          const search = input.search.toLowerCase();
          filtered = filtered.filter(u => 
            u.name?.toLowerCase().includes(search) || 
            u.email?.toLowerCase().includes(search)
          );
        }
        
        // Apply role filter
        if (input.role) {
          filtered = filtered.filter(u => u.role === input.role);
        }
        
        // Apply tier filter
        if (input.tier) {
          filtered = filtered.filter(u => u.subscriptionTier === input.tier);
        }
        
        const total = filtered.length;
        const start = (input.page - 1) * input.limit;
        const users = filtered.slice(start, start + input.limit);
        
        const verifiedCount = allUsers.filter(u => u.isEmailVerified).length;
        const adminCount = allUsers.filter(u => u.role === "admin").length;
        const paidCount = allUsers.filter(u => u.subscriptionTier !== "free").length;
        
        return { users, total, verifiedCount, adminCount, paidCount };
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

    // Email Configuration
    getEmailConfig: adminProcedure.query(async () => {
      const config = await db.getEmailConfig();
      if (!config) {
        return {
          id: null,
          isEnabled: false,
          senderEmail: null,
          senderName: null,
          replyToEmail: null,
          dailyLimit: 1000,
          testMode: true,
          testEmail: null,
          emailsSentToday: 0,
          hasApiKey: false,
        };
      }
      return {
        id: config.id,
        isEnabled: config.isEnabled,
        senderEmail: config.senderEmail,
        senderName: config.senderName,
        replyToEmail: config.replyToEmail,
        dailyLimit: config.dailyLimit,
        testMode: config.testMode,
        testEmail: config.testEmail,
        emailsSentToday: config.emailsSentToday,
        hasApiKey: !!config.sendgridApiKey,
      };
    }),

    updateEmailConfig: adminProcedure
      .input(z.object({
        sendgridApiKey: z.string().optional(),
        senderEmail: z.string().email().optional(),
        senderName: z.string().optional(),
        replyToEmail: z.string().email().optional().nullable(),
        isEnabled: z.boolean().optional(),
        dailyLimit: z.number().min(1).max(100000).optional(),
        testMode: z.boolean().optional(),
        testEmail: z.string().email().optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        const data: Record<string, unknown> = {
          ...input,
          configuredBy: ctx.user.id,
        };
        
        // Only update API key if provided
        if (input.sendgridApiKey === undefined) {
          delete data.sendgridApiKey;
        }
        
        await db.upsertEmailConfig(data);
        return { success: true };
      }),

    testEmailConnection: adminProcedure
      .input(z.object({
        apiKey: z.string().optional(),
        testEmail: z.string().email(),
      }))
      .mutation(async ({ input }) => {
        // Get current config or use provided API key
        const config = await db.getEmailConfig();
        const apiKey = input.apiKey || config?.sendgridApiKey;
        
        if (!apiKey) {
          return { success: false, error: "No SendGrid API key configured" };
        }
        
        try {
          const result = await testSendGridApiKey(apiKey, input.testEmail);
          return result;
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : "Failed to send test email" 
          };
        }
      }),

    getEmailStats: adminProcedure.query(async () => {
      const config = await db.getEmailConfig();
      return {
        emailsSentToday: config?.emailsSentToday || 0,
        dailyLimit: config?.dailyLimit || 1000,
        lastResetAt: config?.lastResetAt,
        isEnabled: config?.isEnabled || false,
      };
    }),
  }),

  // ==================== PHASE 14: PERFORMANCE TRACKING ====================
  accuracy: router({
    // Get user's prediction accuracy stats
    getStats: protectedProcedure.query(async ({ ctx }) => {
      return db.getAgentAccuracyStats(ctx.user.id);
    }),

    // Get accuracy records
    getRecords: protectedProcedure
      .input(z.object({
        agentType: z.enum(["technical", "fundamental", "sentiment", "risk", "microstructure", "macro", "quant", "consensus"]).optional(),
        timeframe: z.enum(["1day", "7day", "30day"]).optional(),
        limit: z.number().min(1).max(100).default(50),
      }))
      .query(async ({ ctx }) => {
        return db.getUserPredictionAccuracy(ctx.user.id);
      }),

    // Get price tracking for an analysis
    getPriceTracking: protectedProcedure
      .input(z.object({ analysisId: z.number() }))
      .query(async ({ input }) => {
        return db.getPriceTrackingByAnalysis(input.analysisId);
      }),
  }),

  // ==================== PHASE 15: SAVED COMPARISONS & WATCHLISTS ====================
  savedComparisons: router({
    // List user's saved comparisons
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserSavedComparisons(ctx.user.id);
    }),

    // Get a specific saved comparison
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const comparison = await db.getSavedComparisonById(input.id, ctx.user.id);
        if (!comparison) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Comparison not found" });
        }
        return comparison;
      }),

    // Create a new saved comparison
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        analysisIds: z.array(z.number()).min(1).max(10),
        symbolsIncluded: z.array(z.string()).optional(),
        dateRange: z.object({
          start: z.string(),
          end: z.string(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createSavedComparison({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          analysisIds: input.analysisIds,
          symbolsIncluded: input.symbolsIncluded,
          dateRange: input.dateRange,
        });
        return { id, success: true };
      }),

    // Update a saved comparison
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        isPinned: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateSavedComparison(input.id, ctx.user.id, input);
        return { success: true };
      }),

    // Delete a saved comparison
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteSavedComparison(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // Watchlist Alerts
  watchlistAlerts: router({
    // List user's alerts
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserWatchlistAlerts(ctx.user.id);
    }),

    // Create a new alert
    create: protectedProcedure
      .input(z.object({
        symbol: z.string().min(1).max(20),
        alertOnRecommendationChange: z.boolean().default(true),
        alertOnConfidenceChange: z.boolean().default(false),
        confidenceThreshold: z.number().min(0).max(1).optional(),
        alertOnPriceTarget: z.boolean().default(false),
        priceTargetHigh: z.number().optional(),
        priceTargetLow: z.number().optional(),
        emailNotification: z.boolean().default(true),
        pushNotification: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createWatchlistAlert({
          userId: ctx.user.id,
          symbol: input.symbol.toUpperCase(),
          alertOnRecommendationChange: input.alertOnRecommendationChange,
          alertOnConfidenceChange: input.alertOnConfidenceChange,
          confidenceThreshold: input.confidenceThreshold?.toString(),
          alertOnPriceTarget: input.alertOnPriceTarget,
          priceTargetHigh: input.priceTargetHigh?.toString(),
          priceTargetLow: input.priceTargetLow?.toString(),
          emailNotification: input.emailNotification,
          pushNotification: input.pushNotification,
        });
        return { id, success: true };
      }),

    // Update an alert
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        isActive: z.boolean().optional(),
        alertOnRecommendationChange: z.boolean().optional(),
        alertOnConfidenceChange: z.boolean().optional(),
        confidenceThreshold: z.number().min(0).max(1).optional(),
        alertOnPriceTarget: z.boolean().optional(),
        priceTargetHigh: z.number().optional(),
        priceTargetLow: z.number().optional(),
        emailNotification: z.boolean().optional(),
        pushNotification: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateWatchlistAlert(id, ctx.user.id, {
          ...data,
          confidenceThreshold: data.confidenceThreshold?.toString(),
          priceTargetHigh: data.priceTargetHigh?.toString(),
          priceTargetLow: data.priceTargetLow?.toString(),
        });
        return { success: true };
      }),

    // Delete an alert
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteWatchlistAlert(input.id, ctx.user.id);
        return { success: true };
      }),

    // Get alert history
    getHistory: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
      .query(async ({ ctx, input }) => {
        return db.getUserAlertHistory(ctx.user.id, input.limit);
      }),
  }),

  // ==================== PHASE 16: NOTIFICATIONS ====================
  notifications: router({
    // Get user's notifications
    list: protectedProcedure
      .input(z.object({ unreadOnly: z.boolean().default(false) }))
      .query(async ({ ctx, input }) => {
        return db.getUserNotifications(ctx.user.id, input.unreadOnly);
      }),

    // Get unread count
    getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
      return db.getUnreadNotificationCount(ctx.user.id);
    }),

    // Mark notification as read
    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.markNotificationRead(input.id, ctx.user.id);
        return { success: true };
      }),

    // Mark all as read
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markAllNotificationsRead(ctx.user.id);
      return { success: true };
    }),

    // Delete notification
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteNotification(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ==================== PHASE 17: BOT SCHEDULING ====================
  botSchedule: router({
    // Get schedules for a bot
    list: protectedProcedure
      .input(z.object({ botId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Verify bot ownership
        const bot = await db.getTradingBotById(input.botId, ctx.user.id);
        if (!bot) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Bot not found" });
        }
        return db.getBotSchedules(input.botId);
      }),

    // Create a schedule
    create: protectedProcedure
      .input(z.object({
        botId: z.number(),
        name: z.string().min(1).max(255),
        scheduleType: z.enum(["once", "daily", "weekly", "monthly", "cron"]),
        cronExpression: z.string().optional(),
        runTime: z.string().optional(),
        daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
        dayOfMonth: z.number().min(1).max(31).optional(),
        timezone: z.string().default("UTC"),
        maxExecutionTime: z.number().min(60).max(3600).default(300),
        retryOnFailure: z.boolean().default(true),
        maxRetries: z.number().min(0).max(5).default(3),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify bot ownership
        const bot = await db.getTradingBotById(input.botId, ctx.user.id);
        if (!bot) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Bot not found" });
        }

        // Check tier access for scheduling
        if (!checkTierAccess(ctx.user.subscriptionTier, "starter")) {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "Bot scheduling requires Starter tier or higher" 
          });
        }

        const id = await db.createBotSchedule({
          botId: input.botId,
          userId: ctx.user.id,
          name: input.name,
          scheduleType: input.scheduleType,
          cronExpression: input.cronExpression,
          runTime: input.runTime,
          daysOfWeek: input.daysOfWeek,
          dayOfMonth: input.dayOfMonth,
          timezone: input.timezone,
          maxExecutionTime: input.maxExecutionTime,
          retryOnFailure: input.retryOnFailure,
          maxRetries: input.maxRetries,
        });
        return { id, success: true };
      }),

    // Update a schedule
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        isActive: z.boolean().optional(),
        runTime: z.string().optional(),
        daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
        timezone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateBotSchedule(id, data);
        return { success: true };
      }),

    // Delete a schedule
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteBotSchedule(input.id);
        return { success: true };
      }),

    // Toggle schedule active status
    toggle: protectedProcedure
      .input(z.object({ id: z.number(), enabled: z.boolean() }))
      .mutation(async ({ input }) => {
        await db.updateBotSchedule(input.id, { isActive: input.enabled });
        return { success: true };
      }),

    // Get execution logs
    getExecutionLogs: protectedProcedure
      .input(z.object({ botId: z.number().optional(), limit: z.number().default(50) }))
      .query(async ({ ctx, input }) => {
        return db.getBotExecutionLogs(input.botId, ctx.user.id, input.limit);
      }),
  }),

  // Bot Risk Rules
  botRiskRules: router({
    // Get risk rules for a bot
    list: protectedProcedure
      .input(z.object({ botId: z.number() }))
      .query(async ({ ctx, input }) => {
        const bot = await db.getTradingBotById(input.botId, ctx.user.id);
        if (!bot) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Bot not found" });
        }
        return db.getBotRiskRules(input.botId);
      }),

    // Create a risk rule
    create: protectedProcedure
      .input(z.object({
        botId: z.number(),
        name: z.string().min(1).max(255),
        ruleType: z.enum(["stop_loss", "take_profit", "trailing_stop", "max_position", "max_daily_loss", "max_drawdown", "position_sizing"]),
        triggerValue: z.number(),
        triggerType: z.enum(["percentage", "absolute", "atr_multiple"]).default("percentage"),
        actionOnTrigger: z.enum(["close_position", "reduce_position", "pause_bot", "notify_only"]).default("close_position"),
        reduceByPercentage: z.number().min(0).max(100).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const bot = await db.getTradingBotById(input.botId, ctx.user.id);
        if (!bot) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Bot not found" });
        }

        const id = await db.createBotRiskRule({
          botId: input.botId,
          userId: ctx.user.id,
          name: input.name,
          ruleType: input.ruleType,
          triggerValue: input.triggerValue.toString(),
          triggerType: input.triggerType,
          actionOnTrigger: input.actionOnTrigger,
          reduceByPercentage: input.reduceByPercentage?.toString(),
        });
        return { id, success: true };
      }),

    // Update a risk rule
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        isActive: z.boolean().optional(),
        triggerValue: z.number().optional(),
        actionOnTrigger: z.enum(["close_position", "reduce_position", "pause_bot", "notify_only"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateBotRiskRule(id, {
          ...data,
          triggerValue: data.triggerValue?.toString(),
        });
        return { success: true };
      }),

    // Delete a risk rule
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteBotRiskRule(input.id);
        return { success: true };
      }),
  }),

  // Bot Execution Logs
  botExecutionLogs: router({
    // Get execution logs for a bot
    list: protectedProcedure
      .input(z.object({
        botId: z.number(),
        limit: z.number().min(1).max(100).default(50),
      }))
      .query(async ({ ctx, input }) => {
        const bot = await db.getTradingBotById(input.botId, ctx.user.id);
        if (!bot) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Bot not found" });
        }
        return db.getBotExecutionLogs(input.botId, input.limit);
      }),
  }),

  // Bot Benchmarks
  botBenchmarks: router({
    // Get benchmarks for a bot
    list: protectedProcedure
      .input(z.object({ botId: z.number() }))
      .query(async ({ ctx, input }) => {
        const bot = await db.getTradingBotById(input.botId, ctx.user.id);
        if (!bot) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Bot not found" });
        }
        return db.getBotBenchmarks(input.botId);
      }),

    // Get latest benchmark
    getLatest: protectedProcedure
      .input(z.object({ botId: z.number() }))
      .query(async ({ ctx, input }) => {
        const bot = await db.getTradingBotById(input.botId, ctx.user.id);
        if (!bot) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Bot not found" });
        }
        return db.getLatestBotBenchmark(input.botId);
      }),
  }),

  // ==================== PHASE 18: SOCIAL & COMMUNITY ====================
  profile: router({
    // Get own profile
    get: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserProfile(ctx.user.id);
    }),

    // Get public profile by user ID
    getPublic: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return db.getPublicUserProfile(input.userId);
      }),

    // Update profile
    update: protectedProcedure
      .input(z.object({
        displayName: z.string().min(1).max(100).optional(),
        bio: z.string().max(500).optional(),
        avatarUrl: z.string().url().optional(),
        location: z.string().max(100).optional(),
        website: z.string().url().optional(),
        twitterHandle: z.string().max(50).optional(),
        isPublic: z.boolean().optional(),
        showTradingStats: z.boolean().optional(),
        showPortfolio: z.boolean().optional(),
        allowFollowers: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertUserProfile(ctx.user.id, input);
        return { success: true };
      }),

    // Get top traders
    getTopTraders: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
      .query(async ({ input }) => {
        return db.getTopTraders(input.limit);
      }),

    // Get user badges
    getBadges: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserBadges(ctx.user.id);
    }),

    // Get all badge definitions
    getAllBadges: publicProcedure.query(async () => {
      return db.getAllBadgeDefinitions();
    }),
  }),

  // Follow system
  follow: router({
    // Get followers
    getFollowers: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserFollowers(ctx.user.id);
    }),

    // Get following
    getFollowing: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserFollowing(ctx.user.id);
    }),

    // Check if following
    isFollowing: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.isFollowing(ctx.user.id, input.userId);
      }),

    // Follow a user
    follow: protectedProcedure
      .input(z.object({
        userId: z.number(),
        notifyOnTrade: z.boolean().default(false),
        notifyOnAnalysis: z.boolean().default(true),
        notifyOnStrategy: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        if (input.userId === ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot follow yourself" });
        }

        // Check if target user allows followers
        const targetProfile = await db.getUserProfile(input.userId);
        if (targetProfile && !targetProfile.allowFollowers) {
          throw new TRPCError({ code: "FORBIDDEN", message: "This user does not allow followers" });
        }

        // Check if already following
        const alreadyFollowing = await db.isFollowing(ctx.user.id, input.userId);
        if (alreadyFollowing) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Already following this user" });
        }

        await db.createUserFollow({
          followerId: ctx.user.id,
          followingId: input.userId,
          notifyOnTrade: input.notifyOnTrade,
          notifyOnAnalysis: input.notifyOnAnalysis,
          notifyOnStrategy: input.notifyOnStrategy,
        });

        // Create activity feed item
        await db.createActivityFeedItem({
          userId: ctx.user.id,
          activityType: "follow",
          title: "Started following a trader",
          relatedEntityType: "user",
          relatedEntityId: input.userId,
          isPublic: true,
        });

        return { success: true };
      }),

    // Unfollow a user
    unfollow: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.unfollowUser(ctx.user.id, input.userId);
        return { success: true };
      }),
  }),

  // Discussion threads
  discussion: router({
    // Get threads
    list: publicProcedure
      .input(z.object({
        threadType: z.enum(["analysis", "strategy", "bot", "general", "market"]).optional(),
        symbol: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ input }) => {
        return db.getDiscussionThreads(input);
      }),

    // Get a thread
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const thread = await db.getDiscussionThreadById(input.id);
        if (!thread) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Thread not found" });
        }
        // Increment view count
        await db.incrementThreadViews(input.id);
        return thread;
      }),

    // Create a thread
    create: protectedProcedure
      .input(z.object({
        threadType: z.enum(["analysis", "strategy", "bot", "general", "market"]),
        title: z.string().min(1).max(255),
        content: z.string().min(1).max(10000),
        symbol: z.string().optional(),
        relatedEntityId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createDiscussionThread({
          userId: ctx.user.id,
          threadType: input.threadType,
          title: input.title,
          content: input.content,
          symbol: input.symbol?.toUpperCase(),
          relatedEntityId: input.relatedEntityId,
        });

        // Create activity feed item
        await db.createActivityFeedItem({
          userId: ctx.user.id,
          activityType: "comment",
          title: `Started a discussion: ${input.title}`,
          relatedEntityType: "thread",
          relatedEntityId: id,
          symbol: input.symbol?.toUpperCase(),
          isPublic: true,
        });

        return { id, success: true };
      }),

    // Update a thread
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        content: z.string().min(1).max(10000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const thread = await db.getDiscussionThreadById(input.id);
        if (!thread || thread.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cannot edit this thread" });
        }
        const { id, ...data } = input;
        await db.updateDiscussionThread(id, data);
        return { success: true };
      }),

    // Get comments for a thread
    getComments: publicProcedure
      .input(z.object({ threadId: z.number() }))
      .query(async ({ input }) => {
        return db.getThreadComments(input.threadId);
      }),

    // Add a comment
    addComment: protectedProcedure
      .input(z.object({
        threadId: z.number(),
        content: z.string().min(1).max(5000),
        parentCommentId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createDiscussionComment({
          threadId: input.threadId,
          userId: ctx.user.id,
          content: input.content,
          parentCommentId: input.parentCommentId,
        });
        return { id, success: true };
      }),

    // Update a comment
    updateComment: protectedProcedure
      .input(z.object({
        id: z.number(),
        content: z.string().min(1).max(5000),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateDiscussionComment(input.id, ctx.user.id, { content: input.content });
        return { success: true };
      }),

    // Delete a comment
    deleteComment: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteDiscussionComment(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // Strategy ratings
  strategyRatings: router({
    // Get ratings for a listing
    list: publicProcedure
      .input(z.object({ listingId: z.number() }))
      .query(async ({ input }) => {
        return db.getStrategyRatings(input.listingId);
      }),

    // Get user's rating for a listing
    getUserRating: protectedProcedure
      .input(z.object({ listingId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getUserStrategyRating(input.listingId, ctx.user.id);
      }),

    // Create or update rating
    rate: protectedProcedure
      .input(z.object({
        listingId: z.number(),
        rating: z.number().min(1).max(5),
        review: z.string().max(2000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getUserStrategyRating(input.listingId, ctx.user.id);
        if (existing) {
          await db.updateStrategyRating(existing.id, ctx.user.id, {
            rating: input.rating,
            review: input.review,
          });
        } else {
          await db.createStrategyRating({
            listingId: input.listingId,
            userId: ctx.user.id,
            rating: input.rating,
            review: input.review,
          });
        }
        return { success: true };
      }),
  }),

  // Activity feed
  activityFeed: router({
    // Get personalized feed (from followed users)
    getFeed: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
      .query(async ({ ctx, input }) => {
        return db.getUserActivityFeed(ctx.user.id, input.limit);
      }),

    // Get public feed
    getPublicFeed: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
      .query(async ({ input }) => {
        return db.getPublicActivityFeed(input.limit);
      }),
  }),

  // ==================== BACKTESTING VALIDATION ====================
  backtestValidation: router({
    // Run backtest validation
    run: protectedProcedure
      .input(z.object({
        symbol: z.string().min(1).max(10),
        startDate: z.string(),
        endDate: z.string(),
        initialCapital: z.number().min(1000).max(10000000),
        strategyType: z.enum(['standard', 'enhanced', 'rl', 'custom']),
        strategyConfig: z.record(z.string(), z.unknown()).optional(),
        commission: z.number().min(0).max(0.1).optional(),
        slippage: z.number().min(0).max(0.1).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const config: ValidationConfig = {
          symbol: input.symbol.toUpperCase(),
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          initialCapital: input.initialCapital,
          strategyType: input.strategyType,
          strategyConfig: input.strategyConfig,
          commission: input.commission,
          slippage: input.slippage,
        };
        
        return runBacktestValidation(ctx.user.id, config);
      }),

    // Get user's backtest history
    list: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
      .query(async ({ ctx, input }) => {
        return getUserBacktests(ctx.user.id, input.limit);
      }),

    // Get specific backtest result
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return getBacktestById(input.id, ctx.user.id);
      }),
  }),

  // ==================== REINFORCEMENT LEARNING AGENT ====================
  rlAgent: router({
    // Create and train a new RL agent
    train: protectedProcedure
      .input(z.object({
        symbol: z.string().min(1).max(10),
        name: z.string().min(1).max(100),
        episodes: z.number().min(10).max(1000).default(100),
        config: z.object({
          learningRate: z.number().min(0.00001).max(0.1).optional(),
          gamma: z.number().min(0.5).max(0.999).optional(),
          epsilon: z.number().min(0).max(1).optional(),
          epsilonDecay: z.number().min(0.9).max(0.9999).optional(),
          epsilonMin: z.number().min(0).max(0.5).optional(),
          batchSize: z.number().min(16).max(256).optional(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const agent = new RLTradingAgent(input.config);
        
        // Save initial model
        const modelId = await agent.saveModel(
          ctx.user.id,
          input.name,
          input.symbol.toUpperCase()
        );
        
        // Return model ID - training happens in background
        return {
          modelId,
          message: 'RL agent created successfully. Training will continue in background.',
          stats: agent.getStats(),
        };
      }),

    // Get prediction from trained RL agent
    predict: protectedProcedure
      .input(z.object({
        modelId: z.string(),
        state: z.object({
          priceChange1d: z.number(),
          priceChange5d: z.number(),
          priceChange20d: z.number(),
          volatility: z.number(),
          rsi: z.number(),
          macdHistogram: z.number(),
          bollingerPosition: z.number(),
          adx: z.number(),
          atr: z.number(),
          marketRegime: z.number(),
          vixLevel: z.number(),
          currentPosition: z.number(),
          unrealizedPnl: z.number(),
          daysInPosition: z.number(),
        }),
      }))
      .query(async ({ input }) => {
        const agent = new RLTradingAgent();
        const loaded = await agent.loadModel(input.modelId);
        
        if (!loaded) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Model not found' });
        }
        
        const action = agent.getAction(input.state);
        return action;
      }),

    // List user's RL models
    list: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
      .query(async ({ ctx, input }) => {
        return db.getUserRLModels(ctx.user.id, input.limit);
      }),
  }),

  // ==================== STRATEGY COMPARISON ====================
  strategyComparison: router({
    // Run strategy comparison
    compare: protectedProcedure
      .input(z.object({
        symbol: z.string().min(1).max(10),
        startDate: z.string(),
        endDate: z.string(),
        initialCapital: z.number().min(1000).max(10000000),
        strategies: z.array(z.enum(['standard', 'enhanced', 'rl'])).min(2).max(4),
        name: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const results: Record<string, any> = {};
        
        // Run backtest for each strategy
        for (const strategy of input.strategies) {
          const config: ValidationConfig = {
            symbol: input.symbol.toUpperCase(),
            startDate: new Date(input.startDate),
            endDate: new Date(input.endDate),
            initialCapital: input.initialCapital,
            strategyType: strategy,
          };
          
          const result = await runBacktestValidation(ctx.user.id, config);
          results[strategy] = result;
        }
        
        // Determine winner based on Sharpe ratio
        let winner = '';
        let bestSharpe = -Infinity;
        for (const [strategy, result] of Object.entries(results)) {
          if (result.metrics.sharpeRatio > bestSharpe) {
            bestSharpe = result.metrics.sharpeRatio;
            winner = strategy;
          }
        }
        
        // Save comparison to database
        const comparison = await db.saveStrategyComparison({
          userId: ctx.user.id,
          name: input.name || `${input.symbol} Comparison`,
          symbol: input.symbol.toUpperCase(),
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          initialCapital: input.initialCapital,
          strategies: input.strategies.map(s => ({ type: s })),
          results,
          winner,
        });
        
        return {
          id: comparison?.id,
          results,
          winner,
          summary: {
            symbol: input.symbol,
            period: `${input.startDate} to ${input.endDate}`,
            strategies: input.strategies,
            metrics: Object.fromEntries(
              Object.entries(results).map(([strategy, result]) => [
                strategy,
                {
                  totalReturn: result.metrics.totalReturn,
                  sharpeRatio: result.metrics.sharpeRatio,
                  maxDrawdown: result.metrics.maxDrawdown,
                  winRate: result.metrics.winRate,
                  totalTrades: result.metrics.totalTrades,
                },
              ])
            ),
          },
        };
      }),

    // Get user's comparison history
    list: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
      .query(async ({ ctx, input }) => {
        return db.getUserStrategyComparisons(ctx.user.id, input.limit);
      }),

    // Get specific comparison
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getStrategyComparisonById(input.id, ctx.user.id);
      }),
  }),

  // ==================== MONTE CARLO SIMULATION ====================
  monteCarlo: router({
    // Run full Monte Carlo simulation
    run: protectedProcedure
      .input(z.object({
        symbol: z.string().min(1).max(10),
        initialCapital: z.number().min(1000).max(10000000),
        numSimulations: z.number().min(100).max(10000).default(1000),
        timeHorizonDays: z.number().min(5).max(504).default(252),
        confidenceLevels: z.array(z.number().min(0.5).max(0.99)).default([0.95, 0.99]),
        strategyType: z.enum(['buy_hold', 'momentum', 'mean_reversion', 'enhanced']).default('buy_hold'),
        riskFreeRate: z.number().min(0).max(0.2).default(0.05),
      }))
      .mutation(async ({ input }) => {
        const config: MonteCarloConfig = {
          symbol: input.symbol.toUpperCase(),
          initialCapital: input.initialCapital,
          numSimulations: input.numSimulations,
          timeHorizonDays: input.timeHorizonDays,
          confidenceLevels: input.confidenceLevels,
          strategyType: input.strategyType,
          riskFreeRate: input.riskFreeRate,
        };
        
        return runMonteCarloSimulation(config);
      }),

    // Quick simulation for preview
    quick: protectedProcedure
      .input(z.object({
        symbol: z.string().min(1).max(10),
        initialCapital: z.number().min(1000).max(10000000).default(100000),
        timeHorizonDays: z.number().min(5).max(504).default(252),
      }))
      .query(async ({ input }) => {
        return runQuickSimulation(
          input.symbol.toUpperCase(),
          input.initialCapital,
          input.timeHorizonDays
        );
      }),
  }),

  // ==================== WALK-FORWARD OPTIMIZATION ====================
  walkForward: router({
    // Run full walk-forward optimization
    run: protectedProcedure
      .input(z.object({
        symbol: z.string().min(1).max(10),
        totalPeriodDays: z.number().min(126).max(2520).default(504),
        trainingWindowDays: z.number().min(21).max(504).default(126),
        testingWindowDays: z.number().min(5).max(126).default(63),
        stepSizeDays: z.number().min(5).max(126).default(63),
        optimizationType: z.enum(['anchored', 'rolling']).default('rolling'),
        strategyType: z.enum(['rl', 'momentum', 'mean_reversion', 'enhanced']).default('enhanced'),
        initialCapital: z.number().min(1000).max(10000000).default(100000),
      }))
      .mutation(async ({ input }) => {
        const config: WalkForwardConfig = {
          symbol: input.symbol.toUpperCase(),
          totalPeriodDays: input.totalPeriodDays,
          trainingWindowDays: input.trainingWindowDays,
          testingWindowDays: input.testingWindowDays,
          stepSizeDays: input.stepSizeDays,
          optimizationType: input.optimizationType,
          strategyType: input.strategyType,
          initialCapital: input.initialCapital,
        };
        
        return runWalkForwardOptimization(config);
      }),

    // Quick walk-forward analysis
    quick: protectedProcedure
      .input(z.object({
        symbol: z.string().min(1).max(10),
        strategyType: z.enum(['rl', 'momentum', 'mean_reversion', 'enhanced']).default('enhanced'),
      }))
      .query(async ({ input }) => {
        return runQuickWalkForward(
          input.symbol.toUpperCase(),
          input.strategyType
        );
      }),
  }),

  // ==================== PORTFOLIO BACKTESTING ====================
  portfolioBacktest: router({
    // Run full portfolio backtest
    backtest: protectedProcedure
      .input(z.object({
        assets: z.array(z.object({
          symbol: z.string().min(1).max(10),
          weight: z.number().min(0).max(1),
          name: z.string().optional(),
        })).min(2).max(20),
        initialCapital: z.number().min(1000).max(10000000).default(100000),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        rebalanceFrequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'none']).default('monthly'),
        riskFreeRate: z.number().min(0).max(0.2).default(0.05),
        benchmarkSymbol: z.string().default('SPY'),
      }))
      .mutation(async ({ input }) => {
        // Normalize weights
        const totalWeight = input.assets.reduce((sum, a) => sum + a.weight, 0);
        const normalizedAssets = input.assets.map(a => ({
          ...a,
          symbol: a.symbol.toUpperCase(),
          weight: a.weight / totalWeight,
        }));

        const config: PortfolioConfig = {
          assets: normalizedAssets,
          initialCapital: input.initialCapital,
          startDate: input.startDate ? new Date(input.startDate) : new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000),
          endDate: input.endDate ? new Date(input.endDate) : new Date(),
          rebalanceFrequency: input.rebalanceFrequency,
          riskFreeRate: input.riskFreeRate,
          benchmarkSymbol: input.benchmarkSymbol.toUpperCase(),
        };
        
        return runPortfolioBacktest(config);
      }),

    // Quick portfolio analysis
    quickAnalysis: protectedProcedure
      .input(z.object({
        symbols: z.array(z.string().min(1).max(10)).min(2).max(20),
        weights: z.array(z.number().min(0).max(1)).optional(),
      }))
      .query(async ({ input }) => {
        const weights = input.weights || input.symbols.map(() => 1 / input.symbols.length);
        return runQuickPortfolioAnalysis(
          input.symbols.map(s => s.toUpperCase()),
          weights
        );
      }),

    // Get efficient frontier for assets
    efficientFrontier: protectedProcedure
      .input(z.object({
        symbols: z.array(z.string().min(1).max(10)).min(2).max(10),
      }))
      .query(async ({ input }) => {
        const assets = input.symbols.map(symbol => ({
          symbol: symbol.toUpperCase(),
          weight: 1 / input.symbols.length,
        }));

        const result = await runPortfolioBacktest({
          assets,
          initialCapital: 100000,
          startDate: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000),
          endDate: new Date(),
          rebalanceFrequency: 'monthly',
        });

        return {
          frontier: result.efficientFrontier,
          correlationMatrix: result.correlationMatrix,
          diversificationMetrics: result.diversificationMetrics,
        };
      }),
  }),

  // Regime-Switching Models
  regime: router({
    analyze: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        lookbackDays: z.number().min(30).max(365).default(90),
      }))
      .mutation(async ({ input }) => {
        const config: RegimeConfig = {
          symbol: input.symbol,
          lookbackDays: input.lookbackDays,
        };
        return analyzeMarketRegime(config);
      }),

    quick: protectedProcedure
      .input(z.object({ symbol: z.string() }))
      .query(async ({ input }) => {
        return getQuickRegime(input.symbol);
      }),
  }),

  // Options Greeks Calculator
  options: router({
    calculateGreeks: protectedProcedure
      .input(z.object({
        underlyingPrice: z.number().positive(),
        strikePrice: z.number().positive(),
        timeToExpiry: z.number().min(0).max(5),
        riskFreeRate: z.number().min(0).max(1).default(0.05),
        volatility: z.number().min(0.01).max(5).default(0.25),
        optionType: z.enum(['call', 'put']),
        dividendYield: z.number().min(0).max(1).optional(),
      }))
      .mutation(async ({ input }) => {
        const optionInput: OptionInput = {
          underlyingPrice: input.underlyingPrice,
          strikePrice: input.strikePrice,
          timeToExpiry: input.timeToExpiry,
          riskFreeRate: input.riskFreeRate,
          volatility: input.volatility,
          optionType: input.optionType,
          dividendYield: input.dividendYield,
        };
        const greeks = calculateGreeks(optionInput);
        const visualization = generateGreeksVisualization(optionInput);
        return { greeks, visualization };
      }),

    impliedVolatility: protectedProcedure
      .input(z.object({
        marketPrice: z.number().positive(),
        underlyingPrice: z.number().positive(),
        strikePrice: z.number().positive(),
        timeToExpiry: z.number().min(0.001).max(5),
        riskFreeRate: z.number().min(0).max(1).default(0.05),
        optionType: z.enum(['call', 'put']),
        dividendYield: z.number().min(0).max(1).optional(),
      }))
      .mutation(async ({ input }) => {
        const iv = calculateImpliedVolatility(
          input.marketPrice,
          input.underlyingPrice,
          input.strikePrice,
          input.timeToExpiry,
          input.riskFreeRate,
          input.optionType,
          input.dividendYield || 0
        );
        return { impliedVolatility: iv, annualizedPercent: iv * 100 };
      }),

    optionChain: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        expirationDays: z.number().min(1).max(365).default(30),
        numStrikes: z.number().min(5).max(21).default(11),
      }))
      .query(async ({ input }) => {
        return generateOptionChain(input.symbol, input.expirationDays, input.numStrikes);
      }),

    analyzeStrategy: protectedProcedure
      .input(z.object({
        legs: z.array(z.object({
          optionType: z.enum(['call', 'put']),
          strikePrice: z.number().positive(),
          quantity: z.number(),
          premium: z.number().min(0),
        })),
        underlyingPrice: z.number().positive(),
        timeToExpiry: z.number().min(0).max(5),
        riskFreeRate: z.number().min(0).max(1).default(0.05),
        volatility: z.number().min(0.01).max(5).default(0.25),
      }))
      .mutation(async ({ input }) => {
        return analyzeStrategy(
          input.legs,
          input.underlyingPrice,
          input.timeToExpiry,
          input.riskFreeRate,
          input.volatility
        );
      }),
  }),

  // Sentiment Analysis
  sentiment: router({
    analyze: protectedProcedure
      .input(z.object({ symbol: z.string() }))
      .mutation(async ({ input }) => {
        return analyzeSentiment(input.symbol);
      }),

    quick: protectedProcedure
      .input(z.object({ symbol: z.string() }))
      .query(async ({ input }) => {
        return getQuickSentiment(input.symbol);
      }),

    batch: protectedProcedure
      .input(z.object({ symbols: z.array(z.string()).max(10) }))
      .mutation(async ({ input }) => {
        return analyzeBatchSentiment(input.symbols);
      }),
  }),

  // Crypto Trading
  crypto: router({
    price: protectedProcedure
      .input(z.object({ symbol: z.string() }))
      .query(async ({ input }) => {
        return getCryptoPrice(input.symbol);
      }),

    prices: protectedProcedure
      .input(z.object({ symbols: z.array(z.string()).optional() }))
      .query(async ({ input }) => {
        return getCryptoPrices(input.symbols);
      }),

    ohlcv: protectedProcedure
      .input(z.object({ symbol: z.string(), interval: z.enum(['1h', '4h', '1d', '1w']).optional(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        return getCryptoOHLCV(input.symbol, input.interval, input.limit);
      }),

    indicators: protectedProcedure
      .input(z.object({ symbol: z.string() }))
      .query(async ({ input }) => {
        return getCryptoIndicators(input.symbol);
      }),

    analysis: protectedProcedure
      .input(z.object({ symbol: z.string() }))
      .mutation(async ({ input }) => {
        return analyzeCrypto(input.symbol);
      }),

    defiProtocols: protectedProcedure
      .query(async () => {
        return getDeFiProtocols();
      }),
  }),

  // Paper Trading
  paperTrading: router({
    createAccount: protectedProcedure
      .input(z.object({
        name: z.string(),
        initialBalance: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createPaperAccount(String(ctx.user.id), input.name, input.initialBalance);
      }),

    getAccount: protectedProcedure
      .input(z.object({ accountId: z.string() }))
      .query(async ({ input }) => {
        return getPaperAccount(input.accountId);
      }),

    listAccounts: protectedProcedure
      .query(async ({ ctx }) => {
        return getUserPaperAccounts(String(ctx.user.id));
      }),

    placeOrder: protectedProcedure
      .input(z.object({
        accountId: z.string(),
        symbol: z.string(),
        assetType: z.enum(['stock', 'crypto']),
        side: z.enum(['buy', 'sell']),
        type: z.enum(['market', 'limit', 'stop_loss', 'take_profit', 'stop_limit']),
        quantity: z.number(),
        price: z.number().optional(),
        stopPrice: z.number().optional(),
        takeProfitPrice: z.number().optional(),
        stopLossPrice: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return placePaperOrder(
          input.accountId,
          input.symbol,
          input.assetType,
          input.side,
          input.type,
          input.quantity,
          {
            price: input.price,
            stopPrice: input.stopPrice,
            takeProfitPrice: input.takeProfitPrice,
            stopLossPrice: input.stopLossPrice,
          }
        );
      }),

    getPositions: protectedProcedure
      .input(z.object({ accountId: z.string() }))
      .query(async ({ input }) => {
        return getAccountPositions(input.accountId);
      }),

    getOrders: protectedProcedure
      .input(z.object({ accountId: z.string(), status: z.string().optional() }))
      .query(async ({ input }) => {
        return getAccountOrders(input.accountId, input.status as any);
      }),

    getTradeHistory: protectedProcedure
      .input(z.object({ accountId: z.string() }))
      .query(async ({ input }) => {
        return getTradeHistory(input.accountId);
      }),

    cancelOrder: protectedProcedure
      .input(z.object({ orderId: z.string() }))
      .mutation(async ({ input }) => {
        return cancelOrder(input.orderId);
      }),

    getPerformance: protectedProcedure
      .input(z.object({ accountId: z.string() }))
      .query(async ({ input }) => {
        return calculatePerformanceMetrics(input.accountId);
      }),

    resetAccount: protectedProcedure
      .input(z.object({ accountId: z.string() }))
      .mutation(async ({ input }) => {
        return resetPaperAccount(input.accountId);
      }),
  }),

  // Alerts
  alerts: router({
    createPriceAlert: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        assetType: z.enum(['stock', 'crypto']),
        alertType: z.enum(['price_above', 'price_below', 'percent_change', 'volume_spike']),
        targetValue: z.number(),
        message: z.string().optional(),
        notifyEmail: z.boolean().optional(),
        notifyPush: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createPriceAlert(
          String(ctx.user.id),
          input.symbol,
          input.assetType,
          input.alertType,
          input.targetValue,
          {
            message: input.message,
            notifyEmail: input.notifyEmail,
            notifyPush: input.notifyPush,
          }
        );
      }),

    createRegimeAlert: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        toRegime: z.enum(['bull', 'bear', 'sideways', 'volatile']),
        fromRegime: z.enum(['bull', 'bear', 'sideways', 'volatile']).optional(),
        notifyEmail: z.boolean().optional(),
        notifyPush: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createRegimeAlert(
          String(ctx.user.id),
          input.symbol,
          input.toRegime,
          {
            fromRegime: input.fromRegime,
            notifyEmail: input.notifyEmail,
            notifyPush: input.notifyPush,
          }
        );
      }),

    createSentimentAlert: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        alertType: z.enum(['sentiment_bullish', 'sentiment_bearish', 'fear_greed_extreme', 'sentiment_shift']),
        threshold: z.number().optional(),
        notifyEmail: z.boolean().optional(),
        notifyPush: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createSentimentAlert(
          String(ctx.user.id),
          input.symbol,
          input.alertType,
          {
            threshold: input.threshold,
            notifyEmail: input.notifyEmail,
            notifyPush: input.notifyPush,
          }
        );
      }),

    getPriceAlerts: protectedProcedure
      .query(async ({ ctx }) => {
        return getUserPriceAlerts(String(ctx.user.id));
      }),

    getRegimeAlerts: protectedProcedure
      .query(async ({ ctx }) => {
        return getUserRegimeAlerts(String(ctx.user.id));
      }),

    getSentimentAlerts: protectedProcedure
      .query(async ({ ctx }) => {
        return getUserSentimentAlerts(String(ctx.user.id));
      }),

    getHistory: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        return getAlertHistory(String(ctx.user.id), input.limit);
      }),

    togglePriceAlert: protectedProcedure
      .input(z.object({ alertId: z.string(), isActive: z.boolean() }))
      .mutation(async ({ input }) => {
        return togglePriceAlert(input.alertId, input.isActive);
      }),

    toggleRegimeAlert: protectedProcedure
      .input(z.object({ alertId: z.string(), isActive: z.boolean() }))
      .mutation(async ({ input }) => {
        return toggleRegimeAlert(input.alertId, input.isActive);
      }),

    toggleSentimentAlert: protectedProcedure
      .input(z.object({ alertId: z.string(), isActive: z.boolean() }))
      .mutation(async ({ input }) => {
        return toggleSentimentAlert(input.alertId, input.isActive);
      }),

    deletePriceAlert: protectedProcedure
      .input(z.object({ alertId: z.string() }))
      .mutation(async ({ input }) => {
        return deletePriceAlert(input.alertId);
      }),

    deleteRegimeAlert: protectedProcedure
      .input(z.object({ alertId: z.string() }))
      .mutation(async ({ input }) => {
        return deleteRegimeAlert(input.alertId);
      }),

    deleteSentimentAlert: protectedProcedure
      .input(z.object({ alertId: z.string() }))
      .mutation(async ({ input }) => {
        return deleteSentimentAlert(input.alertId);
      }),

    markAsRead: protectedProcedure
      .input(z.object({ alertHistoryId: z.string() }))
      .mutation(async ({ input }) => {
        return markAlertAsRead(input.alertHistoryId);
      }),

    getSummary: protectedProcedure
      .query(async ({ ctx }) => {
        return getAlertSummary(String(ctx.user.id));
      }),
  }),
});

export type AppRouter = typeof appRouter;
