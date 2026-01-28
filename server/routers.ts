import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { runAgentConsensus, getAvailableAgents } from "./services/aiAgents";
import { commandCenterDataService } from "./services/commandcenter/CommandCenterDataService";
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
import {
  fetchOptionsChain,
  getOptionsNearMoney,
  getATMStraddle,
  getAlpacaOptionsStatus,
  EnhancedOptionData
} from "./services/alpacaOptions";
import {
  analyzeLiveOptions,
  getOptionsChainWithGreeks,
  getLiveIVSurface,
  createOptionsAlert,
  getActiveAlerts,
  removeAlert,
  clearOptionsCache,
  getCacheStatus
} from "./services/liveOptionsAnalyzer";
import {
  analyzeLiveVolatilitySurface,
  getIVRank,
  getVolatilitySurfaceSummary
} from "./services/liveVolatilitySurface";
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
import { secEdgarService } from "./services/sec-edgar/SECEdgarService";
import { secFilingRAG } from "./services/sec-edgar/SECFilingRAG";
import { enhancedFundamentalAnalyst } from "./services/stock-intelligence/EnhancedFundamentalAnalyst";
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
import {
  getTopTraders,
  getTraderById,
  startCopyTrading,
  stopCopyTrading,
  getUserCopySettings,
  getCopySettingsById,
  updateCopySettings,
  getUserCopyTrades,
  getCopyPerformance,
  pauseCopyTrading,
  resumeCopyTrading
} from "./services/copyTrading";
import {
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  getJournalEntryById,
  getUserJournalEntries,
  getJournalEntriesByDate,
  getJournalStats,
  getEmotionCorrelations,
  detectTradingPatterns,
  getUserTags,
  searchJournalEntries
} from "./services/tradingJournal";
import {
  getAvailableExchanges,
  getExchangeInfo,
  connectExchange,
  disconnectExchange,
  getUserConnections,
  getConnectionById,
  getExchangeBalances,
  getExchangePositions,
  placeExchangeOrder,
  cancelExchangeOrder,
  getOrderHistory,
  syncExchangeData,
  getOAuthUrl,
  handleOAuthCallback,
  testConnection
} from "./services/exchangeIntegration";
import {
  BrokerType,
  OrderSide,
  OrderType,
  TimeInForce
} from "./services/brokers/types";
import {
  createOAuthState,
  getOAuthState as getBrokerOAuthState,
  deleteOAuthState,
  createBrokerConnection,
  getBrokerConnection,
  getUserBrokerConnections,
  updateBrokerConnection,
  deleteBrokerConnection,
  getDecryptedTokens,
  createBrokerOrder,
  updateBrokerOrder,
  getBrokerOrder,
  getUserBrokerOrders,
  syncBrokerPositions,
  getUserBrokerPositions,
  initializeBrokerAdapter,
  getAvailableBrokers
} from "./services/brokers/BrokerService";
import { AlpacaAdapter } from "./services/brokers/AlpacaAdapter";
import { IBKRAdapter } from "./services/brokers/IBKRAdapter";
import { BROKER_INFO } from "./services/brokers/BrokerFactory";
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

    // Live Options Chain from Alpaca
    liveChain: protectedProcedure
      .input(z.object({
        underlying: z.string(),
        type: z.enum(['call', 'put']).optional(),
        minStrike: z.number().optional(),
        maxStrike: z.number().optional(),
        minDaysToExpiry: z.number().optional(),
        maxDaysToExpiry: z.number().optional(),
        limit: z.number().max(1000).optional(),
      }))
      .query(async ({ input }) => {
        return getOptionsChainWithGreeks(input.underlying, {
          type: input.type,
          minStrike: input.minStrike,
          maxStrike: input.maxStrike,
          minDaysToExpiry: input.minDaysToExpiry,
          maxDaysToExpiry: input.maxDaysToExpiry,
          limit: input.limit,
        });
      }),

    // Live Options Analysis
    liveAnalysis: protectedProcedure
      .input(z.object({
        underlying: z.string(),
        spotPrice: z.number().positive(),
      }))
      .query(async ({ input }) => {
        return analyzeLiveOptions(input.underlying, input.spotPrice);
      }),

    // ATM Straddle Pricing
    atmStraddle: protectedProcedure
      .input(z.object({
        underlying: z.string(),
        spotPrice: z.number().positive(),
        targetDTE: z.number().min(1).max(365).default(30),
      }))
      .query(async ({ input }) => {
        return getATMStraddle(input.underlying, input.spotPrice, input.targetDTE);
      }),

    // IV Surface Analysis
    ivSurface: protectedProcedure
      .input(z.object({
        underlying: z.string(),
        spotPrice: z.number().positive(),
      }))
      .query(async ({ input }) => {
        return getLiveIVSurface(input.underlying, input.spotPrice);
      }),

    // Full Volatility Surface Analysis
    volatilitySurface: protectedProcedure
      .input(z.object({
        underlying: z.string(),
        spotPrice: z.number().positive(),
      }))
      .query(async ({ input }) => {
        return analyzeLiveVolatilitySurface(input.underlying, input.spotPrice);
      }),

    // IV Rank
    ivRank: protectedProcedure
      .input(z.object({
        underlying: z.string(),
        spotPrice: z.number().positive(),
      }))
      .query(async ({ input }) => {
        return getIVRank(input.underlying, input.spotPrice);
      }),

    // Surface Summary
    surfaceSummary: protectedProcedure
      .input(z.object({
        underlying: z.string(),
        spotPrice: z.number().positive(),
      }))
      .query(async ({ input }) => {
        return getVolatilitySurfaceSummary(input.underlying, input.spotPrice);
      }),

    // Options Alerts
    createAlert: protectedProcedure
      .input(z.object({
        underlying: z.string(),
        condition: z.enum(['iv_spike', 'iv_crush', 'unusual_volume', 'gamma_squeeze', 'delta_threshold']),
        threshold: z.number(),
      }))
      .mutation(async ({ input }) => {
        return createOptionsAlert(input.underlying, input.condition, input.threshold);
      }),

    getAlerts: protectedProcedure
      .query(async () => {
        return getActiveAlerts();
      }),

    removeAlert: protectedProcedure
      .input(z.object({ alertId: z.string() }))
      .mutation(async ({ input }) => {
        return removeAlert(input.alertId);
      }),

    // Cache Management
    clearCache: protectedProcedure
      .input(z.object({ underlying: z.string().optional() }))
      .mutation(async ({ input }) => {
        clearOptionsCache(input.underlying);
        return { success: true };
      }),

    cacheStatus: protectedProcedure
      .query(async () => {
        return getCacheStatus();
      }),

    // Alpaca Options Status
    alpacaStatus: protectedProcedure
      .query(async () => {
        return getAlpacaOptionsStatus();
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

  // Copy Trading Router
  copyTrading: router({
    getTopTraders: protectedProcedure
      .input(z.object({
        sortBy: z.enum(['return', 'winRate', 'followers', 'sharpe']).optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return getTopTraders(input?.sortBy, input?.limit);
      }),

    getTrader: protectedProcedure
      .input(z.object({ traderId: z.string() }))
      .query(async ({ input }) => {
        return getTraderById(input.traderId);
      }),

    follow: protectedProcedure
      .input(z.object({
        traderId: z.string(),
        settings: z.object({
          allocationMode: z.enum(['fixed', 'percentage', 'proportional']).default('fixed'),
          allocationAmount: z.number().default(1000),
          maxPositionSize: z.number().optional(),
          maxDailyLoss: z.number().optional(),
          copyStopLoss: z.boolean().optional(),
          copyTakeProfit: z.boolean().optional(),
          excludeSymbols: z.array(z.string()).optional(),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        return startCopyTrading(String(ctx.user.id), input.traderId, input.settings);
      }),

    unfollow: protectedProcedure
      .input(z.object({ copySettingsId: z.string() }))
      .mutation(async ({ input }) => {
        return stopCopyTrading(input.copySettingsId);
      }),

    getFollowed: protectedProcedure
      .query(async ({ ctx }) => {
        return getUserCopySettings(String(ctx.user.id));
      }),

    getSettings: protectedProcedure
      .input(z.object({ copySettingsId: z.string() }))
      .query(async ({ input }) => {
        return getCopySettingsById(input.copySettingsId);
      }),

    updateSettings: protectedProcedure
      .input(z.object({
        copySettingsId: z.string(),
        settings: z.object({
          allocationMode: z.enum(['fixed', 'percentage', 'proportional']).optional(),
          allocationAmount: z.number().optional(),
          maxPositionSize: z.number().optional(),
          maxDailyLoss: z.number().optional(),
          copyStopLoss: z.boolean().optional(),
          copyTakeProfit: z.boolean().optional(),
          excludeSymbols: z.array(z.string()).optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        return updateCopySettings(input.copySettingsId, input.settings);
      }),

    getHistory: protectedProcedure
      .input(z.object({
        limit: z.number().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return getUserCopyTrades(String(ctx.user.id), input?.limit);
      }),

    getStats: protectedProcedure
      .query(async ({ ctx }) => {
        return getCopyPerformance(String(ctx.user.id));
      }),

    pause: protectedProcedure
      .input(z.object({ copySettingsId: z.string() }))
      .mutation(async ({ input }) => {
        return pauseCopyTrading(input.copySettingsId);
      }),

    resume: protectedProcedure
      .input(z.object({ copySettingsId: z.string() }))
      .mutation(async ({ input }) => {
        return resumeCopyTrading(input.copySettingsId);
      }),
  }),

  // Trading Journal Router
  journal: router({
    create: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        side: z.enum(['long', 'short']),
        entryPrice: z.number(),
        exitPrice: z.number().optional(),
        quantity: z.number(),
        entryDate: z.date(),
        exitDate: z.date().optional(),
        setup: z.enum(['breakout', 'pullback', 'reversal', 'trend_following', 'range_bound', 'news_based', 'technical', 'fundamental', 'other']),
        emotionBefore: z.enum(['confident', 'anxious', 'greedy', 'fearful', 'neutral', 'excited', 'frustrated', 'calm']),
        emotionDuring: z.enum(['confident', 'anxious', 'greedy', 'fearful', 'neutral', 'excited', 'frustrated', 'calm']).optional(),
        emotionAfter: z.enum(['confident', 'anxious', 'greedy', 'fearful', 'neutral', 'excited', 'frustrated', 'calm']).optional(),
        confidenceLevel: z.number().min(1).max(10),
        planFollowed: z.boolean(),
        notes: z.string(),
        lessonsLearned: z.string().optional(),
        mistakes: z.array(z.string()).optional(),
        tags: z.array(z.string()),
        screenshots: z.array(z.string()).optional(),
        tradeId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createJournalEntry(String(ctx.user.id), input);
      }),

    update: protectedProcedure
      .input(z.object({
        entryId: z.string(),
        updates: z.object({
          exitPrice: z.number().optional(),
          exitDate: z.date().optional(),
          emotionDuring: z.enum(['confident', 'anxious', 'greedy', 'fearful', 'neutral', 'excited', 'frustrated', 'calm']).optional(),
          emotionAfter: z.enum(['confident', 'anxious', 'greedy', 'fearful', 'neutral', 'excited', 'frustrated', 'calm']).optional(),
          notes: z.string().optional(),
          lessonsLearned: z.string().optional(),
          mistakes: z.array(z.string()).optional(),
          tags: z.array(z.string()).optional(),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        return updateJournalEntry(String(ctx.user.id), input.entryId, input.updates);
      }),

    delete: protectedProcedure
      .input(z.object({ entryId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return deleteJournalEntry(String(ctx.user.id), input.entryId);
      }),

    getById: protectedProcedure
      .input(z.object({ entryId: z.string() }))
      .query(async ({ ctx, input }) => {
        return getJournalEntryById(String(ctx.user.id), input.entryId);
      }),

    list: protectedProcedure
      .input(z.object({
        filters: z.object({
          symbol: z.string().optional(),
          setup: z.enum(['breakout', 'pullback', 'reversal', 'trend_following', 'range_bound', 'news_based', 'technical', 'fundamental', 'other']).optional(),
          emotion: z.enum(['confident', 'anxious', 'greedy', 'fearful', 'neutral', 'excited', 'frustrated', 'calm']).optional(),
          outcome: z.enum(['win', 'loss', 'breakeven', 'open']).optional(),
          tags: z.array(z.string()).optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          minPnL: z.number().optional(),
          maxPnL: z.number().optional(),
        }).optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return getUserJournalEntries(String(ctx.user.id), input?.filters, input?.limit, input?.offset);
      }),

    getByDate: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ ctx, input }) => {
        return getJournalEntriesByDate(String(ctx.user.id), input.year, input.month);
      }),

    getStats: protectedProcedure
      .input(z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const timeframe = input?.startDate && input?.endDate 
          ? { startDate: input.startDate, endDate: input.endDate }
          : undefined;
        return getJournalStats(String(ctx.user.id), timeframe);
      }),

    getEmotionCorrelations: protectedProcedure
      .query(async ({ ctx }) => {
        return getEmotionCorrelations(String(ctx.user.id));
      }),

    getPatterns: protectedProcedure
      .query(async ({ ctx }) => {
        return detectTradingPatterns(String(ctx.user.id));
      }),

    getTags: protectedProcedure
      .query(async ({ ctx }) => {
        return getUserTags(String(ctx.user.id));
      }),

    search: protectedProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ ctx, input }) => {
        return searchJournalEntries(String(ctx.user.id), input.query);
      }),
  }),

  // Exchange Integration Router
  exchange: router({
    getAvailable: publicProcedure
      .query(async () => {
        return getAvailableExchanges();
      }),

    getInfo: publicProcedure
      .input(z.object({ exchange: z.enum(['binance', 'coinbase', 'alpaca', 'interactive_brokers']) }))
      .query(async ({ input }) => {
        return getExchangeInfo(input.exchange);
      }),

    connect: protectedProcedure
      .input(z.object({
        exchange: z.enum(['binance', 'coinbase', 'alpaca', 'interactive_brokers']),
        credentials: z.object({
          apiKey: z.string(),
          apiSecret: z.string(),
          passphrase: z.string().optional(),
          accountId: z.string().optional(),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        return connectExchange(String(ctx.user.id), input.exchange, input.credentials);
      }),

    disconnect: protectedProcedure
      .input(z.object({ connectionId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return disconnectExchange(String(ctx.user.id), input.connectionId);
      }),

    getConnections: protectedProcedure
      .query(async ({ ctx }) => {
        return getUserConnections(String(ctx.user.id));
      }),

    getConnection: protectedProcedure
      .input(z.object({ connectionId: z.string() }))
      .query(async ({ ctx, input }) => {
        return getConnectionById(String(ctx.user.id), input.connectionId);
      }),

    getBalances: protectedProcedure
      .input(z.object({ connectionId: z.string() }))
      .query(async ({ input }) => {
        return getExchangeBalances(input.connectionId);
      }),

    getPositions: protectedProcedure
      .input(z.object({ connectionId: z.string() }))
      .query(async ({ input }) => {
        return getExchangePositions(input.connectionId);
      }),

    placeOrder: protectedProcedure
      .input(z.object({
        connectionId: z.string(),
        order: z.object({
          symbol: z.string(),
          side: z.enum(['buy', 'sell']),
          type: z.enum(['market', 'limit', 'stop', 'stop_limit']),
          quantity: z.number(),
          price: z.number().optional(),
          stopPrice: z.number().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        return placeExchangeOrder(input.connectionId, input.order);
      }),

    cancelOrder: protectedProcedure
      .input(z.object({ connectionId: z.string(), orderId: z.string() }))
      .mutation(async ({ input }) => {
        return cancelExchangeOrder(input.connectionId, input.orderId);
      }),

    getOrderHistory: protectedProcedure
      .input(z.object({ connectionId: z.string(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        return getOrderHistory(input.connectionId, input.limit);
      }),

    sync: protectedProcedure
      .input(z.object({ connectionId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return syncExchangeData(String(ctx.user.id), input.connectionId);
      }),

    getOAuthUrl: protectedProcedure
      .input(z.object({
        exchange: z.enum(['binance', 'coinbase', 'alpaca', 'interactive_brokers']),
        redirectUri: z.string(),
      }))
      .query(async ({ input }) => {
        const state = Math.random().toString(36).substring(7);
        return { url: getOAuthUrl(input.exchange, input.redirectUri, state), state };
      }),

    handleOAuth: protectedProcedure
      .input(z.object({
        exchange: z.enum(['binance', 'coinbase', 'alpaca', 'interactive_brokers']),
        code: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        return handleOAuthCallback(String(ctx.user.id), input.exchange, input.code);
      }),

    testConnection: protectedProcedure
      .input(z.object({ connectionId: z.string() }))
      .query(async ({ input }) => {
        return testConnection(input.connectionId);
      }),
  }),

  // Production Broker Integration Router
  broker: router({
    // Get available brokers
    getAvailableBrokers: publicProcedure
      .query(async () => {
        return getAvailableBrokers();
      }),

    // Get broker info
    getBrokerInfo: publicProcedure
      .input(z.object({
        brokerType: z.enum(['alpaca', 'interactive_brokers'])
      }))
      .query(async ({ input }) => {
        return BROKER_INFO[input.brokerType as BrokerType];
      }),

    // Start OAuth flow for Alpaca
    startAlpacaOAuth: protectedProcedure
      .input(z.object({
        isPaper: z.boolean().default(true),
        redirectUri: z.string()
      }))
      .mutation(async ({ ctx, input }) => {
        const clientId = process.env.ALPACA_CLIENT_ID;
        const clientSecret = process.env.ALPACA_CLIENT_SECRET;
        
        if (!clientId || !clientSecret) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Alpaca API credentials not configured. Please add ALPACA_CLIENT_ID and ALPACA_CLIENT_SECRET.'
          });
        }
        
        const adapter = new AlpacaAdapter({
          clientId,
          clientSecret,
          redirectUri: input.redirectUri,
          isPaper: input.isPaper
        });
        
        // Create OAuth state
        const oauthState = await createOAuthState(
          String(ctx.user.id),
          BrokerType.ALPACA,
          input.isPaper
        );
        
        const authUrl = adapter.getAuthorizationUrl(oauthState.state, input.isPaper);
        
        return {
          authUrl,
          state: oauthState.state
        };
      }),

    // Start OAuth flow for Interactive Brokers (OAuth 2.0)
    startIBKROAuth: protectedProcedure
      .input(z.object({
        isPaper: z.boolean().default(true),
        redirectUri: z.string(),
        authMethod: z.enum(['oauth2', 'oauth1']).default('oauth2')
      }))
      .mutation(async ({ ctx, input }) => {
        // OAuth 2.0 credentials (recommended)
        const clientId = process.env.IBKR_CLIENT_ID;
        const clientSecret = process.env.IBKR_CLIENT_SECRET;
        
        // OAuth 1.0a credentials (legacy)
        const consumerKey = process.env.IBKR_CONSUMER_KEY;
        const privateKey = process.env.IBKR_PRIVATE_KEY;
        const realm = process.env.IBKR_REALM || 'limited_poa';
        
        // Determine auth method based on available credentials
        const useOAuth2 = input.authMethod === 'oauth2' && clientId;
        
        if (useOAuth2) {
          // OAuth 2.0 flow
          const adapter = new IBKRAdapter({
            clientId,
            clientSecret,
            redirectUri: input.redirectUri,
            isPaper: input.isPaper,
            authMethod: 'oauth2'
          });
          
          // Create OAuth state
          const oauthState = await createOAuthState(
            String(ctx.user.id),
            BrokerType.INTERACTIVE_BROKERS,
            input.isPaper
          );
          
          const authUrl = adapter.getAuthorizationUrl(oauthState.state, input.isPaper);
          
          return {
            authUrl,
            state: oauthState.state,
            authMethod: 'oauth2' as const
          };
        } else if (consumerKey && privateKey) {
          // OAuth 1.0a flow (legacy)
          const adapter = new IBKRAdapter({
            consumerKey,
            privateKey,
            realm,
            redirectUri: input.redirectUri,
            isPaper: input.isPaper,
            authMethod: 'oauth1'
          });
          
          // Get request token for OAuth1
          const requestTokenResult = await adapter.getRequestToken();
          
          // Create OAuth state with request token
          const oauthState = await createOAuthState(
            String(ctx.user.id),
            BrokerType.INTERACTIVE_BROKERS,
            input.isPaper,
            undefined,
            requestTokenResult.token,
            requestTokenResult.tokenSecret
          );
          
          const authUrl = adapter.getAuthorizationUrl(oauthState.state, input.isPaper);
          
          return {
            authUrl,
            state: oauthState.state,
            authMethod: 'oauth1' as const
          };
        } else {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Interactive Brokers API credentials not configured. Please add IBKR_CLIENT_ID for OAuth 2.0 or IBKR_CONSUMER_KEY and IBKR_PRIVATE_KEY for OAuth 1.0a.'
          });
        }
      }),

    // Handle OAuth callback for Alpaca
    handleAlpacaCallback: protectedProcedure
      .input(z.object({
        code: z.string(),
        state: z.string()
      }))
      .mutation(async ({ ctx, input }) => {
        const oauthState = await getBrokerOAuthState(input.state);
        
        if (!oauthState || oauthState.userId !== String(ctx.user.id)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid or expired OAuth state'
          });
        }
        
        const clientId = process.env.ALPACA_CLIENT_ID!;
        const clientSecret = process.env.ALPACA_CLIENT_SECRET!;
        const redirectUri = process.env.ALPACA_REDIRECT_URI || `${process.env.VITE_APP_URL || ''}/broker/alpaca/callback`;
        
        const adapter = new AlpacaAdapter({
          clientId,
          clientSecret,
          redirectUri,
          isPaper: oauthState.isPaper
        });
        
        // Exchange code for tokens
        const tokens = await adapter.handleOAuthCallback(input.code, input.state);
        
        // Initialize adapter with tokens
        await adapter.initialize({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken
        });
        
        // Get account info
        const accounts = await adapter.getAccounts();
        const account = accounts[0];
        
        // Create broker connection
        const connection = await createBrokerConnection(
          String(ctx.user.id),
          BrokerType.ALPACA,
          oauthState.isPaper,
          {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : undefined
          },
          {
            accountId: account.id,
            accountNumber: account.accountNumber,
            accountType: account.accountType
          }
        );
        
        // Clean up OAuth state
        await deleteOAuthState(input.state);
        
        return {
          success: true,
          connectionId: connection.id,
          account: {
            id: account.id,
            accountNumber: account.accountNumber,
            accountType: account.accountType,
            isPaper: oauthState.isPaper
          }
        };
      }),

    // Handle OAuth callback for Interactive Brokers (OAuth 2.0)
    handleIBKRCallback: protectedProcedure
      .input(z.object({
        // OAuth 2.0 uses code, OAuth 1.0a uses oauthToken/oauthVerifier
        code: z.string().optional(),
        oauthToken: z.string().optional(),
        oauthVerifier: z.string().optional(),
        state: z.string()
      }))
      .mutation(async ({ ctx, input }) => {
        const oauthState = await getBrokerOAuthState(input.state);
        
        if (!oauthState || oauthState.userId !== String(ctx.user.id)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid or expired OAuth state'
          });
        }
        
        // Determine if this is OAuth 2.0 or OAuth 1.0a based on the callback parameters
        const isOAuth2 = !!input.code;
        
        let tokens;
        let adapter: IBKRAdapter;
        
        if (isOAuth2) {
          // OAuth 2.0 flow
          const clientId = process.env.IBKR_CLIENT_ID!;
          const clientSecret = process.env.IBKR_CLIENT_SECRET;
          const privateKey = process.env.IBKR_PRIVATE_KEY;
          const redirectUri = process.env.IBKR_REDIRECT_URI || `${process.env.VITE_APP_URL || ''}/broker/ibkr/callback`;
          
          adapter = new IBKRAdapter({
            clientId,
            clientSecret,
            privateKey,
            redirectUri,
            isPaper: oauthState.isPaper,
            authMethod: 'oauth2'
          });
          
          // Exchange code for tokens
          tokens = await adapter.handleOAuthCallback(input.code!, input.state);
        } else {
          // OAuth 1.0a flow (legacy)
          if (!oauthState.requestToken || !oauthState.requestTokenSecret) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Missing request token for OAuth1 flow'
            });
          }
          
          if (!input.oauthVerifier) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Missing OAuth verifier for OAuth1 flow'
            });
          }
          
          const consumerKey = process.env.IBKR_CONSUMER_KEY!;
          const privateKey = process.env.IBKR_PRIVATE_KEY!;
          const realm = process.env.IBKR_REALM || 'limited_poa';
          const redirectUri = process.env.IBKR_REDIRECT_URI || `${process.env.VITE_APP_URL || ''}/broker/ibkr/callback`;
          
          adapter = new IBKRAdapter({
            consumerKey,
            privateKey,
            realm,
            redirectUri,
            isPaper: oauthState.isPaper,
            authMethod: 'oauth1'
          });
          
          // Exchange verifier for access token
          tokens = await adapter.handleOAuthCallback(
            input.oauthVerifier,
            oauthState.requestToken!,
            input.oauthVerifier
          );
        }
        
        // Initialize adapter with tokens
        await adapter.initialize({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken
        });
        
        // Get account info
        const accounts = await adapter.getAccounts();
        const account = accounts[0];
        
        // Create broker connection
        const connection = await createBrokerConnection(
          String(ctx.user.id),
          BrokerType.INTERACTIVE_BROKERS,
          oauthState.isPaper,
          {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
          },
          {
            accountId: account.id,
            accountNumber: account.accountNumber,
            accountType: account.accountType
          }
        );
        
        // Clean up OAuth state
        await deleteOAuthState(input.state);
        
        return {
          success: true,
          connectionId: connection.id,
          account: {
            id: account.id,
            accountNumber: account.accountNumber,
            accountType: account.accountType,
            isPaper: oauthState.isPaper
          }
        };
      }),

    // Get user's broker connections
    getConnections: protectedProcedure
      .query(async ({ ctx }) => {
        const connections = await getUserBrokerConnections(String(ctx.user.id));
        return connections.map(conn => ({
          id: conn.id,
          brokerType: conn.brokerType,
          isPaper: conn.isPaper,
          isActive: conn.isActive,
          accountId: conn.accountId,
          accountNumber: conn.accountNumber,
          accountType: conn.accountType,
          lastConnectedAt: conn.lastConnectedAt,
          lastSyncAt: conn.lastSyncAt,
          connectionError: conn.connectionError,
          createdAt: conn.createdAt
        }));
      }),

    // Disconnect a broker
    disconnect: protectedProcedure
      .input(z.object({ connectionId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const connection = await getBrokerConnection(input.connectionId);
        
        if (!connection || connection.userId !== String(ctx.user.id)) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Connection not found'
          });
        }
        
        await deleteBrokerConnection(input.connectionId);
        
        return { success: true };
      }),

    // Get account balance
    getBalance: protectedProcedure
      .input(z.object({ connectionId: z.string() }))
      .query(async ({ ctx, input }) => {
        const connection = await getBrokerConnection(input.connectionId);
        
        if (!connection || connection.userId !== String(ctx.user.id)) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Connection not found'
          });
        }
        
        const config = {
          alpaca: process.env.ALPACA_CLIENT_ID ? {
            clientId: process.env.ALPACA_CLIENT_ID,
            clientSecret: process.env.ALPACA_CLIENT_SECRET!,
            redirectUri: process.env.ALPACA_REDIRECT_URI || ''
          } : undefined,
          ibkr: process.env.IBKR_CONSUMER_KEY ? {
            consumerKey: process.env.IBKR_CONSUMER_KEY,
            privateKey: process.env.IBKR_PRIVATE_KEY!,
            realm: process.env.IBKR_REALM || 'limited_poa',
            redirectUri: process.env.IBKR_REDIRECT_URI || ''
          } : undefined
        };
        
        const adapter = await initializeBrokerAdapter(connection, config);
        const balance = await adapter.getAccountBalance();
        
        // Update last sync time
        await updateBrokerConnection(input.connectionId, { lastSyncAt: new Date() });
        
        return balance;
      }),

    // Get positions
    getPositions: protectedProcedure
      .input(z.object({ connectionId: z.string() }))
      .query(async ({ ctx, input }) => {
        const connection = await getBrokerConnection(input.connectionId);
        
        if (!connection || connection.userId !== String(ctx.user.id)) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Connection not found'
          });
        }
        
        const config = {
          alpaca: process.env.ALPACA_CLIENT_ID ? {
            clientId: process.env.ALPACA_CLIENT_ID,
            clientSecret: process.env.ALPACA_CLIENT_SECRET!,
            redirectUri: process.env.ALPACA_REDIRECT_URI || ''
          } : undefined,
          ibkr: process.env.IBKR_CONSUMER_KEY ? {
            consumerKey: process.env.IBKR_CONSUMER_KEY,
            privateKey: process.env.IBKR_PRIVATE_KEY!,
            realm: process.env.IBKR_REALM || 'limited_poa',
            redirectUri: process.env.IBKR_REDIRECT_URI || ''
          } : undefined
        };
        
        const adapter = await initializeBrokerAdapter(connection, config);
        const positions = await adapter.getPositions();
        
        // Sync positions to database
        await syncBrokerPositions(
          input.connectionId,
          String(ctx.user.id),
          positions.map(pos => ({
            symbol: pos.symbol,
            quantity: pos.quantity,
            side: pos.side as 'long' | 'short',
            avgEntryPrice: pos.avgEntryPrice,
            marketValue: pos.marketValue,
            costBasis: pos.costBasis,
            unrealizedPL: pos.unrealizedPL,
            unrealizedPLPercent: pos.unrealizedPLPercent,
            currentPrice: pos.currentPrice
          }))
        );
        
        return positions;
      }),

    // Place order
    placeOrder: protectedProcedure
      .input(z.object({
        connectionId: z.string(),
        symbol: z.string(),
        side: z.enum(['buy', 'sell']),
        orderType: z.enum(['market', 'limit', 'stop', 'stop_limit', 'trailing_stop']),
        quantity: z.number().positive(),
        price: z.number().optional(),
        stopPrice: z.number().optional(),
        trailPercent: z.number().optional(),
        timeInForce: z.enum(['day', 'gtc', 'ioc', 'fok']).default('day'),
        extendedHours: z.boolean().default(false)
      }))
      .mutation(async ({ ctx, input }) => {
        const connection = await getBrokerConnection(input.connectionId);
        
        if (!connection || connection.userId !== String(ctx.user.id)) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Connection not found'
          });
        }
        
        const config = {
          alpaca: process.env.ALPACA_CLIENT_ID ? {
            clientId: process.env.ALPACA_CLIENT_ID,
            clientSecret: process.env.ALPACA_CLIENT_SECRET!,
            redirectUri: process.env.ALPACA_REDIRECT_URI || ''
          } : undefined,
          ibkr: process.env.IBKR_CONSUMER_KEY ? {
            consumerKey: process.env.IBKR_CONSUMER_KEY,
            privateKey: process.env.IBKR_PRIVATE_KEY!,
            realm: process.env.IBKR_REALM || 'limited_poa',
            redirectUri: process.env.IBKR_REDIRECT_URI || ''
          } : undefined
        };
        
        const adapter = await initializeBrokerAdapter(connection, config);
        
        // Create order in database first
        const dbOrder = await createBrokerOrder(
          input.connectionId,
          String(ctx.user.id),
          {
            symbol: input.symbol,
            side: input.side === 'buy' ? OrderSide.BUY : OrderSide.SELL,
            orderType: input.orderType.toUpperCase() as OrderType,
            timeInForce: input.timeInForce.toUpperCase() as TimeInForce,
            quantity: input.quantity,
            price: input.price,
            stopPrice: input.stopPrice,
            trailPercent: input.trailPercent,
            extendedHours: input.extendedHours
          }
        );
        
        try {
          // Place order with broker
          const orderResponse = await adapter.placeOrder({
            symbol: input.symbol,
            side: input.side === 'buy' ? OrderSide.BUY : OrderSide.SELL,
            type: input.orderType.toUpperCase() as OrderType,
            timeInForce: input.timeInForce.toUpperCase() as TimeInForce,
            quantity: input.quantity,
            price: input.price,
            stopPrice: input.stopPrice,
            trailPercent: input.trailPercent,
            extendedHours: input.extendedHours,
            clientOrderId: dbOrder.clientOrderId || undefined
          });
          
          // Update order with broker response
          await updateBrokerOrder(dbOrder.id, {
            brokerOrderId: orderResponse.id,
            status: orderResponse.status
          });
          
          return {
            success: true,
            orderId: dbOrder.id,
            brokerOrderId: orderResponse.id,
            status: orderResponse.status
          };
        } catch (error) {
          // Update order as rejected
          await updateBrokerOrder(dbOrder.id, {
            status: 'rejected' as any
          });
          
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Failed to place order'
          });
        }
      }),

    // Cancel order
    cancelOrder: protectedProcedure
      .input(z.object({
        connectionId: z.string(),
        orderId: z.string()
      }))
      .mutation(async ({ ctx, input }) => {
        const connection = await getBrokerConnection(input.connectionId);
        
        if (!connection || connection.userId !== String(ctx.user.id)) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Connection not found'
          });
        }
        
        const order = await getBrokerOrder(input.orderId);
        
        if (!order || order.userId !== String(ctx.user.id)) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Order not found'
          });
        }
        
        const config = {
          alpaca: process.env.ALPACA_CLIENT_ID ? {
            clientId: process.env.ALPACA_CLIENT_ID,
            clientSecret: process.env.ALPACA_CLIENT_SECRET!,
            redirectUri: process.env.ALPACA_REDIRECT_URI || ''
          } : undefined,
          ibkr: process.env.IBKR_CONSUMER_KEY ? {
            consumerKey: process.env.IBKR_CONSUMER_KEY,
            privateKey: process.env.IBKR_PRIVATE_KEY!,
            realm: process.env.IBKR_REALM || 'limited_poa',
            redirectUri: process.env.IBKR_REDIRECT_URI || ''
          } : undefined
        };
        
        const adapter = await initializeBrokerAdapter(connection, config);
        
        await adapter.cancelOrder(order.brokerOrderId || input.orderId);
        
        await updateBrokerOrder(input.orderId, {
          status: 'cancelled' as any,
          cancelledAt: new Date()
        });
        
        return { success: true };
      }),

    // Get orders
    getOrders: protectedProcedure
      .input(z.object({
        connectionId: z.string().optional(),
        limit: z.number().default(50)
      }))
      .query(async ({ ctx, input }) => {
        return getUserBrokerOrders(String(ctx.user.id), input.connectionId, input.limit);
      }),

    // Get cached positions from database
    getCachedPositions: protectedProcedure
      .input(z.object({ connectionId: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        return getUserBrokerPositions(String(ctx.user.id), input.connectionId);
      }),

    // Test broker connection
    testBrokerConnection: protectedProcedure
      .input(z.object({ connectionId: z.string() }))
      .query(async ({ ctx, input }) => {
        const connection = await getBrokerConnection(input.connectionId);
        
        if (!connection || connection.userId !== String(ctx.user.id)) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Connection not found'
          });
        }
        
        const config = {
          alpaca: process.env.ALPACA_CLIENT_ID ? {
            clientId: process.env.ALPACA_CLIENT_ID,
            clientSecret: process.env.ALPACA_CLIENT_SECRET!,
            redirectUri: process.env.ALPACA_REDIRECT_URI || ''
          } : undefined,
          ibkr: process.env.IBKR_CONSUMER_KEY ? {
            consumerKey: process.env.IBKR_CONSUMER_KEY,
            privateKey: process.env.IBKR_PRIVATE_KEY!,
            realm: process.env.IBKR_REALM || 'limited_poa',
            redirectUri: process.env.IBKR_REDIRECT_URI || ''
          } : undefined
        };
        
        try {
          const adapter = await initializeBrokerAdapter(connection, config);
          const isConnected = await adapter.testConnection();
          
          if (isConnected) {
          await updateBrokerConnection(input.connectionId, {
            connectionError: null
          });
          }
          
          return { connected: isConnected };
        } catch (error) {
          await updateBrokerConnection(input.connectionId, {
            connectionError: error instanceof Error ? error.message : 'Connection test failed'
          });
          
          return { connected: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      }),

    // Verify broker credentials (for wizard)
    verifyCredentials: protectedProcedure
      .input(z.object({
        brokerType: z.enum(['alpaca', 'interactive_brokers', 'binance', 'coinbase', 'schwab']),
        apiKey: z.string(),
        apiSecret: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Validate credentials format
        const formatValidation: Record<string, { key: RegExp; secret: RegExp }> = {
          alpaca: { key: /^[A-Z0-9]{20}$/, secret: /^[A-Za-z0-9]{40}$/ },
          interactive_brokers: { key: /^[A-Za-z0-9_-]{10,50}$/, secret: /^[A-Za-z0-9_-]{20,100}$/ },
          binance: { key: /^[A-Za-z0-9]{64}$/, secret: /^[A-Za-z0-9]{64}$/ },
          coinbase: { key: /^[a-z0-9-]{36}$/, secret: /^[A-Za-z0-9+/=]{88}$/ },
          schwab: { key: /^[A-Za-z0-9_-]{10,50}$/, secret: /^[A-Za-z0-9_-]{20,100}$/ },
        };
        
        const validation = formatValidation[input.brokerType];
        if (validation) {
          if (!validation.key.test(input.apiKey)) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Invalid API key format'
            });
          }
          if (!validation.secret.test(input.apiSecret)) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Invalid API secret format'
            });
          }
        }
        
        // For demo purposes, simulate verification
        // In production, this would actually test the credentials with the broker API
        const brokerNames: Record<string, string> = {
          alpaca: 'Alpaca',
          interactive_brokers: 'IB',
          binance: 'Binance',
          coinbase: 'Coinbase',
          schwab: 'Schwab'
        };
        const mockAccountInfo = {
          accountId: `${input.brokerType.toUpperCase()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          accountName: `${brokerNames[input.brokerType] || input.brokerType} Account`,
          balance: input.brokerType === 'alpaca' || input.brokerType === 'interactive_brokers' || input.brokerType === 'schwab' ? 100000 : 10000,
          currency: input.brokerType === 'binance' || input.brokerType === 'coinbase' ? 'USDT' : 'USD',
          isPaper: input.brokerType === 'alpaca' || input.brokerType === 'interactive_brokers',
        };
        
        return {
          success: true,
          accountInfo: mockAccountInfo,
        };
      }),

    // Connect broker with API credentials (for wizard)
    connect: protectedProcedure
      .input(z.object({
        brokerType: z.enum(['alpaca', 'interactive_brokers', 'binance', 'coinbase', 'schwab']),
        apiKey: z.string(),
        apiSecret: z.string(),
        accountName: z.string(),
        isPaper: z.boolean().default(true),
        enableAutoSync: z.boolean().default(true),
        syncIntervalMinutes: z.number().min(1).max(60).default(5),
      }))
      .mutation(async ({ ctx, input }) => {
        // Create broker connection record
        const connectionId = `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // In production, this would:
        // 1. Encrypt and store the API credentials
        // 2. Create a broker connection record in the database
        // 3. Set up auto-sync if enabled
        
        // Create broker connection with correct function signature
        const brokerTypeMap: Record<string, BrokerType> = {
          alpaca: BrokerType.ALPACA,
          interactive_brokers: BrokerType.INTERACTIVE_BROKERS,
          binance: BrokerType.BINANCE,
          coinbase: BrokerType.COINBASE,
          schwab: BrokerType.SCHWAB,
        };
        const brokerTypeEnum = brokerTypeMap[input.brokerType] || BrokerType.ALPACA;
        
        const connection = await createBrokerConnection(
          String(ctx.user.id),
          brokerTypeEnum,
          input.isPaper,
          {
            accessToken: input.apiKey,
            refreshToken: input.apiSecret,
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          },
          {
            accountId: `${input.brokerType.toUpperCase()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            accountNumber: `ACC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            accountType: input.isPaper ? 'paper' : 'live',
          }
        );
        
        return {
          success: true,
          connectionId: connection.id,
          accountId: connection.accountId,
        };
      }),

    // Sync positions for a connection
    syncPositions: protectedProcedure
      .input(z.object({ connectionId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const connection = await getBrokerConnection(input.connectionId);
        
        if (!connection || connection.userId !== String(ctx.user.id)) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Connection not found'
          });
        }
        
        const { syncConnectionPositions } = await import('./services/positionSync');
        const result = await syncConnectionPositions(input.connectionId);
        
        return result;
      }),

    // Sync all positions for user
    syncAllPositions: protectedProcedure
      .mutation(async ({ ctx }) => {
        const { syncUserPositions } = await import('./services/positionSync');
        const result = await syncUserPositions(String(ctx.user.id));
        
        return result;
      }),

    // Get sync status for all connections
    getSyncStatus: protectedProcedure
      .query(async ({ ctx }) => {
        const { getUserSyncStatus } = await import('./services/positionSync');
        const status = await getUserSyncStatus(String(ctx.user.id));
        
        return status;
      }),

    // Get aggregated positions across all brokers
    getAggregatedPositions: protectedProcedure
      .query(async ({ ctx }) => {
        const { getAggregatedPositions } = await import('./services/positionSync');
        const result = await getAggregatedPositions(String(ctx.user.id));
        
        return result;
      }),

    // Start auto-sync for a connection
    startAutoSync: protectedProcedure
      .input(z.object({
        connectionId: z.string(),
        intervalMinutes: z.number().min(1).max(60).default(5)
      }))
      .mutation(async ({ ctx, input }) => {
        const connection = await getBrokerConnection(input.connectionId);
        
        if (!connection || connection.userId !== String(ctx.user.id)) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Connection not found'
          });
        }
        
        const { startAutoSync } = await import('./services/positionSync');
        startAutoSync(input.connectionId, input.intervalMinutes);
        
        return { success: true };
      }),

    // Stop auto-sync for a connection
    stopAutoSync: protectedProcedure
      .input(z.object({ connectionId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const connection = await getBrokerConnection(input.connectionId);
        
        if (!connection || connection.userId !== String(ctx.user.id)) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Connection not found'
          });
        }
        
        const { stopAutoSync } = await import('./services/positionSync');
        stopAutoSync(input.connectionId);
        
        return { success: true };
      }),

    // ==================== ORDER HISTORY ====================
    
    // Get order execution history
    getOrderHistory: protectedProcedure
      .input(z.object({
        connectionId: z.string().optional(),
        symbol: z.string().optional(),
        side: z.enum(['buy', 'sell']).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        isClosingTrade: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ ctx, input }) => {
        const { getOrderHistory } = await import('./services/orderHistory');
        return getOrderHistory({
          userId: String(ctx.user.id),
          connectionId: input.connectionId,
          symbol: input.symbol,
          side: input.side,
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
          isClosingTrade: input.isClosingTrade,
          limit: input.limit,
          offset: input.offset,
        });
      }),

    // Get P&L summary
    getPnLSummary: protectedProcedure
      .input(z.object({
        connectionId: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const { getPnLSummary } = await import('./services/orderHistory');
        return getPnLSummary(
          String(ctx.user.id),
          input.connectionId,
          input.startDate ? new Date(input.startDate) : undefined,
          input.endDate ? new Date(input.endDate) : undefined
        );
      }),

    // Get symbol P&L breakdown
    getSymbolPnLBreakdown: protectedProcedure
      .input(z.object({
        connectionId: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const { getSymbolPnLBreakdown } = await import('./services/orderHistory');
        return getSymbolPnLBreakdown(
          String(ctx.user.id),
          input.connectionId,
          input.startDate ? new Date(input.startDate) : undefined,
          input.endDate ? new Date(input.endDate) : undefined
        );
      }),

    // Get daily P&L for charting
    getDailyPnL: protectedProcedure
      .input(z.object({
        connectionId: z.string().optional(),
        days: z.number().min(1).max(365).default(30),
      }))
      .query(async ({ ctx, input }) => {
        const { getDailyPnL } = await import('./services/orderHistory');
        return getDailyPnL(String(ctx.user.id), input.connectionId, input.days);
      }),

    // ==================== BROKER ANALYTICS ====================
    
    // Record account snapshot
    recordSnapshot: protectedProcedure
      .input(z.object({
        connectionId: z.string(),
        equity: z.number(),
        cash: z.number(),
        buyingPower: z.number(),
        portfolioValue: z.number(),
        marginUsed: z.number().optional(),
        marginAvailable: z.number().optional(),
        dayPL: z.number().optional(),
        totalPL: z.number().optional(),
        positionsCount: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const connection = await getBrokerConnection(input.connectionId);
        if (!connection || connection.userId !== String(ctx.user.id)) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Connection not found' });
        }
        
        const { recordAccountSnapshot } = await import('./services/brokerAnalytics');
        return recordAccountSnapshot({
          ...input,
          userId: String(ctx.user.id),
        });
      }),

    // Get account snapshots
    getAccountSnapshots: protectedProcedure
      .input(z.object({
        connectionId: z.string(),
        days: z.number().min(1).max(365).default(30),
      }))
      .query(async ({ ctx, input }) => {
        const { getAccountSnapshots } = await import('./services/brokerAnalytics');
        return getAccountSnapshots(input.connectionId, String(ctx.user.id), input.days);
      }),

    // Get latest snapshot
    getLatestSnapshot: protectedProcedure
      .input(z.object({ connectionId: z.string() }))
      .query(async ({ ctx, input }) => {
        const { getLatestSnapshot } = await import('./services/brokerAnalytics');
        return getLatestSnapshot(input.connectionId, String(ctx.user.id));
      }),

    // Calculate performance metrics
    calculateMetrics: protectedProcedure
      .input(z.object({
        connectionId: z.string(),
        periodType: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'all_time']),
      }))
      .mutation(async ({ ctx, input }) => {
        const connection = await getBrokerConnection(input.connectionId);
        if (!connection || connection.userId !== String(ctx.user.id)) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Connection not found' });
        }
        
        const { calculatePerformanceMetrics } = await import('./services/brokerAnalytics');
        return calculatePerformanceMetrics(input.connectionId, String(ctx.user.id), input.periodType);
      }),

    // Get performance metrics
    getPerformanceMetrics: protectedProcedure
      .input(z.object({
        connectionId: z.string(),
        periodType: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'all_time']).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const { getPerformanceMetrics } = await import('./services/brokerAnalytics');
        return getPerformanceMetrics(input.connectionId, String(ctx.user.id), input.periodType);
      }),

    // Get aggregated analytics
    getAggregatedAnalytics: protectedProcedure
      .query(async ({ ctx }) => {
        const { getAggregatedAnalytics } = await import('./services/brokerAnalytics');
        return getAggregatedAnalytics(String(ctx.user.id));
      }),

    // Get buying power history
    getBuyingPowerHistory: protectedProcedure
      .input(z.object({
        connectionId: z.string(),
        days: z.number().min(1).max(365).default(30),
      }))
      .query(async ({ ctx, input }) => {
        const { getBuyingPowerHistory } = await import('./services/brokerAnalytics');
        return getBuyingPowerHistory(input.connectionId, String(ctx.user.id), input.days);
      }),

    // Get trade frequency analysis
    getTradeFrequency: protectedProcedure
      .input(z.object({
        connectionId: z.string(),
        days: z.number().min(1).max(365).default(30),
      }))
      .query(async ({ ctx, input }) => {
        const { getTradeFrequency } = await import('./services/brokerAnalytics');
        return getTradeFrequency(input.connectionId, String(ctx.user.id), input.days);
      }),

    // ==================== PORTFOLIO REBALANCING ====================
    
    // Create allocation
    createAllocation: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        targetAllocations: z.array(z.object({
          symbol: z.string(),
          targetPercent: z.number().min(0).max(100),
        })),
        rebalanceThreshold: z.number().min(1).max(50).default(5),
        rebalanceFrequency: z.enum(['manual', 'daily', 'weekly', 'monthly', 'quarterly']).default('manual'),
        preferredBrokers: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createAllocation } = await import('./services/portfolioRebalancing');
        return createAllocation({
          userId: String(ctx.user.id),
          ...input,
        });
      }),

    // Update allocation
    updateAllocation: protectedProcedure
      .input(z.object({
        allocationId: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        targetAllocations: z.array(z.object({
          symbol: z.string(),
          targetPercent: z.number().min(0).max(100),
        })).optional(),
        rebalanceThreshold: z.number().min(1).max(50).optional(),
        rebalanceFrequency: z.enum(['manual', 'daily', 'weekly', 'monthly', 'quarterly']).optional(),
        preferredBrokers: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { updateAllocation } = await import('./services/portfolioRebalancing');
        const { allocationId, ...updates } = input;
        return updateAllocation(allocationId, String(ctx.user.id), updates);
      }),

    // Get allocation
    getAllocation: protectedProcedure
      .input(z.object({ allocationId: z.string() }))
      .query(async ({ ctx, input }) => {
        const { getAllocation } = await import('./services/portfolioRebalancing');
        return getAllocation(input.allocationId, String(ctx.user.id));
      }),

    // Get user allocations
    getUserAllocations: protectedProcedure
      .query(async ({ ctx }) => {
        const { getUserAllocations } = await import('./services/portfolioRebalancing');
        return getUserAllocations(String(ctx.user.id));
      }),

    // Delete allocation
    deleteAllocation: protectedProcedure
      .input(z.object({ allocationId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { deleteAllocation } = await import('./services/portfolioRebalancing');
        await deleteAllocation(input.allocationId, String(ctx.user.id));
        return { success: true };
      }),

    // Calculate rebalancing suggestions
    getRebalanceSuggestions: protectedProcedure
      .input(z.object({ allocationId: z.string() }))
      .query(async ({ ctx, input }) => {
        const { calculateRebalanceSuggestions } = await import('./services/portfolioRebalancing');
        return calculateRebalanceSuggestions(input.allocationId, String(ctx.user.id));
      }),

    // Execute rebalancing
    executeRebalancing: protectedProcedure
      .input(z.object({
        allocationId: z.string(),
        tradesToExecute: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { executeRebalancing } = await import('./services/portfolioRebalancing');
        return executeRebalancing(input.allocationId, String(ctx.user.id), input.tradesToExecute);
      }),

    // Get rebalancing history
    getRebalancingHistory: protectedProcedure
      .input(z.object({
        allocationId: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
      }))
      .query(async ({ ctx, input }) => {
        const { getRebalancingHistory } = await import('./services/portfolioRebalancing');
        return getRebalancingHistory(String(ctx.user.id), input.allocationId, input.limit);
      }),

    // ==================== TRADE SIMULATOR ====================
    
    // Simulate trades and get impact analysis
    simulateTrades: protectedProcedure
      .input(z.object({
        trades: z.array(z.object({
          symbol: z.string(),
          side: z.enum(['buy', 'sell']),
          quantity: z.number().positive(),
          estimatedPrice: z.number().positive(),
          brokerType: z.string().optional(),
        })),
        scenarioName: z.string().default('Default Scenario'),
        currentPositions: z.array(z.object({
          symbol: z.string(),
          quantity: z.number(),
          avgCost: z.number(),
          currentPrice: z.number(),
          marketValue: z.number(),
          unrealizedPL: z.number(),
          unrealizedPLPercent: z.number(),
          weight: z.number(),
        })).optional(),
        currentCash: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { simulateTrades } = await import('./services/tradeSimulator');
        return simulateTrades(
          String(ctx.user.id),
          input.trades,
          input.scenarioName,
          input.currentPositions,
          input.currentCash
        );
      }),

    // Compare multiple scenarios
    compareScenarios: protectedProcedure
      .input(z.object({
        scenarios: z.array(z.object({
          name: z.string(),
          trades: z.array(z.object({
            symbol: z.string(),
            side: z.enum(['buy', 'sell']),
            quantity: z.number().positive(),
            estimatedPrice: z.number().positive(),
            brokerType: z.string().optional(),
          })),
        })),
        currentPositions: z.array(z.object({
          symbol: z.string(),
          quantity: z.number(),
          avgCost: z.number(),
          currentPrice: z.number(),
          marketValue: z.number(),
          unrealizedPL: z.number(),
          unrealizedPLPercent: z.number(),
          weight: z.number(),
        })).optional(),
        currentCash: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { compareScenarios } = await import('./services/tradeSimulator');
        return compareScenarios(
          String(ctx.user.id),
          input.scenarios,
          input.currentPositions,
          input.currentCash
        );
      }),

    // Generate optimized trades for target allocation
    generateOptimizedTrades: protectedProcedure
      .input(z.object({
        targetAllocations: z.array(z.object({
          symbol: z.string(),
          targetPercent: z.number().min(0).max(100),
        })),
        currentPositions: z.array(z.object({
          symbol: z.string(),
          quantity: z.number(),
          avgCost: z.number(),
          currentPrice: z.number(),
          marketValue: z.number(),
          unrealizedPL: z.number(),
          unrealizedPLPercent: z.number(),
          weight: z.number(),
        })),
        currentCash: z.number(),
        constraints: z.object({
          maxTradesPerSymbol: z.number().optional(),
          minTradeValue: z.number().optional(),
          maxConcentration: z.number().optional(),
          preserveCash: z.number().optional(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { generateOptimizedTrades } = await import('./services/tradeSimulator');
        return generateOptimizedTrades(
          String(ctx.user.id),
          input.targetAllocations,
          input.currentPositions,
          input.currentCash,
          input.constraints
        );
      }),

    // Get sample positions for demo
    getSamplePositions: publicProcedure
      .query(async () => {
        const { getSamplePositions } = await import('./services/tradeSimulator');
        return {
          positions: getSamplePositions(),
          cash: 15000,
        };
      }),

    // Get all simulation templates
    getTemplates: publicProcedure
      .query(async () => {
        const { getAllTemplates } = await import('./services/simulationTemplates');
        return getAllTemplates();
      }),

    // Get template by ID
    getTemplateById: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        const { getTemplateById } = await import('./services/simulationTemplates');
        return getTemplateById(input.id);
      }),

    // Get templates by category
    getTemplatesByCategory: publicProcedure
      .input(z.object({ 
        category: z.enum(['sector_rotation', 'dividend_growth', 'momentum', 'value', 'defensive', 'growth', 'balanced', 'custom'])
      }))
      .query(async ({ input }) => {
        const { getTemplatesByCategory } = await import('./services/simulationTemplates');
        return getTemplatesByCategory(input.category);
      }),

    // Search templates
    searchTemplates: publicProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input }) => {
        const { searchTemplates } = await import('./services/simulationTemplates');
        return searchTemplates(input.query);
      }),

    // Generate trades from template
    generateTradesFromTemplate: protectedProcedure
      .input(z.object({
        templateId: z.string(),
        portfolioValue: z.number().positive(),
        currentPositions: z.array(z.object({
          symbol: z.string(),
          quantity: z.number(),
          currentPrice: z.number(),
        })),
        currentCash: z.number(),
      }))
      .mutation(async ({ input }) => {
        const { getTemplateById, generateTradesFromTemplate } = await import('./services/simulationTemplates');
        const template = getTemplateById(input.templateId);
        if (!template) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Template not found' });
        }
        return generateTradesFromTemplate(
          template,
          input.portfolioValue,
          input.currentPositions,
          input.currentCash
        );
      }),

    // Execute trades through broker
    executeTrades: protectedProcedure
      .input(z.object({
        connectionId: z.string(),
        trades: z.array(z.object({
          symbol: z.string(),
          side: z.enum(['buy', 'sell']),
          quantity: z.number().positive(),
          estimatedPrice: z.number().positive(),
          orderType: z.enum(['market', 'limit', 'stop', 'stop_limit']).optional(),
          limitPrice: z.number().optional(),
          stopPrice: z.number().optional(),
          timeInForce: z.enum(['day', 'gtc', 'ioc', 'fok']).optional(),
        })),
        simulationId: z.string().optional(),
        dryRun: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { executeTrades } = await import('./services/tradeExecution');
        return executeTrades({
          userId: String(ctx.user.id),
          connectionId: input.connectionId,
          trades: input.trades,
          simulationId: input.simulationId,
          dryRun: input.dryRun,
        });
      }),

    // Validate trades before execution
    validateTrades: protectedProcedure
      .input(z.object({
        trades: z.array(z.object({
          symbol: z.string(),
          side: z.enum(['buy', 'sell']),
          quantity: z.number(),
          estimatedPrice: z.number(),
          orderType: z.enum(['market', 'limit', 'stop', 'stop_limit']).optional(),
          limitPrice: z.number().optional(),
          stopPrice: z.number().optional(),
        })),
      }))
      .query(async ({ input }) => {
        const { validateTrades } = await import('./services/tradeExecution');
        return validateTrades(input.trades);
      }),

    // Get execution history
    getExecutionHistory: protectedProcedure
      .input(z.object({
        connectionId: z.string().optional(),
        symbol: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const { getExecutionHistory } = await import('./services/tradeExecution');
        return getExecutionHistory(String(ctx.user.id), input || {});
      }),

    // === Scenario Sharing Routes ===
    
    // Share a scenario with the community
    shareScenario: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        trades: z.array(z.object({
          symbol: z.string(),
          side: z.enum(['buy', 'sell']),
          quantity: z.number(),
          estimatedPrice: z.number(),
        })),
        positions: z.array(z.object({
          symbol: z.string(),
          quantity: z.number(),
          avgCost: z.number(),
          currentPrice: z.number(),
        })).optional(),
        cash: z.number().optional(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        isPublic: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { shareScenario } = await import('./services/scenarioSharing');
        return shareScenario(ctx.user.id, input);
      }),

    // Get community scenarios
    getCommunityScenarios: publicProcedure
      .input(z.object({
        category: z.string().optional(),
        search: z.string().optional(),
        sortBy: z.enum(['likes', 'imports', 'recent']).optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        const { getCommunityScenarios } = await import('./services/scenarioSharing');
        return getCommunityScenarios(input || {});
      }),

    // Get scenario by ID
    getScenarioById: publicProcedure
      .input(z.object({ scenarioId: z.number() }))
      .query(async ({ input }) => {
        const { getScenarioById } = await import('./services/scenarioSharing');
        return getScenarioById(input.scenarioId);
      }),

    // Like a scenario
    likeScenario: protectedProcedure
      .input(z.object({ scenarioId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { likeScenario } = await import('./services/scenarioSharing');
        return likeScenario(input.scenarioId, ctx.user.id);
      }),

    // Import a scenario
    importScenario: protectedProcedure
      .input(z.object({ scenarioId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { importScenario } = await import('./services/scenarioSharing');
        return importScenario(input.scenarioId, ctx.user.id);
      }),

    // Get user's shared scenarios
    getUserScenarios: protectedProcedure
      .query(async ({ ctx }) => {
        const { getUserScenarios } = await import('./services/scenarioSharing');
        return getUserScenarios(ctx.user.id);
      }),

    // Delete a shared scenario
    deleteScenario: protectedProcedure
      .input(z.object({ scenarioId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { deleteScenario } = await import('./services/scenarioSharing');
        return deleteScenario(input.scenarioId, ctx.user.id);
      }),

    // Check if user has liked a scenario
    hasUserLiked: protectedProcedure
      .input(z.object({ scenarioId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { hasUserLiked } = await import('./services/scenarioSharing');
        return hasUserLiked(input.scenarioId, ctx.user.id);
      }),

    // Get scenario categories
    getScenarioCategories: publicProcedure
      .query(async () => {
        const { getScenarioCategories } = await import('./services/scenarioSharing');
        return getScenarioCategories();
      }),

    // === Monte Carlo Visualization Routes ===
    
    // Generate Monte Carlo visualization data
    getMonteCarloVisualization: protectedProcedure
      .input(z.object({
        simulationResults: z.array(z.number()),
        initialValue: z.number(),
        numBins: z.number().optional(),
        pathData: z.array(z.array(z.number())).optional(),
      }))
      .query(async ({ input }) => {
        const { generateVisualizationData, generateRiskSummary, formatForChartJS } = await import('./services/monteCarloVisualization');
        const visualizationData = generateVisualizationData(
          input.simulationResults,
          input.initialValue,
          input.numBins || 50,
          10,
          input.pathData
        );
        const riskSummary = generateRiskSummary(visualizationData, input.initialValue);
        const chartData = formatForChartJS(visualizationData, input.initialValue);
        return { visualizationData, riskSummary, chartData };
      }),

    // === Template Performance Tracking Routes ===
    
    // Get template performance
    getTemplatePerformance: publicProcedure
      .input(z.object({
        templateId: z.string(),
        period: z.enum(['1m', '3m', '6m', '1y', 'ytd']).optional(),
      }))
      .query(async ({ input }) => {
        const { calculateTemplatePerformance } = await import('./services/templatePerformanceTracking');
        const endDate = new Date();
        let startDate: Date;
        switch (input.period || '1y') {
          case '1m': startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); break;
          case '3m': startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000); break;
          case '6m': startDate = new Date(endDate.getTime() - 180 * 24 * 60 * 60 * 1000); break;
          case 'ytd': startDate = new Date(endDate.getFullYear(), 0, 1); break;
          default: startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
        }
        return calculateTemplatePerformance(input.templateId, startDate, endDate);
      }),

    // Get template rankings
    getTemplateRankings: publicProcedure
      .input(z.object({
        period: z.enum(['1m', '3m', '6m', '1y', 'ytd']).optional(),
        sortBy: z.enum(['return', 'sharpe', 'drawdown']).optional(),
      }).optional())
      .query(async ({ input }) => {
        const { getTemplateRankings } = await import('./services/templatePerformanceTracking');
        return getTemplateRankings(input?.period || '1y', input?.sortBy || 'return');
      }),

    // Compare template performance
    compareTemplatePerformance: publicProcedure
      .input(z.object({
        templateIds: z.array(z.string()),
        period: z.enum(['1m', '3m', '6m', '1y']).optional(),
      }))
      .query(async ({ input }) => {
        const { compareTemplatePerformance } = await import('./services/templatePerformanceTracking');
        return compareTemplatePerformance(input.templateIds, input.period || '1y');
      }),

    // Get template performance summary
    getTemplatePerformanceSummary: publicProcedure
      .input(z.object({ templateId: z.string() }))
      .query(async ({ input }) => {
        const { getTemplatePerformanceSummary } = await import('./services/templatePerformanceTracking');
        return getTemplatePerformanceSummary(input.templateId);
      }),

    // === Enhanced AI Agent Routes ===
    
    // Analyze asset with 7 AI agents
    analyzeWithAgents: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        assetType: z.enum(['stock', 'crypto']),
        priceHistory: z.array(z.object({
          timestamp: z.number(),
          open: z.number(),
          high: z.number(),
          low: z.number(),
          close: z.number(),
          volume: z.number(),
        })),
        currentPrice: z.number(),
        portfolioValue: z.number(),
        availableCash: z.number(),
        riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
        currentPosition: z.object({
          quantity: z.number(),
          averagePrice: z.number(),
          unrealizedPnL: z.number(),
        }).optional(),
      }))
      .mutation(async ({ input }) => {
        const { agentOrchestrator } = await import('./services/ai-agents/AgentOrchestrator');
        const marketData = {
          symbol: input.symbol,
          assetType: input.assetType,
          currentPrice: input.currentPrice,
          priceHistory: input.priceHistory,
        };
        const portfolio = {
          portfolioValue: input.portfolioValue,
          availableCash: input.availableCash,
          riskTolerance: input.riskTolerance || 'moderate',
          maxDrawdown: 0.15,
          currentDrawdown: 0,
          currentPosition: input.currentPosition,
        };
        return agentOrchestrator.orchestrate(marketData, portfolio);
      }),

    // Get enhanced AI analysis with LLM reasoning
    getEnhancedAgentAnalysis: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        assetType: z.enum(['stock', 'crypto']),
        currentPrice: z.number(),
        consensusDecision: z.object({
          finalSignal: z.string(),
          overallConfidence: z.number(),
          riskApproved: z.boolean(),
          reasoning: z.string(),
          agentVotes: z.array(z.object({
            agentType: z.string(),
            signal: z.string(),
            confidence: z.number(),
            reasoning: z.string(),
          })),
        }),
      }))
      .mutation(async ({ input }) => {
        const { agentOrchestrator } = await import('./services/ai-agents/AgentOrchestrator');
        const marketData = {
          symbol: input.symbol,
          assetType: input.assetType,
          currentPrice: input.currentPrice,
          priceHistory: [],
        };
        const consensusDecision = {
          ...input.consensusDecision,
          suggestedAction: { action: 'hold' as const, urgency: 'normal' as const },
        };
        return agentOrchestrator.getEnhancedAnalysis(marketData, consensusDecision as any);
      }),

    // Analyze crypto with specialized agents
    analyzeCryptoWithAgents: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        metrics: z.object({
          activeAddresses: z.number(),
          transactionCount: z.number(),
          averageTransactionValue: z.number(),
          exchangeInflow: z.number(),
          exchangeOutflow: z.number(),
          exchangeReserves: z.number(),
          whaleTransactions: z.number(),
          topHolderConcentration: z.number(),
          hashRate: z.number().optional(),
          stakingRatio: z.number().optional(),
          totalValueLocked: z.number().optional(),
          liquidityDepth: z.number().optional(),
          yieldRate: z.number().optional(),
          fundingRate: z.number().optional(),
          openInterest: z.number().optional(),
          longShortRatio: z.number().optional(),
        }),
        tokenomics: z.object({
          totalSupply: z.number(),
          circulatingSupply: z.number(),
          maxSupply: z.number().optional(),
          inflationRate: z.number(),
          burnRate: z.number().optional(),
        }).optional(),
      }))
      .mutation(async ({ input }) => {
        const { cryptoCoordinator } = await import('./services/ai-agents/CryptoAgent');
        return cryptoCoordinator.analyzeComprehensive(
          input.symbol,
          input.metrics,
          input.tokenomics as any
        );
      }),

    // Create trading bot
    createTradingBot: protectedProcedure
      .input(z.object({
        name: z.string(),
        assetType: z.enum(['stock', 'crypto', 'both']),
        symbols: z.array(z.string()),
        riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']),
        maxDrawdown: z.number(),
        maxPositionSize: z.number(),
        minConfidenceThreshold: z.number(),
        consensusRequirement: z.enum(['majority', 'supermajority', 'unanimous']),
        enableAutoTrade: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createTradingBot, BotPresets } = await import('./services/ai-agents/AgenticTradingBot');
        const config = {
          ...input,
          userId: String(ctx.user.id),
          ...BotPresets[input.riskTolerance],
        };
        const bot = createTradingBot(config);
        return {
          config: bot.getConfig(),
          state: bot.getState(),
          statistics: bot.getStatistics(),
        };
      }),

    // Get bot presets
    getBotPresets: publicProcedure
      .query(async () => {
        const { BotPresets } = await import('./services/ai-agents/AgenticTradingBot');
        return BotPresets;
      }),

    // Calculate technical indicators
    calculateIndicators: publicProcedure
      .input(z.object({
        candles: z.array(z.object({
          timestamp: z.number(),
          open: z.number(),
          high: z.number(),
          low: z.number(),
          close: z.number(),
          volume: z.number(),
        })),
      }))
      .query(async ({ input }) => {
        const { calculateAllIndicators } = await import('./services/ai-agents/TechnicalIndicators');
        return calculateAllIndicators(input.candles);
      }),

    // Detect candlestick patterns
    detectPatterns: publicProcedure
      .input(z.object({
        candles: z.array(z.object({
          timestamp: z.number(),
          open: z.number(),
          high: z.number(),
          low: z.number(),
          close: z.number(),
          volume: z.number(),
        })),
      }))
      .query(async ({ input }) => {
        const { detectCandlestickPatterns } = await import('./services/ai-agents/TechnicalIndicators');
        return detectCandlestickPatterns(input.candles);
      }),

    // Run Monte Carlo stress test
    runStressTest: protectedProcedure
      .input(z.object({
        positions: z.array(z.object({
          symbol: z.string(),
          quantity: z.number(),
          currentPrice: z.number(),
          avgCost: z.number(),
          annualizedVolatility: z.number().optional(),
          expectedReturn: z.number().optional(),
          beta: z.number().optional(),
        })),
        trades: z.array(z.object({
          symbol: z.string(),
          side: z.enum(['buy', 'sell']),
          quantity: z.number(),
          estimatedPrice: z.number(),
        })),
        cash: z.number(),
        config: z.object({
          numSimulations: z.number().optional(),
          timeHorizonDays: z.number().optional(),
          confidenceLevel: z.number().optional(),
          volatilityMultiplier: z.number().optional(),
          correlationModel: z.enum(['historical', 'stressed', 'uncorrelated']).optional(),
        }).optional(),
      }))
      .mutation(async ({ input }) => {
        const { runMonteCarloSimulation } = await import('./services/monteCarloSimulation');
        return runMonteCarloSimulation({
          symbol: input.positions[0]?.symbol || 'SPY',
          initialCapital: input.cash + input.positions.reduce((sum, p) => sum + p.quantity * p.currentPrice, 0),
          numSimulations: input.config?.numSimulations || 5000,
          timeHorizonDays: input.config?.timeHorizonDays || 252,
          confidenceLevels: [0.95, 0.99],
          strategyType: 'buy_hold',
        });
      }),

    // Agent Explainability
    getAgentExplanation: protectedProcedure
      .input(z.object({
        symbol: z.string(),
      }))
      .query(async ({ input }) => {
        // Generate mock explanation data for now
        const agentExplanations = [
          {
            agentName: 'Technical Analysis Agent',
            agentType: 'technical',
            finalSignal: 'buy' as const,
            confidence: 75,
            reasoning: 'Based on RSI oversold conditions and MACD bullish crossover',
            indicatorContributions: [
              { name: 'RSI', value: 28, signal: 'bullish' as const, weight: 0.15, contribution: 0.8, explanation: 'RSI at 28 indicates oversold conditions' },
              { name: 'MACD', value: 1.5, signal: 'bullish' as const, weight: 0.12, contribution: 0.6, explanation: 'MACD histogram positive and increasing' },
            ],
            patternContributions: [],
            dataPointInfluences: [],
            bullishFactors: 4,
            bearishFactors: 1,
            neutralFactors: 2,
            dominantFactor: 'RSI',
            decisionPath: [],
            featureImportance: [
              { feature: 'RSI', importance: 0.25, direction: 'positive' as const, category: 'technical' },
              { feature: 'MACD', importance: 0.20, direction: 'positive' as const, category: 'technical' },
            ],
            counterfactuals: [],
          },
          {
            agentName: 'Fundamental Analysis Agent',
            agentType: 'fundamental',
            finalSignal: 'buy' as const,
            confidence: 68,
            reasoning: 'Strong fundamentals with low P/E and high ROE',
            indicatorContributions: [
              { name: 'P/E Ratio', value: 15.2, signal: 'bullish' as const, weight: 0.15, contribution: 0.6, explanation: 'P/E of 15.2 suggests undervaluation' },
            ],
            patternContributions: [],
            dataPointInfluences: [],
            bullishFactors: 3,
            bearishFactors: 1,
            neutralFactors: 1,
            dominantFactor: 'P/E Ratio',
            decisionPath: [],
            featureImportance: [
              { feature: 'P/E Ratio', importance: 0.30, direction: 'positive' as const, category: 'fundamental' },
            ],
            counterfactuals: [],
          },
          {
            agentName: 'Sentiment Analysis Agent',
            agentType: 'sentiment',
            finalSignal: 'hold' as const,
            confidence: 55,
            reasoning: 'Mixed sentiment signals from news and social media',
            indicatorContributions: [],
            patternContributions: [],
            dataPointInfluences: [
              { category: 'News', name: 'News Sentiment', value: 'Neutral', impact: 'medium' as const, direction: 'neutral' as const, explanation: 'Recent news coverage is balanced' },
            ],
            bullishFactors: 2,
            bearishFactors: 2,
            neutralFactors: 3,
            dominantFactor: 'News Sentiment',
            decisionPath: [],
            featureImportance: [],
            counterfactuals: [],
          },
          {
            agentName: 'Risk Management Agent',
            agentType: 'risk',
            finalSignal: 'buy' as const,
            confidence: 70,
            reasoning: 'Acceptable risk levels with good risk/reward ratio',
            indicatorContributions: [],
            patternContributions: [],
            dataPointInfluences: [
              { category: 'Risk', name: 'Volatility', value: '22%', impact: 'medium' as const, direction: 'neutral' as const, explanation: 'Volatility within acceptable range' },
            ],
            bullishFactors: 3,
            bearishFactors: 1,
            neutralFactors: 2,
            dominantFactor: 'Risk/Reward',
            decisionPath: [],
            featureImportance: [],
            counterfactuals: [],
          },
        ];

        return {
          symbol: input.symbol,
          assetType: 'stock' as const,
          finalDecision: 'buy' as const,
          overallConfidence: 72,
          agentExplanations,
          votingBreakdown: {
            buyVotes: 3,
            sellVotes: 0,
            holdVotes: 1,
            consensusMethod: 'weighted',
            consensusReached: true,
            dissenterAgents: ['Sentiment Analysis Agent'],
          },
          topBullishFactors: [
            { category: 'Technical', name: 'RSI Oversold', value: 28, impact: 'high' as const, direction: 'bullish' as const, explanation: 'Strong buy signal' },
            { category: 'Fundamental', name: 'Low P/E', value: 15.2, impact: 'high' as const, direction: 'bullish' as const, explanation: 'Undervalued' },
          ],
          topBearishFactors: [],
          conflictingSignals: [],
          riskFactors: [
            { name: 'Market Volatility', severity: 'medium' as const, description: 'Elevated market volatility', mitigation: 'Use position sizing' },
          ],
          overallRiskLevel: 'medium' as const,
        };
      }),

    // Strategy Backtester
    runAgentBacktest: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        initialCapital: z.number(),
        positionSizing: z.enum(['fixed', 'percent']),
        positionSize: z.number(),
        stopLoss: z.number(),
        takeProfit: z.number(),
        useAgentWeights: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        const { runAgentBacktest } = await import('./services/ai-agents/StrategyBacktester');
        return runAgentBacktest({
          symbol: input.symbol,
          startDate: input.startDate,
          endDate: input.endDate,
          initialCapital: input.initialCapital,
          positionSizing: input.positionSizing,
          positionSize: input.positionSize,
          maxPositionSize: input.initialCapital,
          stopLoss: input.stopLoss,
          takeProfit: input.takeProfit,
          transactionCost: 0.1,
          slippage: 0.05,
          useAgentWeights: input.useAgentWeights,
          rebalanceFrequency: 'daily',
          benchmark: input.symbol.includes('BTC') ? 'BTC' : 'SPY',
        });
      }),

    // Prediction Tracking
    recordPrediction: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        assetType: z.enum(['stock', 'crypto']),
        predictionSignal: z.enum(['buy', 'sell', 'hold']),
        confidence: z.number(),
        entryPrice: z.number(),
        targetPrice: z.number().optional(),
        stopLoss: z.number().optional(),
        agentVotes: z.record(z.string(), z.enum(['buy', 'sell', 'hold'])),
        consensusMethod: z.string(),
        marketRegime: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { recordPrediction, initializeSampleData } = await import('./services/ai-agents/PredictionTracking');
        // Initialize sample data for demo
        initializeSampleData(ctx.user.openId);
        return recordPrediction({
          userId: ctx.user.openId,
          ...input,
        });
      }),

    updatePredictionOutcome: protectedProcedure
      .input(z.object({
        predictionId: z.number(),
        actualExitPrice: z.number(),
      }))
      .mutation(async ({ input }) => {
        const { updatePredictionOutcome } = await import('./services/ai-agents/PredictionTracking');
        return updatePredictionOutcome({
          predictionId: input.predictionId,
          actualExitPrice: input.actualExitPrice,
          outcomeTimestamp: new Date(),
        });
      }),

    getPredictionStats: protectedProcedure
      .input(z.object({
        days: z.number().optional().default(30),
      }))
      .query(async ({ ctx, input }) => {
        const { getPredictionStats, initializeSampleData } = await import('./services/ai-agents/PredictionTracking');
        // Initialize sample data for demo
        initializeSampleData(ctx.user.openId);
        return getPredictionStats(ctx.user.openId, input.days);
      }),

    getWeightHistory: protectedProcedure
      .input(z.object({
        days: z.number().optional().default(30),
      }))
      .query(async ({ ctx, input }) => {
        const { getWeightHistory, initializeSampleData } = await import('./services/ai-agents/PredictionTracking');
        // Initialize sample data for demo
        initializeSampleData(ctx.user.openId);
        return getWeightHistory(ctx.user.openId, input.days);
      }),

    getCurrentWeights: protectedProcedure
      .query(async ({ ctx }) => {
        const { getCurrentWeights, initializeSampleData } = await import('./services/ai-agents/PredictionTracking');
        // Initialize sample data for demo
        initializeSampleData(ctx.user.openId);
        return getCurrentWeights(ctx.user.openId);
      }),

    getPendingPredictions: protectedProcedure
      .query(async ({ ctx }) => {
        const { getPendingPredictions } = await import('./services/ai-agents/PredictionTracking');
        return getPendingPredictions(ctx.user.openId);
      }),

    getAllPredictions: protectedProcedure
      .query(async ({ ctx }) => {
        const { getAllPredictions, initializeSampleData } = await import('./services/ai-agents/PredictionTracking');
        // Initialize sample data for demo
        initializeSampleData(ctx.user.openId);
        return getAllPredictions(ctx.user.openId);
      }),

    // Backtest Comparison
    getBacktestRuns: protectedProcedure
      .query(async ({ ctx }) => {
        const { getUserBacktestRuns, initializeSampleBacktests } = await import('./services/ai-agents/BacktestComparison');
        // Initialize sample backtests for demo
        initializeSampleBacktests(ctx.user.openId);
        return getUserBacktestRuns(ctx.user.openId);
      }),

    saveBacktestRun: protectedProcedure
      .input(z.object({
        name: z.string(),
        symbol: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        config: z.object({
          initialCapital: z.number(),
          transactionCost: z.number(),
          slippage: z.number(),
          useAgentWeights: z.boolean(),
          rebalanceFrequency: z.string(),
          agentWeights: z.record(z.string(), z.number()).optional(),
        }),
        results: z.any(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { saveBacktestRun } = await import('./services/ai-agents/BacktestComparison');
        return saveBacktestRun(ctx.user.openId, input);
      }),

    deleteBacktestRun: protectedProcedure
      .input(z.object({
        runId: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { deleteBacktestRun } = await import('./services/ai-agents/BacktestComparison');
        return deleteBacktestRun(ctx.user.openId, input.runId);
      }),

    compareBacktests: protectedProcedure
      .input(z.object({
        runIds: z.array(z.string()),
      }))
      .query(async ({ ctx, input }) => {
        const { compareBacktests, initializeSampleBacktests } = await import('./services/ai-agents/BacktestComparison');
        // Initialize sample backtests for demo
        initializeSampleBacktests(ctx.user.openId);
        return compareBacktests(ctx.user.openId, input.runIds);
      }),

    // Weight Optimization Wizard
    getWizardSteps: protectedProcedure
      .query(async () => {
        const { getWizardSteps } = await import('./services/ai-agents/WeightOptimizationWizard');
        return getWizardSteps();
      }),

    calculateRiskProfile: protectedProcedure
      .input(z.object({
        responses: z.array(z.object({
          questionId: z.string(),
          selectedValue: z.string(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const { calculateRiskProfile, getOptimizedWeights } = await import('./services/ai-agents/WeightOptimizationWizard');
        const profile = calculateRiskProfile(ctx.user.openId, input.responses);
        return getOptimizedWeights(profile);
      }),

    saveOptimizedWeights: protectedProcedure
      .input(z.object({
        weights: z.object({
          technical: z.number(),
          fundamental: z.number(),
          sentiment: z.number(),
          risk: z.number(),
          regime: z.number(),
          execution: z.number(),
          coordinator: z.number(),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        // Save weights to user preferences (in-memory for now)
        return { success: true, weights: input.weights };
      }),

    getPresetConfigurations: protectedProcedure
      .query(async () => {
        const { getPresetConfigurations } = await import('./services/ai-agents/WeightOptimizationWizard');
        return getPresetConfigurations();
      }),

    // Prediction Alerts
    createPredictionAlert: protectedProcedure
      .input(z.object({
        predictionId: z.number(),
        symbol: z.string(),
        targetPrice: z.number().optional(),
        stopLossPrice: z.number().optional(),
        trailingStopPct: z.number().optional(),
        breakoutThresholdPct: z.number().optional(),
        volatilityThreshold: z.number().optional(),
        channels: z.array(z.enum(['in_app', 'email', 'push', 'sms'])).optional(),
        expiresInHours: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createAlert } = await import('./services/ai-agents/PredictionAlerts');
        return createAlert({
          userId: ctx.user.openId,
          predictionId: input.predictionId,
          symbol: input.symbol,
          targetPrice: input.targetPrice,
          stopLossPrice: input.stopLossPrice,
          trailingStopPct: input.trailingStopPct,
          breakoutThresholdPct: input.breakoutThresholdPct,
          volatilityThreshold: input.volatilityThreshold,
          channels: input.channels || ['in_app'],
          expiresInHours: input.expiresInHours,
        });
      }),

    getPredictionAlerts: protectedProcedure
      .query(async ({ ctx }) => {
        const { getUserAlerts } = await import('./services/ai-agents/PredictionAlerts');
        return getUserAlerts(ctx.user.openId);
      }),

    cancelPredictionAlert: protectedProcedure
      .input(z.object({ alertId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { deleteAlert } = await import('./services/ai-agents/PredictionAlerts');
        return deleteAlert(input.alertId, ctx.user.openId);
      }),

    // Backtest Export
    exportBacktestCSV: protectedProcedure
      .input(z.object({
        title: z.string(),
        backtestIds: z.array(z.string()),
        includeTradeDetails: z.boolean().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const { generateSampleExportData, generateCSVExport, getExportFileName } = await import('./services/ai-agents/BacktestExport');
        const data = generateSampleExportData(ctx.user.openId);
        data.title = input.title;
        const csv = generateCSVExport(data, {
          includeTradeDetails: input.includeTradeDetails ?? true,
          includeAgentWeights: true,
          delimiter: ',',
          dateFormat: 'ISO',
        });
        return {
          content: csv,
          filename: getExportFileName(input.title, 'csv'),
          mimeType: 'text/csv',
        };
      }),

    exportBacktestPDF: protectedProcedure
      .input(z.object({
        title: z.string(),
        backtestIds: z.array(z.string()),
        includeTradeLog: z.boolean().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const { generateSampleExportData, generatePDFContent, getExportFileName } = await import('./services/ai-agents/BacktestExport');
        const data = generateSampleExportData(ctx.user.openId);
        data.title = input.title;
        const html = generatePDFContent(data, {
          includeCharts: true,
          includeTradeLog: input.includeTradeLog ?? true,
          includeDisclaimer: true,
          paperSize: 'A4',
          orientation: 'portrait',
        });
        return {
          content: html,
          filename: getExportFileName(input.title, 'pdf'),
          mimeType: 'text/html',
        };
      }),

    // Agent Communication Hub - Real-time agent discussions
    startAgentDiscussion: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        assetType: z.enum(['stock', 'crypto', 'forex', 'commodity']),
        topic: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { startDiscussion } = await import('./services/ai-agents/AgentCommunicationHub');
        return startDiscussion(input.symbol, input.assetType, input.topic);
      }),

    runAgentDebate: protectedProcedure
      .input(z.object({
        threadId: z.string(),
        rounds: z.number().min(1).max(5).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { generateDebate, getDiscussion } = await import('./services/ai-agents/AgentCommunicationHub');
        const messages = await generateDebate(input.threadId, input.rounds ?? 1);
        return { messages, thread: getDiscussion(input.threadId) };
      }),

    conductAgentVoting: protectedProcedure
      .input(z.object({
        threadId: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { conductVoting, getDiscussion } = await import('./services/ai-agents/AgentCommunicationHub');
        const consensus = await conductVoting(input.threadId);
        return { consensus, thread: getDiscussion(input.threadId) };
      }),

    getDiscussionThread: protectedProcedure
      .input(z.object({
        threadId: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        const { getDiscussion } = await import('./services/ai-agents/AgentCommunicationHub');
        return getDiscussion(input.threadId);
      }),

    // Market Regime Auto-Adaptation
    getRegimeAdaptationConfig: protectedProcedure
      .query(async ({ ctx }) => {
        const { getUserConfig } = await import('./services/ai-agents/MarketRegimeAutoAdaptation');
        return getUserConfig(ctx.user.openId);
      }),

    updateRegimeAdaptationConfig: protectedProcedure
      .input(z.object({
        enabled: z.boolean().optional(),
        sensitivity: z.enum(['low', 'medium', 'high']).optional(),
        minConfidenceThreshold: z.number().min(0).max(100).optional(),
        cooldownPeriodMs: z.number().min(0).optional(),
        maxWeightChange: z.number().min(0).max(1).optional(),
        notifyOnChange: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { updateUserConfig } = await import('./services/ai-agents/MarketRegimeAutoAdaptation');
        return updateUserConfig(ctx.user.openId, input);
      }),

    detectMarketRegime: protectedProcedure
      .input(z.object({
        prices: z.array(z.number()),
        volumes: z.array(z.number()),
        highs: z.array(z.number()),
        lows: z.array(z.number()),
        symbol: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { detectRegime } = await import('./services/ai-agents/MarketRegimeAutoAdaptation');
        return detectRegime(input);
      }),

    autoAdaptWeights: protectedProcedure
      .input(z.object({
        currentWeights: z.object({
          technical: z.number(),
          fundamental: z.number(),
          sentiment: z.number(),
          risk: z.number(),
          regime: z.number(),
          execution: z.number(),
        }),
        marketData: z.object({
          prices: z.array(z.number()),
          volumes: z.array(z.number()),
          highs: z.array(z.number()),
          lows: z.array(z.number()),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        const { autoAdaptWeights } = await import('./services/ai-agents/MarketRegimeAutoAdaptation');
        return autoAdaptWeights(ctx.user.openId, input.currentWeights, input.marketData);
      }),

    getRegimeHistory: protectedProcedure
      .query(async ({ ctx }) => {
        const { getRegimeHistory } = await import('./services/ai-agents/MarketRegimeAutoAdaptation');
        return getRegimeHistory();
      }),

    getRegimeStatistics: protectedProcedure
      .query(async ({ ctx }) => {
        const { getRegimeStatistics } = await import('./services/ai-agents/MarketRegimeAutoAdaptation');
        return getRegimeStatistics();
      }),

    getRegimePresets: protectedProcedure
      .query(async ({ ctx }) => {
        const { getAllRegimePresets } = await import('./services/ai-agents/MarketRegimeAutoAdaptation');
        return getAllRegimePresets();
      }),

    enhanceRegimeAnalysis: protectedProcedure
      .input(z.object({
        regime: z.string(),
        indicators: z.object({
          volatility: z.number(),
          trend: z.number(),
          momentum: z.number(),
          sentiment: z.number(),
          volume: z.number(),
        }),
        symbol: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { enhanceRegimeAnalysis } = await import('./services/ai-agents/MarketRegimeAutoAdaptation');
        return enhanceRegimeAnalysis(input.regime as any, input.indicators, input.symbol);
      }),

    // Multi-Asset Correlation Engine
    getCorrelationAssets: protectedProcedure
      .query(async ({ ctx }) => {
        const { getDefaultAssets } = await import('./services/ai-agents/MultiAssetCorrelationEngine');
        return getDefaultAssets();
      }),

    calculateCorrelationMatrix: protectedProcedure
      .input(z.object({
        symbols: z.array(z.string()),
        period: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { calculateCorrelationMatrix, generateSamplePriceData, getDefaultAssets } = await import('./services/ai-agents/MultiAssetCorrelationEngine');
        const allAssets = getDefaultAssets();
        const selectedAssets = allAssets.filter(a => input.symbols.includes(a.symbol));
        const priceData = generateSamplePriceData(input.symbols);
        return calculateCorrelationMatrix(selectedAssets, priceData, input.period || '1Y');
      }),

    analyzeCrossAssetCorrelations: protectedProcedure
      .input(z.object({
        symbols: z.array(z.string()),
      }))
      .mutation(async ({ ctx, input }) => {
        const { analyzeCrossAssetCorrelations, generateSamplePriceData, getDefaultAssets } = await import('./services/ai-agents/MultiAssetCorrelationEngine');
        const allAssets = getDefaultAssets();
        const selectedAssets = allAssets.filter(a => input.symbols.includes(a.symbol));
        const priceData = generateSamplePriceData(input.symbols);
        return analyzeCrossAssetCorrelations(selectedAssets, priceData);
      }),

    findUncorrelatedAssets: protectedProcedure
      .input(z.object({
        currentSymbols: z.array(z.string()),
        maxCorrelation: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { findUncorrelatedAssets, generateSamplePriceData, getDefaultAssets } = await import('./services/ai-agents/MultiAssetCorrelationEngine');
        const allAssets = getDefaultAssets();
        const currentAssets = allAssets.filter(a => input.currentSymbols.includes(a.symbol));
        const candidateAssets = allAssets.filter(a => !input.currentSymbols.includes(a.symbol));
        const priceData = generateSamplePriceData(allAssets.map(a => a.symbol));
        return findUncorrelatedAssets(currentAssets, candidateAssets, priceData, input.maxCorrelation || 0.3);
      }),

    calculateRollingCorrelation: protectedProcedure
      .input(z.object({
        symbol1: z.string(),
        symbol2: z.string(),
        windowSize: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { calculateRollingCorrelation, generateSamplePriceData, getDefaultAssets } = await import('./services/ai-agents/MultiAssetCorrelationEngine');
        const allAssets = getDefaultAssets();
        const asset1 = allAssets.find(a => a.symbol === input.symbol1);
        const asset2 = allAssets.find(a => a.symbol === input.symbol2);
        if (!asset1 || !asset2) return null;
        const priceData = generateSamplePriceData([input.symbol1, input.symbol2]);
        const prices1 = priceData.get(input.symbol1) || [];
        const prices2 = priceData.get(input.symbol2) || [];
        return calculateRollingCorrelation(asset1, prices1, asset2, prices2, input.windowSize || 30);
      }),

    // Social Sentiment Integration
    getSymbolSentiment: protectedProcedure
      .input(z.object({
        symbol: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        const { getSymbolSentiment } = await import('./services/ai-agents/SocialSentimentIntegration');
        return getSymbolSentiment(input.symbol);
      }),

    getTrendingSentiment: protectedProcedure
      .query(async ({ ctx }) => {
        const { getTrendingSymbols } = await import('./services/ai-agents/SocialSentimentIntegration');
        return getTrendingSymbols(10);
      }),

    getSentimentAlerts: protectedProcedure
      .input(z.object({
        symbol: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        const { getSymbolSentiment, generateSentimentAlerts } = await import('./services/ai-agents/SocialSentimentIntegration');
        const currentSentiment = getSymbolSentiment(input.symbol);
        return generateSentimentAlerts(input.symbol, null, currentSentiment);
      }),

    getSentimentHeatmap: protectedProcedure
      .query(async ({ ctx }) => {
        const { getSentimentHeatmap } = await import('./services/ai-agents/SocialSentimentIntegration');
        return getSentimentHeatmap();
      }),

    analyzeSentimentText: protectedProcedure
      .input(z.object({
        text: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { analyzeSentimentText } = await import('./services/ai-agents/SocialSentimentIntegration');
        return analyzeSentimentText(input.text);
      }),

    // Portfolio Stress Testing
    getStressScenarios: protectedProcedure
      .query(async ({ ctx }) => {
        const { getAvailableScenarios } = await import('./services/ai-agents/PortfolioStressTesting');
        return getAvailableScenarios();
      }),

    runMonteCarloStress: protectedProcedure
      .input(z.object({
        simulations: z.number().optional(),
        timeHorizon: z.number().optional(),
        confidenceLevel: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { runMonteCarloSimulation, getSamplePortfolio } = await import('./services/ai-agents/PortfolioStressTesting');
        const portfolio = getSamplePortfolio();
        return runMonteCarloSimulation(portfolio, {
          simulations: input.simulations || 1000,
          timeHorizon: input.timeHorizon || 30,
          confidenceLevel: input.confidenceLevel || 0.95,
          volatilityMultiplier: 1.0,
        });
      }),

    runHistoricalStress: protectedProcedure
      .input(z.object({
        scenario: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { runHistoricalScenario, getSamplePortfolio } = await import('./services/ai-agents/PortfolioStressTesting');
        const portfolio = getSamplePortfolio();
        return runHistoricalScenario(portfolio, input.scenario as any);
      }),

    runSensitivityAnalysis: protectedProcedure
      .input(z.object({
        factors: z.array(z.string()),
      }))
      .mutation(async ({ ctx, input }) => {
        const { runSensitivityAnalysis, getSamplePortfolio } = await import('./services/ai-agents/PortfolioStressTesting');
        const portfolio = getSamplePortfolio();
        return runSensitivityAnalysis(portfolio, input.factors);
      }),

    calculatePortfolioVaR: protectedProcedure
      .query(async ({ ctx }) => {
        const { calculateVaR, getSamplePortfolio } = await import('./services/ai-agents/PortfolioStressTesting');
        const portfolio = getSamplePortfolio();
        return calculateVaR(portfolio, 0.95, 1);
      }),

    // Agent Performance Leaderboard
    getAgentLeaderboard: protectedProcedure
      .input(z.object({
        timeFrame: z.string(),
        marketCondition: z.string().optional(),
        agentType: z.string().optional(),
        minSignals: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const { getLeaderboard } = await import('./services/ai-agents/AgentPerformanceLeaderboard');
        return getLeaderboard({
          timeFrame: input.timeFrame as any,
          marketCondition: input.marketCondition as any,
          agentType: input.agentType as any,
          minSignals: input.minSignals,
        });
      }),

    getLeaderboardStats: protectedProcedure
      .query(async ({ ctx }) => {
        const { getLeaderboardStats } = await import('./services/ai-agents/AgentPerformanceLeaderboard');
        return getLeaderboardStats();
      }),

    getMarketConditions: protectedProcedure
      .query(async ({ ctx }) => {
        const { getMarketConditions } = await import('./services/ai-agents/AgentPerformanceLeaderboard');
        return getMarketConditions();
      }),

    getAgentTypes: protectedProcedure
      .query(async ({ ctx }) => {
        const { getAgentTypes } = await import('./services/ai-agents/AgentPerformanceLeaderboard');
        return getAgentTypes();
      }),

    getAllBadges: protectedProcedure
      .query(async ({ ctx }) => {
        const { getAllBadges } = await import('./services/ai-agents/AgentPerformanceLeaderboard');
        return getAllBadges();
      }),

    getAgentDetails: protectedProcedure
      .input(z.object({
        agentId: z.string(),
        timeFrame: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const { getAgentDetails } = await import('./services/ai-agents/AgentPerformanceLeaderboard');
        return getAgentDetails(input.agentId, (input.timeFrame || '1m') as any);
      }),

    compareAgents: protectedProcedure
      .input(z.object({
        agentIds: z.array(z.string()),
        timeFrame: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const { compareAgents } = await import('./services/ai-agents/AgentPerformanceLeaderboard');
        return compareAgents(input.agentIds, (input.timeFrame || '1m') as any);
      }),

    // ==================== AUTOMATED STRATEGY GENERATION ====================
    
    // Get strategy questionnaire
    getStrategyQuestionnaire: publicProcedure
      .query(async () => {
        const { getQuestionnaire } = await import('./services/ai-agents/AutomatedStrategyGeneration');
        return getQuestionnaire();
      }),

    // Get strategy templates
    getStrategyTemplates: publicProcedure
      .query(async () => {
        const { getStrategyTemplates } = await import('./services/ai-agents/AutomatedStrategyGeneration');
        return getStrategyTemplates();
      }),

    // Create risk profile from questionnaire responses
    createRiskProfile: protectedProcedure
      .input(z.object({
        responses: z.array(z.object({
          questionId: z.string(),
          answer: z.union([z.string(), z.number(), z.array(z.string())]),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createRiskProfile } = await import('./services/ai-agents/AutomatedStrategyGeneration');
        return createRiskProfile(ctx.user.openId, input.responses);
      }),

    // Generate strategy based on risk profile
    generateStrategy: protectedProcedure
      .input(z.object({
        profileId: z.string(),
        preferredType: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createRiskProfile, generateStrategy, getQuestionnaire } = await import('./services/ai-agents/AutomatedStrategyGeneration');
        // For now, create a default profile if profileId doesn't exist
        const defaultResponses = [
          { questionId: 'q1_risk_tolerance', answer: 'hold' },
          { questionId: 'q2_investment_horizon', answer: 'medium_term' },
          { questionId: 'q3_trading_style', answer: 'swing_trading' },
          { questionId: 'q4_max_drawdown', answer: 20 },
          { questionId: 'q5_target_return', answer: 15 },
          { questionId: 'q6_asset_classes', answer: ['stocks'] },
          { questionId: 'q7_capital', answer: 10000 },
          { questionId: 'q8_experience', answer: 'intermediate' },
          { questionId: 'q9_time_availability', answer: 'part_time' },
          { questionId: 'q10_emotional_tolerance', answer: 5 },
        ];
        const profile = createRiskProfile(ctx.user.openId, defaultResponses);
        return generateStrategy(profile, input.preferredType as any);
      }),

    // Optimize existing strategy
    optimizeStrategy: protectedProcedure
      .input(z.object({
        strategyId: z.string(),
        optimizationGoal: z.enum(['win_rate', 'risk_reward', 'sharpe', 'drawdown']),
      }))
      .mutation(async ({ ctx, input }) => {
        const { optimizeStrategy, generateStrategy, createRiskProfile } = await import('./services/ai-agents/AutomatedStrategyGeneration');
        // Generate a sample strategy to optimize
        const defaultResponses = [
          { questionId: 'q1_risk_tolerance', answer: 'hold' },
          { questionId: 'q2_investment_horizon', answer: 'medium_term' },
          { questionId: 'q3_trading_style', answer: 'swing_trading' },
          { questionId: 'q4_max_drawdown', answer: 20 },
          { questionId: 'q5_target_return', answer: 15 },
          { questionId: 'q6_asset_classes', answer: ['stocks'] },
          { questionId: 'q7_capital', answer: 10000 },
          { questionId: 'q8_experience', answer: 'intermediate' },
          { questionId: 'q9_time_availability', answer: 'part_time' },
          { questionId: 'q10_emotional_tolerance', answer: 5 },
        ];
        const profile = createRiskProfile(ctx.user.openId, defaultResponses);
        const strategy = generateStrategy(profile);
        return optimizeStrategy(strategy, input.optimizationGoal);
      }),

    // Get suitable templates for a risk profile
    getSuitableTemplates: protectedProcedure
      .input(z.object({
        riskTolerance: z.enum(['conservative', 'moderate', 'aggressive', 'very_aggressive']),
        preferredAssets: z.array(z.string()),
      }))
      .query(async ({ ctx, input }) => {
        const { getSuitableTemplates, createRiskProfile } = await import('./services/ai-agents/AutomatedStrategyGeneration');
        const mockProfile = {
          id: 'temp',
          userId: ctx.user.openId,
          riskTolerance: input.riskTolerance,
          investmentHorizon: 'medium_term' as const,
          tradingStyle: 'swing_trading' as const,
          maxDrawdownTolerance: 20,
          targetAnnualReturn: 15,
          preferredAssetClasses: input.preferredAssets as any[],
          capitalAllocation: 10000,
          maxPositionSize: 10,
          maxOpenPositions: 10,
          tradingFrequency: 'medium' as const,
          experienceLevel: 'intermediate' as const,
          emotionalTolerance: 5,
          timeAvailability: 'part_time' as const,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        return getSuitableTemplates(mockProfile);
      }),

    // Generate multiple strategy variations
    generateStrategyVariations: protectedProcedure
      .input(z.object({
        count: z.number().min(1).max(5).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { generateStrategyVariations, createRiskProfile } = await import('./services/ai-agents/AutomatedStrategyGeneration');
        const defaultResponses = [
          { questionId: 'q1_risk_tolerance', answer: 'hold' },
          { questionId: 'q2_investment_horizon', answer: 'medium_term' },
          { questionId: 'q3_trading_style', answer: 'swing_trading' },
          { questionId: 'q4_max_drawdown', answer: 20 },
          { questionId: 'q5_target_return', answer: 15 },
          { questionId: 'q6_asset_classes', answer: ['stocks', 'crypto'] },
          { questionId: 'q7_capital', answer: 10000 },
          { questionId: 'q8_experience', answer: 'intermediate' },
          { questionId: 'q9_time_availability', answer: 'part_time' },
          { questionId: 'q10_emotional_tolerance', answer: 5 },
        ];
        const profile = createRiskProfile(ctx.user.openId, defaultResponses);
        return generateStrategyVariations(profile, input.count || 3);
      }),

    // Compare multiple strategies
    compareStrategies: protectedProcedure
      .input(z.object({
        strategyIds: z.array(z.string()),
      }))
      .query(async ({ ctx, input }) => {
        const { compareStrategies, generateStrategyVariations, createRiskProfile } = await import('./services/ai-agents/AutomatedStrategyGeneration');
        const defaultResponses = [
          { questionId: 'q1_risk_tolerance', answer: 'hold' },
          { questionId: 'q2_investment_horizon', answer: 'medium_term' },
          { questionId: 'q3_trading_style', answer: 'swing_trading' },
          { questionId: 'q4_max_drawdown', answer: 20 },
          { questionId: 'q5_target_return', answer: 15 },
          { questionId: 'q6_asset_classes', answer: ['stocks', 'crypto'] },
          { questionId: 'q7_capital', answer: 10000 },
          { questionId: 'q8_experience', answer: 'intermediate' },
          { questionId: 'q9_time_availability', answer: 'part_time' },
          { questionId: 'q10_emotional_tolerance', answer: 5 },
        ];
        const profile = createRiskProfile(ctx.user.openId, defaultResponses);
        const strategies = generateStrategyVariations(profile, 3);
        return compareStrategies(strategies);
      }),

    // Validate a strategy
    validateStrategy: protectedProcedure
      .input(z.object({
        strategyId: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        const { validateStrategy, generateStrategy, createRiskProfile } = await import('./services/ai-agents/AutomatedStrategyGeneration');
        const defaultResponses = [
          { questionId: 'q1_risk_tolerance', answer: 'hold' },
          { questionId: 'q2_investment_horizon', answer: 'medium_term' },
          { questionId: 'q3_trading_style', answer: 'swing_trading' },
          { questionId: 'q4_max_drawdown', answer: 20 },
          { questionId: 'q5_target_return', answer: 15 },
          { questionId: 'q6_asset_classes', answer: ['stocks'] },
          { questionId: 'q7_capital', answer: 10000 },
          { questionId: 'q8_experience', answer: 'intermediate' },
          { questionId: 'q9_time_availability', answer: 'part_time' },
          { questionId: 'q10_emotional_tolerance', answer: 5 },
        ];
        const profile = createRiskProfile(ctx.user.openId, defaultResponses);
        const strategy = generateStrategy(profile);
        return validateStrategy(strategy);
      }),

    // Export strategy as JSON
    exportStrategy: protectedProcedure
      .input(z.object({
        strategyId: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        const { exportStrategy, generateStrategy, createRiskProfile } = await import('./services/ai-agents/AutomatedStrategyGeneration');
        const defaultResponses = [
          { questionId: 'q1_risk_tolerance', answer: 'hold' },
          { questionId: 'q2_investment_horizon', answer: 'medium_term' },
          { questionId: 'q3_trading_style', answer: 'swing_trading' },
          { questionId: 'q4_max_drawdown', answer: 20 },
          { questionId: 'q5_target_return', answer: 15 },
          { questionId: 'q6_asset_classes', answer: ['stocks'] },
          { questionId: 'q7_capital', answer: 10000 },
          { questionId: 'q8_experience', answer: 'intermediate' },
          { questionId: 'q9_time_availability', answer: 'part_time' },
          { questionId: 'q10_emotional_tolerance', answer: 5 },
        ];
        const profile = createRiskProfile(ctx.user.openId, defaultResponses);
        const strategy = generateStrategy(profile);
        return { json: exportStrategy(strategy), filename: `${strategy.name.replace(/\s+/g, '_')}.json` };
      }),

    // Strategy Backtesting Integration
    runStrategyBacktest: protectedProcedure
      .input(z.object({
        strategyId: z.string(),
        symbol: z.string(),
        startDate: z.number(),
        endDate: z.number(),
        initialCapital: z.number().default(100000),
        commissionRate: z.number().default(0.001),
      }))
      .mutation(async ({ input }) => {
        const { runBacktest } = await import('./services/ai-agents/StrategyBacktestingIntegration');
        const { generateStrategy, createRiskProfile } = await import('./services/ai-agents/AutomatedStrategyGeneration');
        // Create a default risk profile and generate strategy
        const defaultResponses = [
          { questionId: 'q1_risk_tolerance', answer: 3 },
          { questionId: 'q2_investment_horizon', answer: 'medium_term' },
          { questionId: 'q3_loss_reaction', answer: 'hold' },
          { questionId: 'q4_income_stability', answer: 'stable' },
          { questionId: 'q5_investment_goal', answer: 'growth' },
          { questionId: 'q6_market_knowledge', answer: 'intermediate' },
          { questionId: 'q7_portfolio_allocation', answer: 'balanced' },
          { questionId: 'q8_experience', answer: 'intermediate' },
          { questionId: 'q9_time_availability', answer: 'part_time' },
          { questionId: 'q10_emotional_tolerance', answer: 5 },
        ];
        const profile = createRiskProfile('backtest-user', defaultResponses);
        const strategy = generateStrategy(profile);
        return runBacktest(strategy, {
          strategyId: input.strategyId,
          symbol: input.symbol,
          startDate: input.startDate,
          endDate: input.endDate,
          initialCapital: input.initialCapital,
          commission: input.commissionRate,
          slippage: 0.001,
          useMarginTrading: false,
          maxLeverage: 1,
        });
      }),

    getBacktestSummary: protectedProcedure
      .input(z.object({ backtestId: z.string() }))
      .query(async ({ input }) => {
        const { runBacktest, getBacktestSummary } = await import('./services/ai-agents/StrategyBacktestingIntegration');
        const { generateStrategy, createRiskProfile } = await import('./services/ai-agents/AutomatedStrategyGeneration');
        const defaultResponses = [
          { questionId: 'q1_risk_tolerance', answer: 3 },
          { questionId: 'q2_investment_horizon', answer: 'medium_term' },
          { questionId: 'q3_loss_reaction', answer: 'hold' },
          { questionId: 'q4_income_stability', answer: 'stable' },
          { questionId: 'q5_investment_goal', answer: 'growth' },
          { questionId: 'q6_market_knowledge', answer: 'intermediate' },
          { questionId: 'q7_portfolio_allocation', answer: 'balanced' },
          { questionId: 'q8_experience', answer: 'intermediate' },
          { questionId: 'q9_time_availability', answer: 'part_time' },
          { questionId: 'q10_emotional_tolerance', answer: 5 },
        ];
        const profile = createRiskProfile('backtest-user', defaultResponses);
        const strategy = generateStrategy(profile);
        const mockResult = runBacktest(strategy, {
          strategyId: input.backtestId,
          symbol: 'AAPL',
          startDate: Date.now() - 365 * 24 * 60 * 60 * 1000,
          endDate: Date.now(),
          initialCapital: 100000,
          commission: 0.001,
          slippage: 0.001,
          useMarginTrading: false,
          maxLeverage: 1,
        });
        return getBacktestSummary(mockResult);
      }),

    compareBacktestResults: protectedProcedure
      .input(z.object({ backtestIds: z.array(z.string()) }))
      .query(async ({ input }) => {
        const { runBacktest, compareBacktestResults } = await import('./services/ai-agents/StrategyBacktestingIntegration');
        const { generateStrategy, createRiskProfile } = await import('./services/ai-agents/AutomatedStrategyGeneration');
        // Run backtests for comparison
        const results = input.backtestIds.map((id, idx) => {
          const defaultResponses = [
            { questionId: 'q1_risk_tolerance', answer: 1 + idx },
            { questionId: 'q2_investment_horizon', answer: 'medium_term' },
            { questionId: 'q3_loss_reaction', answer: 'hold' },
            { questionId: 'q4_income_stability', answer: 'stable' },
            { questionId: 'q5_investment_goal', answer: 'growth' },
            { questionId: 'q6_market_knowledge', answer: 'intermediate' },
            { questionId: 'q7_portfolio_allocation', answer: 'balanced' },
            { questionId: 'q8_experience', answer: 'intermediate' },
            { questionId: 'q9_time_availability', answer: 'part_time' },
            { questionId: 'q10_emotional_tolerance', answer: 5 },
          ];
          const profile = createRiskProfile(`backtest-${id}`, defaultResponses);
          const strategy = generateStrategy(profile);
          return runBacktest(strategy, {
            strategyId: id,
            symbol: 'AAPL',
            startDate: Date.now() - 365 * 24 * 60 * 60 * 1000,
            endDate: Date.now(),
            initialCapital: 100000,
            commission: 0.001,
            slippage: 0.001,
            useMarginTrading: false,
            maxLeverage: 1,
          });
        });
        return compareBacktestResults(results);
      }),

    // Strategy Alerts
    getAlerts: protectedProcedure
      .input(z.object({
        status: z.enum(['active', 'triggered', 'expired', 'cancelled']).optional(),
        type: z.string().optional(),
        symbol: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const { getUserAlerts } = await import('./services/ai-agents/StrategyAlerts');
        return getUserAlerts(ctx.user.openId, input as any);
      }),

    getAlertTemplates: publicProcedure
      .input(z.object({ category: z.enum(['entry', 'exit', 'risk', 'opportunity']).optional() }).optional())
      .query(async ({ input }) => {
        const { getAlertTemplates } = await import('./services/ai-agents/StrategyAlerts');
        return getAlertTemplates(input?.category);
      }),

    getAlertSummary: protectedProcedure
      .query(async ({ ctx }) => {
        const { getAlertSummary } = await import('./services/ai-agents/StrategyAlerts');
        return getAlertSummary(ctx.user.openId);
      }),

    getRecentTriggers: protectedProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        const { getRecentTriggers } = await import('./services/ai-agents/StrategyAlerts');
        return getRecentTriggers(ctx.user.openId, input.limit);
      }),

    createAlert: protectedProcedure
      .input(z.object({
        strategyId: z.string(),
        strategyName: z.string(),
        symbol: z.string(),
        type: z.enum(['entry_signal', 'exit_signal', 'price_target', 'stop_loss', 'indicator_crossover', 'volume_spike', 'volatility_alert', 'custom']),
        priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
        conditions: z.array(z.object({
          type: z.enum(['price', 'indicator', 'volume', 'volatility', 'time', 'custom']),
          indicator: z.string().optional(),
          operator: z.enum(['above', 'below', 'crosses_above', 'crosses_below', 'equals', 'between', 'change_percent']),
          value: z.union([z.number(), z.tuple([z.number(), z.number()])]),
        })),
        conditionLogic: z.enum(['all', 'any']).default('all'),
        message: z.string().optional(),
        notificationChannels: z.array(z.string()).default(['in_app']),
        cooldownMinutes: z.number().default(30),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createAlert } = await import('./services/ai-agents/StrategyAlerts');
        return createAlert(ctx.user.openId, input.strategyId, input.strategyName, input.symbol, {
          type: input.type,
          priority: input.priority,
          conditions: input.conditions,
          conditionLogic: input.conditionLogic,
          message: input.message,
          notificationChannels: input.notificationChannels as any,
          cooldownMinutes: input.cooldownMinutes,
        });
      }),

    createAlertFromTemplate: protectedProcedure
      .input(z.object({
        templateId: z.string(),
        strategyId: z.string(),
        strategyName: z.string(),
        symbol: z.string(),
        priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
        notificationChannels: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createAlertFromTemplate } = await import('./services/ai-agents/StrategyAlerts');
        return createAlertFromTemplate(
          ctx.user.openId,
          input.strategyId,
          input.strategyName,
          input.symbol,
          input.templateId,
          {
            priority: input.priority,
            notificationChannels: input.notificationChannels as any,
          }
        );
      }),

    cancelAlert: protectedProcedure
      .input(z.object({ alertId: z.string() }))
      .mutation(async ({ input }) => {
        const { cancelAlert } = await import('./services/ai-agents/StrategyAlerts');
        return cancelAlert(input.alertId);
      }),

    deleteAlert: protectedProcedure
      .input(z.object({ alertId: z.string() }))
      .mutation(async ({ input }) => {
        const { deleteAlert } = await import('./services/ai-agents/StrategyAlerts');
        return deleteAlert(input.alertId);
      }),

    acknowledgeTrigger: protectedProcedure
      .input(z.object({ triggerId: z.string() }))
      .mutation(async ({ input }) => {
        const { acknowledgeTrigger } = await import('./services/ai-agents/StrategyAlerts');
        return acknowledgeTrigger(input.triggerId);
      }),

    processAlerts: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        price: z.number(),
        volume: z.number(),
        change: z.number(),
        changePercent: z.number(),
      }))
      .mutation(async ({ input }) => {
        const { processAlerts, simulateMarketSnapshot } = await import('./services/ai-agents/StrategyAlerts');
        const snapshot = {
          ...simulateMarketSnapshot(input.symbol),
          price: input.price,
          volume: input.volume,
          change: input.change,
          changePercent: input.changePercent,
        };
        return processAlerts(input.symbol, snapshot);
      }),
  }),

  // ==================== ALPACA BROKER INTEGRATION ====================
  alpaca: router({
    // Market Data - Real-time Quotes
    getQuote: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        feed: z.enum(['iex', 'sip']).optional(),
      }))
      .query(async ({ input }) => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.getQuote(input.symbol);
      }),

    getQuotes: protectedProcedure
      .input(z.object({
        symbols: z.array(z.string()),
        feed: z.enum(['iex', 'sip']).optional(),
      }))
      .query(async ({ input }) => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        const quotes = await Promise.all(input.symbols.map(s => adapter.getQuote(s)));
        return Object.fromEntries(input.symbols.map((s, i) => [s, quotes[i]]));
      }),

    // Market Data - Historical Bars
    getBars: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        timeframe: z.enum(['1Min', '5Min', '15Min', '30Min', '1Hour', '4Hour', '1Day', '1Week', '1Month']),
        start: z.string().optional(),
        end: z.string().optional(),
        limit: z.number().max(10000).optional(),
        feed: z.enum(['iex', 'sip']).optional(),
      }))
      .query(async ({ input }) => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.getBars({
          symbol: input.symbol,
          timeframe: input.timeframe as any,
          start: input.start ? new Date(input.start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: input.end ? new Date(input.end) : undefined,
          limit: input.limit,
        });
      }),

    getMultiBars: protectedProcedure
      .input(z.object({
        symbols: z.array(z.string()),
        timeframe: z.enum(['1Min', '5Min', '15Min', '30Min', '1Hour', '4Hour', '1Day', '1Week', '1Month']),
        start: z.string().optional(),
        end: z.string().optional(),
        limit: z.number().max(10000).optional(),
      }))
      .query(async ({ input }) => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        const results: Record<string, any[]> = {};
        for (const symbol of input.symbols) {
          results[symbol] = await adapter.getBars({
            symbol,
            timeframe: input.timeframe as any,
            start: input.start ? new Date(input.start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            end: input.end ? new Date(input.end) : undefined,
            limit: input.limit,
          });
        }
        return results;
      }),

    // Market Data - Trades
    getTrades: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        start: z.string().optional(),
        end: z.string().optional(),
        limit: z.number().max(10000).optional(),
      }))
      .query(async ({ input }) => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.getTrades(
          input.symbol,
          input.start ? new Date(input.start) : new Date(Date.now() - 24 * 60 * 60 * 1000),
          input.end ? new Date(input.end) : undefined,
          input.limit
        );
      }),

    // Market Data - Snapshot
    getSnapshot: protectedProcedure
      .input(z.object({
        symbol: z.string(),
      }))
      .query(async ({ input }) => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.getSnapshot(input.symbol);
      }),

    getSnapshots: protectedProcedure
      .input(z.object({
        symbols: z.array(z.string()),
      }))
      .query(async ({ input }) => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.getSnapshots(input.symbols);
      }),

    // Options Trading
    getOptionsChain: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        expirationDate: z.string().optional(),
        strikePrice: z.number().optional(),
        optionType: z.enum(['call', 'put']).optional(),
      }))
      .query(async ({ input }) => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.getOptionsChain({
          underlyingSymbol: input.symbol,
          expirationDate: input.expirationDate ? new Date(input.expirationDate) : undefined,
          strikePrice: input.strikePrice,
          type: input.optionType as any,
        });
      }),

    getOptionContract: protectedProcedure
      .input(z.object({
        contractId: z.string(),
      }))
      .query(async ({ input }) => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.getOptionContract(input.contractId);
      }),

    // Crypto Trading
    getCryptoQuote: protectedProcedure
      .input(z.object({
        symbol: z.string(),
      }))
      .query(async ({ input }) => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.getCryptoQuote(input.symbol);
      }),

    getCryptoBars: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        timeframe: z.enum(['1Min', '5Min', '15Min', '30Min', '1Hour', '4Hour', '1Day', '1Week', '1Month']),
        start: z.string().optional(),
        end: z.string().optional(),
        limit: z.number().max(10000).optional(),
      }))
      .query(async ({ input }) => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.getCryptoBars(input.symbol, input.timeframe, {
          start: input.start,
          end: input.end,
          limit: input.limit,
        });
      }),

    getCryptoTrades: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        start: z.string().optional(),
        end: z.string().optional(),
        limit: z.number().max(10000).optional(),
      }))
      .query(async ({ input }) => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.getCryptoTrades(input.symbol, {
          start: input.start,
          end: input.end,
          limit: input.limit,
        });
      }),

    getCryptoSnapshot: protectedProcedure
      .input(z.object({
        symbol: z.string(),
      }))
      .query(async ({ input }) => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.getCryptoSnapshot(input.symbol);
      }),

    // News Feed
    getNews: protectedProcedure
      .input(z.object({
        symbols: z.array(z.string()).optional(),
        start: z.string().optional(),
        end: z.string().optional(),
        limit: z.number().max(50).optional(),
        includeContent: z.boolean().optional(),
      }))
      .query(async ({ input }) => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.getNews(input.symbols, input.limit);
      }),

    // AI-Powered News Sentiment Analysis
    analyzeNewsSentiment: protectedProcedure
      .input(z.object({
        articles: z.array(z.object({
          id: z.string(),
          headline: z.string(),
        })),
      }))
      .mutation(async ({ input }) => {
        const { analyzeNewsBatchSentiment } = await import('./services/newsSentimentAnalysis');
        return analyzeNewsBatchSentiment(input.articles);
      }),

    // Quick keyword-based sentiment (no LLM, instant)
    getQuickSentiment: publicProcedure
      .input(z.object({
        headline: z.string(),
      }))
      .query(async ({ input }) => {
        const { analyzeKeywordSentiment } = await import('./services/newsSentimentAnalysis');
        return analyzeKeywordSentiment(input.headline);
      }),

    // Sentiment Trend Data
    getSentimentTrend: protectedProcedure
      .input(z.object({
        period: z.enum(['24h', '7d']),
      }))
      .query(async ({ input }) => {
        const { getSentimentTrendWithFallback } = await import('./services/sentimentTrendService');
        return getSentimentTrendWithFallback(input.period);
      }),

    // Record sentiment for trend tracking
    recordSentimentForTrend: protectedProcedure
      .input(z.object({
        articles: z.array(z.object({
          id: z.string(),
          sentiment: z.enum(['bullish', 'bearish', 'neutral']),
          timestamp: z.number().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        const { recordSentimentBatch } = await import('./services/sentimentTrendService');
        recordSentimentBatch(input.articles);
        return { success: true, recorded: input.articles.length };
      }),

    // Trading - Orders
    placeOrder: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        quantity: z.number(),
        side: z.enum(['buy', 'sell']),
        type: z.enum(['market', 'limit', 'stop', 'stop_limit', 'trailing_stop']),
        timeInForce: z.enum(['day', 'gtc', 'opg', 'cls', 'ioc', 'fok']),
        limitPrice: z.number().optional(),
        stopPrice: z.number().optional(),
        trailPercent: z.number().optional(),
        trailPrice: z.number().optional(),
        extendedHours: z.boolean().optional(),
        clientOrderId: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.placeOrder({
          symbol: input.symbol,
          quantity: input.quantity,
          side: input.side as any,
          type: input.type as any,
          timeInForce: input.timeInForce as any,
          price: input.limitPrice,
          stopPrice: input.stopPrice,
          trailPercent: input.trailPercent,
          extendedHours: input.extendedHours,
          clientOrderId: input.clientOrderId,
        });
      }),

    placeBracketOrder: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        quantity: z.number(),
        side: z.enum(['buy', 'sell']),
        type: z.enum(['market', 'limit']),
        timeInForce: z.enum(['day', 'gtc']),
        limitPrice: z.number().optional(),
        takeProfitLimitPrice: z.number(),
        stopLossStopPrice: z.number(),
        stopLossLimitPrice: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.placeBracketOrder(input);
      }),

    placeOCOOrder: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        quantity: z.number(),
        side: z.enum(['buy', 'sell']),
        takeProfitLimitPrice: z.number(),
        stopLossStopPrice: z.number(),
        stopLossLimitPrice: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.placeOCOOrder(input);
      }),

    modifyOrder: protectedProcedure
      .input(z.object({
        orderId: z.string(),
        quantity: z.number().optional(),
        limitPrice: z.number().optional(),
        stopPrice: z.number().optional(),
        trailPercent: z.number().optional(),
        timeInForce: z.enum(['day', 'gtc', 'opg', 'cls', 'ioc', 'fok']).optional(),
      }))
      .mutation(async ({ input }) => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.modifyOrder({ orderId: input.orderId, quantity: input.quantity, price: input.limitPrice, stopPrice: input.stopPrice, trailPercent: input.trailPercent, timeInForce: input.timeInForce as any });
      }),

    cancelOrder: protectedProcedure
      .input(z.object({
        orderId: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.cancelOrder(input.orderId);
      }),

    cancelAllOrders: protectedProcedure
      .mutation(async () => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.cancelAllOrders();
      }),

    getOrder: protectedProcedure
      .input(z.object({
        orderId: z.string(),
      }))
      .query(async ({ input }) => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.getOrder(input.orderId);
      }),

    getOrders: protectedProcedure
      .input(z.object({
        connectionId: z.string().optional(),
        status: z.enum(['open', 'closed', 'all']).optional(),
        limit: z.number().max(500).optional(),
        after: z.string().optional(),
        until: z.string().optional(),
        direction: z.enum(['asc', 'desc']).optional(),
        symbols: z.array(z.string()).optional(),
      }))
      .query(async ({ input }) => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.getOrders(input.status as any, input.limit, input.after ? new Date(input.after) : undefined);
      }),

    // Trading - Positions
    getPosition: protectedProcedure
      .input(z.object({
        symbol: z.string(),
      }))
      .query(async ({ input }) => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.getPosition(input.symbol);
      }),

    getPositions: protectedProcedure
      .input(z.object({ connectionId: z.string().optional() }))
      .query(async ({ input }) => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.getPositions();
      }),

    closePosition: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        quantity: z.number().optional(),
        percentage: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.closePosition(input.symbol, input.quantity, input.percentage);
      }),

    closeAllPositions: protectedProcedure
      .input(z.object({
        cancelOrders: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.closeAllPositions();
      }),

    // Account
    getAccount: protectedProcedure
      .input(z.object({ connectionId: z.string() }))
      .query(async ({ input }) => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.getAccount();
      }),

    getAccountBalance: protectedProcedure
      .query(async () => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.getAccountBalance();
      }),

    getPortfolioHistory: protectedProcedure
      .input(z.object({
        period: z.enum(['1D', '1W', '1M', '3M', '6M', '1A', 'all']).optional(),
        timeframe: z.enum(['1Min', '5Min', '15Min', '1H', '1D']).optional(),
        dateEnd: z.string().optional(),
        extendedHours: z.boolean().optional(),
      }))
      .query(async ({ input }) => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.getPortfolioHistory(input.period, input.timeframe);
      }),

    // Assets
    getAsset: protectedProcedure
      .input(z.object({
        symbol: z.string(),
      }))
      .query(async ({ input }) => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.getAsset(input.symbol);
      }),

    getAssets: protectedProcedure
      .input(z.object({
        status: z.enum(['active', 'inactive']).optional(),
        assetClass: z.enum(['us_equity', 'crypto']).optional(),
        exchange: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.getAssets(input.assetClass as any);
      }),

    // Calendar & Clock
    getClock: protectedProcedure
      .query(async () => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.getClock();
      }),

    getCalendar: protectedProcedure
      .input(z.object({
        start: z.string().optional(),
        end: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.getCalendar(input.start, input.end);
      }),

    // Last Closing Prices (for when market is closed)
    getLastClosingPrices: protectedProcedure
      .input(z.object({
        symbols: z.array(z.string()),
      }))
      .query(async ({ input }) => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        
        const results = await Promise.all(
          input.symbols.map(async (symbol) => {
            try {
              // Get the latest bar data which includes close prices
              // Calculate start date as 7 days ago to ensure we get at least 2 trading days
              const startDate = new Date();
              startDate.setDate(startDate.getDate() - 7);
              
              const bars = await adapter.getBars({
                symbol,
                timeframe: '1Day',
                start: startDate,
                limit: 5, // Get last 5 days to ensure we have enough data
              });
              
              if (bars.length >= 1) {
                const latestBar = bars[bars.length - 1];
                const previousBar = bars.length >= 2 ? bars[bars.length - 2] : null;
                
                const close = latestBar.close;
                const previousClose = previousBar?.close || latestBar.open;
                const change = close - previousClose;
                const changePercent = previousClose ? (change / previousClose) * 100 : 0;
                
                return {
                  symbol: symbol.toUpperCase(),
                  close,
                  previousClose,
                  change,
                  changePercent,
                  volume: latestBar.volume,
                  timestamp: latestBar.timestamp,
                };
              }
              return null;
            } catch (error) {
              console.error(`Error fetching closing price for ${symbol}:`, error);
              return null;
            }
          })
        );
        
        return results.filter((r): r is NonNullable<typeof r> => r !== null);
      }),

    // Watchlists
    getWatchlists: protectedProcedure
      .query(async () => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.getWatchlists();
      }),

    createWatchlist: protectedProcedure
      .input(z.object({
        name: z.string(),
        symbols: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.createWatchlist(input.name, input.symbols);
      }),

    updateWatchlist: protectedProcedure
      .input(z.object({
        watchlistId: z.string(),
        name: z.string().optional(),
        symbols: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.updateWatchlist(input.watchlistId, input.name, input.symbols);
      }),

    deleteWatchlist: protectedProcedure
      .input(z.object({
        watchlistId: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.deleteWatchlist(input.watchlistId);
      }),

    // Broker Capabilities
    getCapabilities: protectedProcedure
      .query(async () => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        return adapter.getCapabilities();
      }),

    // Connection Test
    testConnection: protectedProcedure
      .input(z.object({ connectionId: z.string() }))
      .mutation(async ({ input }) => {
        const { AlpacaBrokerAdapter } = await import('./services/brokers/AlpacaBrokerAdapter');
        const adapter = new AlpacaBrokerAdapter();
        const result = await adapter.testConnection();
        return { success: result.success, error: result.success ? undefined : result.message };
      }),
  }),

  // ==================== ORDER ROUTING PREFERENCES ====================
  routing: router({
    // Get user's routing preferences
    getPreferences: protectedProcedure
      .query(async ({ ctx }) => {
        const { getDb } = await import('./db');
        const { userRoutingPreferences } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        
        const prefs = await db.select().from(userRoutingPreferences)
          .where(eq(userRoutingPreferences.userId, String(ctx.user.id)))
          .limit(1);
        
        if (prefs.length === 0) {
          // Return default preferences matching schema column names
          return {
            enableSmartRouting: true,
            preferredStockBroker: null,
            preferredCryptoBroker: null,
            preferredForexBroker: null,
            preferredOptionsBroker: null,
            allowFallback: true,
            prioritizeLowFees: false,
            prioritizeFastExecution: false,
          };
        }
        
        return prefs[0];
      }),

    // Save user's routing preferences
    savePreferences: protectedProcedure
      .input(z.object({
        smartRoutingEnabled: z.boolean(),
        preferredStockBroker: z.string().nullable().optional(),
        preferredCryptoBroker: z.string().nullable().optional(),
        preferredForexBroker: z.string().nullable().optional(),
        preferredOptionsBroker: z.string().nullable().optional(),
        preferredFuturesBroker: z.string().nullable().optional(),
        fallbackEnabled: z.boolean().optional(),
        costOptimization: z.boolean().optional(),
        speedPriority: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import('./db');
        const { userRoutingPreferences } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        
        // Check if preferences exist
        const existing = await db.select().from(userRoutingPreferences)
          .where(eq(userRoutingPreferences.userId, String(ctx.user.id)))
          .limit(1);
        
        const now = new Date();
        
        if (existing.length === 0) {
          // Insert new preferences - use correct column names from schema
          await db.insert(userRoutingPreferences).values({
            userId: String(ctx.user.id),
            enableSmartRouting: input.smartRoutingEnabled ?? true,
            preferredStockBroker: (input.preferredStockBroker as 'alpaca' | 'interactive_brokers') || null,
            preferredCryptoBroker: (input.preferredCryptoBroker as 'binance' | 'coinbase' | 'alpaca') || null,
            preferredForexBroker: (input.preferredForexBroker as 'interactive_brokers') || null,
            preferredOptionsBroker: (input.preferredOptionsBroker as 'interactive_brokers') || null,
            allowFallback: input.fallbackEnabled ?? true,
            prioritizeLowFees: input.costOptimization ?? false,
            prioritizeFastExecution: input.speedPriority ?? false,
            createdAt: now,
            updatedAt: now,
          });
        } else {
          // Update existing preferences - use correct column names from schema
          await db.update(userRoutingPreferences)
            .set({
              enableSmartRouting: input.smartRoutingEnabled ?? true,
              preferredStockBroker: (input.preferredStockBroker as 'alpaca' | 'interactive_brokers') || null,
              preferredCryptoBroker: (input.preferredCryptoBroker as 'binance' | 'coinbase' | 'alpaca') || null,
              preferredForexBroker: (input.preferredForexBroker as 'interactive_brokers') || null,
              preferredOptionsBroker: (input.preferredOptionsBroker as 'interactive_brokers') || null,
              allowFallback: input.fallbackEnabled ?? true,
              prioritizeLowFees: input.costOptimization ?? false,
              prioritizeFastExecution: input.speedPriority ?? false,
              updatedAt: now,
            })
            .where(eq(userRoutingPreferences.userId, String(ctx.user.id)));
        }
        
        return { success: true };
      }),

    // Get routing recommendation for a symbol
    getRecommendation: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        orderType: z.enum(['market', 'limit', 'stop', 'stop_limit']).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const { orderRouter, detectAssetClass } = await import('./services/brokers/OrderRouter');
        const { getDb } = await import('./db');
        const { brokerConnections } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        
        const db = await getDb();
        if (!db) return { selectedBroker: null, confidence: 0, reason: 'Database not available', assetClass: 'unknown', connectedBrokers: [] };
        const connections = await db.select().from(brokerConnections)
          .where(eq(brokerConnections.userId, String(ctx.user.id)));
        const assetClass = detectAssetClass(input.symbol);
        
        const recommendation = orderRouter.selectBroker(
          input.symbol,
          {
            enableSmartRouting: true,
            allowFallback: true,
            prioritizeLowFees: false,
            prioritizeFastExecution: true,
          }
        );
        
        return {
          ...recommendation,
          assetClass,
          connectedBrokers: connections.map((c: any) => ({
            id: String(c.id),
            brokerType: c.brokerType,
            isActive: c.isActive,
          })),
        };
      }),

    // Get available brokers for each asset class
    getAvailableBrokers: protectedProcedure
      .query(async ({ ctx }) => {
        const { getDb } = await import('./db');
        const { brokerConnections } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        
        const db = await getDb();
        if (!db) return { stocks: [], crypto: [], forex: [], options: [], futures: [] };
        const connections = await db.select().from(brokerConnections)
          .where(eq(brokerConnections.userId, String(ctx.user.id)));
        
        const brokerCapabilities: Record<string, string[]> = {
          alpaca: ['stocks', 'crypto'],
          interactive_brokers: ['stocks', 'options', 'futures', 'forex'],
          binance: ['crypto'],
          coinbase: ['crypto'],
        };
        
        const result: Record<string, Array<{ id: string; brokerType: string; isActive: boolean }>> = {
          stocks: [],
          crypto: [],
          forex: [],
          options: [],
          futures: [],
        };
        
        for (const conn of connections as any[]) {
          const capabilities = brokerCapabilities[conn.brokerType] || [];
          for (const cap of capabilities) {
            if (result[cap]) {
              result[cap].push({
                id: String(conn.id),
                brokerType: conn.brokerType,
                isActive: conn.isActive,
              });
            }
          }
        }
        
        return result;
      }),
  }),

  // ==================== MULTI-ASSET ANALYSIS ====================
  multiAsset: router({
    // Analyze any asset type (stock, crypto, options, forex, commodity)
    analyze: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        assetType: z.enum(['stock', 'crypto', 'options', 'forex', 'commodity']),
        currentPrice: z.number(),
        priceChange24h: z.number(),
        priceChange7d: z.number().optional(),
        volume24h: z.number(),
        marketCap: z.number().optional(),
        stockData: z.object({
          sector: z.string(),
          industry: z.string(),
          peRatio: z.number().optional(),
          earningsGrowth: z.number().optional(),
          dividendYield: z.number().optional(),
        }).optional(),
        cryptoData: z.object({
          symbol: z.string(),
          category: z.enum(['layer1', 'layer2', 'defi', 'nft', 'gaming', 'meme', 'stablecoin', 'unknown']),
          currentPrice: z.number(),
          priceChange24h: z.number(),
          priceChange7d: z.number(),
          volume24h: z.number(),
          marketCap: z.number(),
        }).optional(),
        optionsData: z.object({
          symbol: z.string(),
          underlyingPrice: z.number(),
          greeks: z.object({
            delta: z.number(),
            gamma: z.number(),
            theta: z.number(),
            vega: z.number(),
            rho: z.number(),
            impliedVolatility: z.number(),
            historicalVolatility: z.number(),
            ivRank: z.number(),
            ivPercentile: z.number(),
            openInterest: z.number(),
            volume: z.number(),
            bid: z.number(),
            ask: z.number(),
            lastPrice: z.number(),
            bidAskSpread: z.number(),
            strikePrice: z.number(),
            underlyingPrice: z.number(),
            daysToExpiry: z.number(),
            optionType: z.enum(['call', 'put']),
          }),
        }).optional(),
        forexData: z.object({
          baseCurrency: z.string(),
          quoteCurrency: z.string(),
          interestRateDiff: z.number(),
          centralBankBias: z.enum(['hawkish', 'neutral', 'dovish']),
          cotPositioning: z.number(),
        }).optional(),
        commodityData: z.object({
          commodityType: z.enum(['energy', 'metals', 'agriculture', 'livestock']),
          inventoryLevels: z.number(),
          seasonalPattern: z.number(),
          supplyDisruption: z.boolean(),
        }).optional(),
      }))
      .mutation(async ({ input }) => {
        const { UnifiedMultiAssetOrchestrator } = await import('./services/ai-agents/UnifiedMultiAssetOrchestrator');
        const orchestrator = new UnifiedMultiAssetOrchestrator();
        return orchestrator.analyze(input);
      }),

    // Analyze portfolio across multiple asset types
    analyzePortfolio: protectedProcedure
      .input(z.object({
        assets: z.array(z.object({
          symbol: z.string(),
          assetType: z.enum(['stock', 'crypto', 'options', 'forex', 'commodity']),
          currentPrice: z.number(),
          priceChange24h: z.number(),
          priceChange7d: z.number().optional(),
          volume24h: z.number(),
          marketCap: z.number().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        const { UnifiedMultiAssetOrchestrator } = await import('./services/ai-agents/UnifiedMultiAssetOrchestrator');
        const orchestrator = new UnifiedMultiAssetOrchestrator();
        return orchestrator.analyzePortfolio(input.assets);
      }),

    // Detect asset type from symbol
    detectAssetType: publicProcedure
      .input(z.object({ symbol: z.string() }))
      .query(async ({ input }) => {
        const { detectAssetType } = await import('./services/ai-agents/UnifiedMultiAssetOrchestrator');
        return { assetType: detectAssetType(input.symbol) };
      }),
  }),

  // Real-time price feed router
  realtimePrices: router({
    // Get current price for a single symbol
    getPrice: publicProcedure
      .input(z.object({
        symbol: z.string(),
      }))
      .query(async ({ input }) => {
        const { realtimePriceFeed, detectAssetTypeFromSymbol, generateSimulatedPrice } = await import('./services/realtimePriceFeed');
        const price = realtimePriceFeed.getPrice(input.symbol);
        if (price) return price;
        
        // Generate fresh price if not cached
        const assetType = detectAssetTypeFromSymbol(input.symbol);
        const { generateSimulatedPrice: genPrice } = await import('./services/realtimePriceFeed');
        return genPrice(input.symbol, assetType);
      }),

    // Get prices for multiple symbols
    getPrices: publicProcedure
      .input(z.object({
        symbols: z.array(z.string()),
      }))
      .query(async ({ input }) => {
        const { getAggregatedPrices, detectAssetTypeFromSymbol } = await import('./services/realtimePriceFeed');
        
        // Group symbols by asset type
        const grouped: { stocks: string[]; crypto: string[]; forex: string[]; commodities: string[] } = {
          stocks: [],
          crypto: [],
          forex: [],
          commodities: [],
        };
        
        input.symbols.forEach(symbol => {
          const assetType = detectAssetTypeFromSymbol(symbol);
          switch (assetType) {
            case 'stock': grouped.stocks.push(symbol); break;
            case 'crypto': grouped.crypto.push(symbol); break;
            case 'forex': grouped.forex.push(symbol); break;
            case 'commodity': grouped.commodities.push(symbol); break;
          }
        });
        
        const aggregated = getAggregatedPrices(grouped);
        
        // Flatten to a single array
        return {
          prices: [
            ...aggregated.stocks,
            ...aggregated.crypto,
            ...aggregated.forex,
            ...aggregated.commodities,
          ],
          timestamp: aggregated.timestamp,
        };
      }),

    // Get aggregated prices by asset type
    getAggregatedPrices: publicProcedure
      .input(z.object({
        stocks: z.array(z.string()).optional(),
        crypto: z.array(z.string()).optional(),
        forex: z.array(z.string()).optional(),
        commodities: z.array(z.string()).optional(),
      }))
      .query(async ({ input }) => {
        const { getAggregatedPrices } = await import('./services/realtimePriceFeed');
        return getAggregatedPrices(input);
      }),

    // Get default watchlist
    getDefaultWatchlist: publicProcedure
      .query(async () => {
        const { DEFAULT_WATCHLIST } = await import('./services/realtimePriceFeed');
        return DEFAULT_WATCHLIST;
      }),

    // Subscribe to price updates (initializes the feed)
    subscribe: protectedProcedure
      .input(z.object({
        symbols: z.array(z.string()),
      }))
      .mutation(async ({ input }) => {
        const { realtimePriceFeed, detectAssetTypeFromSymbol } = await import('./services/realtimePriceFeed');
        
        input.symbols.forEach(symbol => {
          const assetType = detectAssetTypeFromSymbol(symbol);
          realtimePriceFeed.subscribe({ symbol, assetType });
        });
        
        return { subscribed: input.symbols, status: 'active' };
      }),

    // Unsubscribe from price updates
    unsubscribe: protectedProcedure
      .input(z.object({
        symbols: z.array(z.string()),
      }))
      .mutation(async ({ input }) => {
        const { realtimePriceFeed } = await import('./services/realtimePriceFeed');
        
        input.symbols.forEach(symbol => {
          realtimePriceFeed.unsubscribe(symbol);
        });
        
        return { unsubscribed: input.symbols };
      }),

    // Get feed service status
    getStatus: publicProcedure
      .query(async () => {
        const { realtimePriceFeed } = await import('./services/realtimePriceFeed');
        return realtimePriceFeed.getStatus();
      }),

    // Force refresh price for a symbol
    refreshPrice: publicProcedure
      .input(z.object({ symbol: z.string() }))
      .mutation(async ({ input }) => {
        const { realtimePriceFeed } = await import('./services/realtimePriceFeed');
        return realtimePriceFeed.refreshPrice(input.symbol);
      }),
  }),

  // Cross-Asset Correlation Router
  correlation: router({
    // Get correlation matrix for specified assets
    getMatrix: publicProcedure
      .input(z.object({
        symbols: z.array(z.string()).min(2).max(20),
        assetTypes: z.array(z.enum(['stock', 'crypto', 'forex', 'commodity', 'option'])).optional(),
        period: z.enum(['24h', '7d', '30d']).default('7d'),
      }))
      .query(async ({ input }) => {
        const correlationService = await import('./services/correlationService');
        
        // Get or generate price histories for requested symbols
        const assets = input.symbols.map((symbol, index) => {
          const assetType = input.assetTypes?.[index] || 'stock';
          let history = correlationService.getPriceHistory(symbol, assetType);
          
          if (!history) {
            // Generate simulated data if not in cache
            const basePrice = assetType === 'crypto' ? 1000 + Math.random() * 50000 : 100 + Math.random() * 400;
            const volatility = assetType === 'crypto' ? 0.03 : 0.015;
            history = correlationService.generateSimulatedPriceHistory(symbol, assetType, basePrice, volatility);
          }
          
          return history;
        });
        
        return correlationService.calculateCorrelationMatrix(assets, input.period);
      }),

    // Get correlation between two specific assets
    getPairCorrelation: publicProcedure
      .input(z.object({
        asset1: z.object({
          symbol: z.string(),
          assetType: z.enum(['stock', 'crypto', 'forex', 'commodity', 'option']),
        }),
        asset2: z.object({
          symbol: z.string(),
          assetType: z.enum(['stock', 'crypto', 'forex', 'commodity', 'option']),
        }),
        period: z.enum(['24h', '7d', '30d']).default('7d'),
      }))
      .query(async ({ input }) => {
        const correlationService = await import('./services/correlationService');
        
        let history1 = correlationService.getPriceHistory(input.asset1.symbol, input.asset1.assetType);
        let history2 = correlationService.getPriceHistory(input.asset2.symbol, input.asset2.assetType);
        
        if (!history1) {
          const basePrice = input.asset1.assetType === 'crypto' ? 10000 : 150;
          history1 = correlationService.generateSimulatedPriceHistory(
            input.asset1.symbol, input.asset1.assetType, basePrice, 0.02
          );
        }
        
        if (!history2) {
          const basePrice = input.asset2.assetType === 'crypto' ? 10000 : 150;
          history2 = correlationService.generateSimulatedPriceHistory(
            input.asset2.symbol, input.asset2.assetType, basePrice, 0.02
          );
        }
        
        return correlationService.calculateAssetCorrelation(history1, history2, input.period);
      }),

    // Seed demo correlation data
    seedDemoData: publicProcedure
      .mutation(async () => {
        const correlationService = await import('./services/correlationService');
        correlationService.seedDemoCorrelationData();
        return { success: true, message: 'Demo correlation data seeded successfully' };
      }),

    // Get available assets with price history
    getAvailableAssets: publicProcedure
      .query(async () => {
        const correlationService = await import('./services/correlationService');
        const assets = correlationService.getCachedAssets();
        return assets.map(a => ({
          symbol: a.symbol,
          assetType: a.assetType,
          dataPoints: a.prices.length,
          latestPrice: a.prices[a.prices.length - 1]?.price || 0,
          oldestTimestamp: a.prices[0]?.timestamp || 0,
          newestTimestamp: a.prices[a.prices.length - 1]?.timestamp || 0,
        }));
      }),

    // Get correlation color for visualization
    getCorrelationColor: publicProcedure
      .input(z.object({ correlation: z.number().min(-1).max(1) }))
      .query(async ({ input }) => {
        const correlationService = await import('./services/correlationService');
        return {
          color: correlationService.getCorrelationColor(input.correlation),
          strength: correlationService.getCorrelationStrength(input.correlation),
        };
      }),

    // Clear correlation cache
    clearCache: protectedProcedure
      .mutation(async () => {
        const correlationService = await import('./services/correlationService');
        correlationService.clearPriceHistoryCache();
        return { success: true, message: 'Correlation cache cleared' };
      }),
  }),

  // Portfolio Optimizer Router
  portfolioOptimizer: router({
    // Get sample assets for optimization
    getSampleAssets: publicProcedure
      .query(async () => {
        const optimizer = await import('./services/portfolioOptimizer');
        return optimizer.generateSampleAssets();
      }),

    // Optimize portfolio based on risk profile
    optimize: protectedProcedure
      .input(z.object({
        assets: z.array(z.object({
          symbol: z.string(),
          name: z.string(),
          assetType: z.enum(['stock', 'crypto', 'forex', 'commodity', 'bond']),
          expectedReturn: z.number(),
          volatility: z.number(),
          currentPrice: z.number(),
        })),
        riskProfile: z.enum(['conservative', 'moderate', 'balanced', 'growth', 'aggressive']),
        iterations: z.number().optional().default(10000),
      }))
      .mutation(async ({ input }) => {
        const optimizer = await import('./services/portfolioOptimizer');
        return optimizer.optimizePortfolio(input.assets, input.riskProfile, input.iterations);
      }),

    // Generate efficient frontier
    getEfficientFrontier: protectedProcedure
      .input(z.object({
        assets: z.array(z.object({
          symbol: z.string(),
          name: z.string(),
          assetType: z.enum(['stock', 'crypto', 'forex', 'commodity', 'bond']),
          expectedReturn: z.number(),
          volatility: z.number(),
          currentPrice: z.number(),
        })),
        points: z.number().optional().default(50),
      }))
      .mutation(async ({ input }) => {
        const optimizer = await import('./services/portfolioOptimizer');
        return optimizer.generateEfficientFrontier(input.assets, input.points);
      }),

    // Run Monte Carlo simulation
    runMonteCarloSimulation: protectedProcedure
      .input(z.object({
        expectedReturn: z.number(),
        expectedVolatility: z.number(),
        initialValue: z.number(),
        yearsToProject: z.number().optional().default(5),
        simulations: z.number().optional().default(10000),
        targetReturn: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const optimizer = await import('./services/portfolioOptimizer');
        const portfolio = {
          allocations: [],
          expectedReturn: input.expectedReturn,
          expectedVolatility: input.expectedVolatility,
          sharpeRatio: 0,
          riskProfile: 'balanced' as const,
          diversificationScore: 0,
          efficientFrontierPosition: 'optimal' as const,
        };
        return optimizer.runMonteCarloSimulation(
          portfolio,
          input.initialValue,
          input.yearsToProject,
          input.simulations,
          input.targetReturn
        );
      }),

    // Calculate rebalancing recommendations
    getRebalancingRecommendations: protectedProcedure
      .input(z.object({
        currentAllocations: z.array(z.object({
          symbol: z.string(),
          weight: z.number(),
        })),
        targetAllocations: z.array(z.object({
          symbol: z.string(),
          name: z.string(),
          assetType: z.string(),
          weight: z.number(),
          expectedContribution: z.number(),
        })),
        threshold: z.number().optional().default(0.05),
      }))
      .mutation(async ({ input }) => {
        const optimizer = await import('./services/portfolioOptimizer');
        return optimizer.calculateRebalancing(
          input.currentAllocations,
          input.targetAllocations,
          input.threshold
        );
      }),

    // Get risk profile description
    getRiskProfileDescription: publicProcedure
      .input(z.object({
        profile: z.enum(['conservative', 'moderate', 'balanced', 'growth', 'aggressive']),
      }))
      .query(async ({ input }) => {
        const optimizer = await import('./services/portfolioOptimizer');
        return optimizer.getRiskProfileDescription(input.profile);
      }),

     // Get all risk profiles
    getAllRiskProfiles: publicProcedure
      .query(async () => {
        const optimizer = await import('./services/portfolioOptimizer');
        const profiles = ['conservative', 'moderate', 'balanced', 'growth', 'aggressive'] as const;
        return profiles.map(p => ({
          id: p,
          ...optimizer.getRiskProfileDescription(p),
        }));
      }),
  }),

  // ==================== EARNINGS SENTIMENT BACKTESTING ====================
  earningsBacktest: router({
    // Run a full backtest on earnings sentiment vs price movements
    runBacktest: protectedProcedure
      .input(z.object({
        symbols: z.array(z.string().min(1).max(10)).min(1).max(50),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        minSampleSize: z.number().min(5).max(1000).default(10),
        confidenceLevel: z.number().min(0.8).max(0.99).default(0.95),
        timeframes: z.array(z.enum(['1d', '3d', '5d', '10d', '30d'])).default(['1d', '3d', '5d', '10d', '30d']),
      }))
      .mutation(async ({ input }) => {
        const { EarningsSentimentBacktester } = await import('./services/backtesting/EarningsSentimentBacktester');
        const backtester = new EarningsSentimentBacktester();
        return backtester.runBacktest({
          symbols: input.symbols,
          startDate: input.startDate,
          endDate: input.endDate,
          minimumSampleSize: input.minSampleSize,
          confidenceLevel: input.confidenceLevel,
          timeframes: input.timeframes,
          includeSectorAnalysis: false,
          includeMarketCapAnalysis: false,
          benchmarkSymbol: 'SPY',
        });
      }),

    // Get correlation analysis for a single symbol
    analyzeSymbol: protectedProcedure
      .input(z.object({
        symbol: z.string().min(1).max(10),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }))
      .mutation(async ({ input }) => {
        const { EarningsSentimentBacktester } = await import('./services/backtesting/EarningsSentimentBacktester');
        const backtester = new EarningsSentimentBacktester();
        return backtester.runBacktest({
          symbols: [input.symbol],
          startDate: input.startDate,
          endDate: input.endDate,
          minimumSampleSize: 5,
          confidenceLevel: 0.95,
          timeframes: ['1d', '3d', '5d', '10d', '30d'],
          includeSectorAnalysis: false,
          includeMarketCapAnalysis: false,
          benchmarkSymbol: 'SPY',
        });
      }),

    // Get demo backtest results (pre-computed for demonstration)
    getDemoResults: publicProcedure
      .query(async () => {
        // Return pre-computed demo results for display
        return {
          summary: {
            totalEarningsEvents: 156,
            symbolsAnalyzed: 10,
            dateRange: { start: '2023-01-01', end: '2025-12-31' },
            overallCorrelation: 0.42,
            bestTimeframe: '3d',
            predictionAccuracy: 0.68,
          },
          correlationMatrix: {
            factors: ['overall', 'managementOptimism', 'managementConfidence', 'analystSatisfaction', 'guidanceStrength'],
            timeframes: ['1d', '3d', '5d', '10d', '30d'],
            correlations: [
              [0.35, 0.42, 0.38, 0.32, 0.28],
              [0.38, 0.45, 0.41, 0.35, 0.30],
              [0.32, 0.40, 0.36, 0.30, 0.25],
              [0.28, 0.35, 0.32, 0.27, 0.22],
              [0.40, 0.48, 0.44, 0.38, 0.32],
            ],
            pValues: [
              [0.02, 0.01, 0.02, 0.04, 0.08],
              [0.01, 0.005, 0.01, 0.03, 0.06],
              [0.03, 0.02, 0.02, 0.05, 0.10],
              [0.05, 0.03, 0.04, 0.07, 0.12],
              [0.01, 0.003, 0.008, 0.02, 0.05],
            ],
          },
          signalPerformance: {
            bullishSignals: { count: 62, accuracy: 0.72, avgReturn: 4.2 },
            bearishSignals: { count: 48, accuracy: 0.65, avgReturn: -3.8 },
            neutralSignals: { count: 46, accuracy: 0.58, avgReturn: 0.8 },
          },
          topPredictors: [
            { factor: 'guidanceStrength', correlation: 0.48, pValue: 0.003, significance: 'high' },
            { factor: 'managementOptimism', correlation: 0.45, pValue: 0.005, significance: 'high' },
            { factor: 'overall', correlation: 0.42, pValue: 0.01, significance: 'high' },
            { factor: 'managementConfidence', correlation: 0.40, pValue: 0.02, significance: 'medium' },
            { factor: 'analystSatisfaction', correlation: 0.35, pValue: 0.03, significance: 'medium' },
          ],
          sampleResults: [
            { symbol: 'AAPL', date: '2024-10-31', sentiment: 0.72, return1d: 2.1, return3d: 4.5, return5d: 3.8 },
            { symbol: 'MSFT', date: '2024-10-22', sentiment: 0.68, return1d: 1.8, return3d: 3.2, return5d: 2.9 },
            { symbol: 'GOOGL', date: '2024-10-29', sentiment: 0.55, return1d: -0.5, return3d: 1.2, return5d: 0.8 },
            { symbol: 'NVDA', date: '2024-11-20', sentiment: 0.85, return1d: 5.2, return3d: 8.1, return5d: 7.5 },
            { symbol: 'META', date: '2024-10-30', sentiment: 0.78, return1d: 3.5, return3d: 5.8, return5d: 4.9 },
            { symbol: 'AMZN', date: '2024-10-31', sentiment: 0.62, return1d: 1.2, return3d: 2.5, return5d: 2.1 },
            { symbol: 'TSLA', date: '2024-10-23', sentiment: 0.45, return1d: -2.8, return3d: -4.2, return5d: -3.5 },
            { symbol: 'AMD', date: '2024-10-29', sentiment: 0.58, return1d: 0.8, return3d: 1.5, return5d: 1.2 },
          ],
          insights: [
            'Guidance strength shows the strongest predictive power for 3-day returns (r=0.48, p<0.01)',
            'Management optimism is a reliable indicator, especially for tech stocks',
            'Bearish signals have lower accuracy but higher magnitude returns',
            'The 3-day timeframe consistently shows the strongest correlations',
            'Analyst satisfaction has weaker predictive power than management tone',
          ],
        };
      }),

    // Calculate correlation between two arrays
    calculateCorrelation: protectedProcedure
      .input(z.object({
        sentimentScores: z.array(z.number()).min(3),
        priceReturns: z.array(z.number()).min(3),
      }))
      .mutation(async ({ input }) => {
        const { SentimentPriceCorrelation } = await import('./services/backtesting/SentimentPriceCorrelation');
        const engine = new SentimentPriceCorrelation();
        return engine.calculateCorrelation(input.sentimentScores, input.priceReturns);
      }),
  }),

  // ==================== SEC EDGAR FILINGS ====================
  secFilings: router({
    // List SEC filings for a ticker
    list: protectedProcedure
      .input(z.object({
        ticker: z.string().min(1).max(10),
        limit: z.number().min(1).max(50).default(20),
      }))
      .query(async ({ input }) => {
        return enhancedFundamentalAnalyst.listFilings(input.ticker, input.limit);
      }),

    // Get filing summary
    getSummary: protectedProcedure
      .input(z.object({
        ticker: z.string().min(1).max(10),
        filingType: z.enum(['10-K', '10-Q']).default('10-K'),
      }))
      .query(async ({ input }) => {
        return enhancedFundamentalAnalyst.getFilingSummary(input.ticker, input.filingType);
      }),

    // Get XBRL financial metrics
    getMetrics: protectedProcedure
      .input(z.object({
        ticker: z.string().min(1).max(10),
      }))
      .query(async ({ input }) => {
        return enhancedFundamentalAnalyst.getFinancialMetrics(input.ticker);
      }),

    // Ask a question about filings
    askQuestion: protectedProcedure
      .input(z.object({
        ticker: z.string().min(1).max(10),
        question: z.string().min(1).max(500),
      }))
      .mutation(async ({ input }) => {
        return enhancedFundamentalAnalyst.askQuestion(input.ticker, input.question);
      }),

    // Run enhanced fundamental analysis
    analyze: protectedProcedure
      .input(z.object({
        ticker: z.string().min(1).max(10),
      }))
      .mutation(async ({ input }) => {
        return enhancedFundamentalAnalyst.analyze(input.ticker);
      }),

    // Run deep dive analysis
    deepDive: protectedProcedure
      .input(z.object({
        ticker: z.string().min(1).max(10),
        focusAreas: z.array(z.enum(['risk_factors', 'mda', 'business', 'financials', 'compensation'])).optional(),
        compareYoY: z.boolean().optional(),
        specificQuestions: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        return enhancedFundamentalAnalyst.deepDive({
          ticker: input.ticker,
          focusAreas: input.focusAreas,
          compareYoY: input.compareYoY,
          specificQuestions: input.specificQuestions,
        });
      }),

    // Get company info from SEC
    getCompanyInfo: protectedProcedure
      .input(z.object({
        ticker: z.string().min(1).max(10),
      }))
      .query(async ({ input }) => {
        const cik = await secEdgarService.getCIKByTicker(input.ticker);
        if (!cik) return null;
        const submissions = await secEdgarService.getCompanySubmissions(cik);
        return submissions?.companyInfo || null;
      }),
  }),

  // ==================== AI COMMAND CENTER ====================
  commandCenter: router({
    // Get summary dashboard data
    getSummary: protectedProcedure
      .query(async () => {
        return commandCenterDataService.getSummary();
      }),

    // Get all agent statuses
    getAgentStatuses: protectedProcedure
      .query(async () => {
        return commandCenterDataService.getAgentStatuses();
      }),

    // Get aggregated signals with optional filters
    getSignals: protectedProcedure
      .input(z.object({
        assetClass: z.string().optional(),
        direction: z.enum(['bullish', 'bearish', 'neutral']).optional(),
        minConfidence: z.number().min(0).max(100).optional(),
        source: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return commandCenterDataService.getAggregatedSignals(input);
      }),

    // Get portfolio metrics
    getPortfolioMetrics: protectedProcedure
      .query(async () => {
        return commandCenterDataService.getPortfolioMetrics();
      }),

    // Get pending actions
    getPendingActions: protectedProcedure
      .query(async () => {
        return commandCenterDataService.getPendingActions();
      }),

    // Execute a signal
    executeSignal: protectedProcedure
      .input(z.object({
        signalId: z.string(),
        size: z.enum(['small', 'medium', 'large']).optional(),
        orderType: z.enum(['market', 'limit']).optional(),
        limitPrice: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return commandCenterDataService.executeSignal(input.signalId, {
          size: input.size,
          orderType: input.orderType,
          limitPrice: input.limitPrice,
        });
      }),

    // Process voice command
    processVoiceCommand: protectedProcedure
      .input(z.object({
        command: z.string().min(1).max(500),
      }))
      .mutation(async ({ input }) => {
        return commandCenterDataService.processVoiceCommand(input.command);
      }),

    // Approve pending action
    approveAction: protectedProcedure
      .input(z.object({
        actionId: z.string(),
      }))
      .mutation(async ({ input }) => {
        return commandCenterDataService.approveAction(input.actionId);
      }),

    // Reject pending action
    rejectAction: protectedProcedure
      .input(z.object({
        actionId: z.string(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return commandCenterDataService.rejectAction(input.actionId, input.reason);
      }),
  }),
});
export type AppRouter = typeof appRouter;
