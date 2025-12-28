import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with subscription and role management for SaaS platform.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // Subscription fields
  subscriptionTier: mysqlEnum("subscriptionTier", ["free", "starter", "pro", "elite"]).default("free").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  subscriptionStatus: mysqlEnum("subscriptionStatus", ["active", "canceled", "past_due", "trialing", "incomplete"]).default("active"),
  subscriptionEndsAt: timestamp("subscriptionEndsAt"),
  // Email verification
  isEmailVerified: boolean("isEmailVerified").default(false).notNull(),
  emailVerifiedAt: timestamp("emailVerifiedAt"),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Trading accounts - supports multi-tenant isolation
 * Each user can have multiple trading accounts (paper/live)
 */
export const tradingAccounts = mysqlTable("trading_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["paper", "live"]).default("paper").notNull(),
  balance: decimal("balance", { precision: 18, scale: 2 }).default("100000.00").notNull(),
  initialBalance: decimal("initialBalance", { precision: 18, scale: 2 }).default("100000.00").notNull(),
  currency: varchar("currency", { length: 10 }).default("USD").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  brokerConnection: json("brokerConnection"), // For live accounts
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TradingAccount = typeof tradingAccounts.$inferSelect;
export type InsertTradingAccount = typeof tradingAccounts.$inferInsert;

/**
 * Trading bots - AI-powered automated trading strategies
 */
export const tradingBots = mysqlTable("trading_bots", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  accountId: int("accountId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["active", "paused", "stopped", "error"]).default("stopped").notNull(),
  strategy: json("strategy").notNull(), // Strategy configuration
  symbols: json("symbols").notNull(), // Array of trading symbols
  riskSettings: json("riskSettings").notNull(), // Risk management config
  // Performance metrics
  totalTrades: int("totalTrades").default(0).notNull(),
  winningTrades: int("winningTrades").default(0).notNull(),
  totalPnl: decimal("totalPnl", { precision: 18, scale: 2 }).default("0.00").notNull(),
  sharpeRatio: decimal("sharpeRatio", { precision: 10, scale: 4 }),
  maxDrawdown: decimal("maxDrawdown", { precision: 10, scale: 4 }),
  // Marketplace
  isPublic: boolean("isPublic").default(false).notNull(),
  copyCount: int("copyCount").default(0).notNull(),
  rating: decimal("rating", { precision: 3, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TradingBot = typeof tradingBots.$inferSelect;
export type InsertTradingBot = typeof tradingBots.$inferInsert;

/**
 * Trades - individual trade records
 */
export const trades = mysqlTable("trades", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  accountId: int("accountId").notNull(),
  botId: int("botId"),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  side: mysqlEnum("side", ["buy", "sell"]).notNull(),
  type: mysqlEnum("type", ["market", "limit", "stop", "stop_limit"]).notNull(),
  status: mysqlEnum("status", ["pending", "filled", "partial", "canceled", "rejected"]).notNull(),
  quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
  price: decimal("price", { precision: 18, scale: 8 }),
  filledPrice: decimal("filledPrice", { precision: 18, scale: 8 }),
  filledQuantity: decimal("filledQuantity", { precision: 18, scale: 8 }),
  pnl: decimal("pnl", { precision: 18, scale: 2 }),
  fees: decimal("fees", { precision: 18, scale: 4 }).default("0.00"),
  // AI agent analysis that led to this trade
  agentAnalysis: json("agentAnalysis"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  filledAt: timestamp("filledAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Trade = typeof trades.$inferSelect;
export type InsertTrade = typeof trades.$inferInsert;

/**
 * Backtests - historical strategy testing
 */
export const backtests = mysqlTable("backtests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  botId: int("botId"),
  name: varchar("name", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["pending", "running", "completed", "failed"]).default("pending").notNull(),
  strategy: json("strategy").notNull(),
  symbols: json("symbols").notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  initialCapital: decimal("initialCapital", { precision: 18, scale: 2 }).notNull(),
  // Results
  finalCapital: decimal("finalCapital", { precision: 18, scale: 2 }),
  totalReturn: decimal("totalReturn", { precision: 10, scale: 4 }),
  sharpeRatio: decimal("sharpeRatio", { precision: 10, scale: 4 }),
  maxDrawdown: decimal("maxDrawdown", { precision: 10, scale: 4 }),
  winRate: decimal("winRate", { precision: 10, scale: 4 }),
  profitFactor: decimal("profitFactor", { precision: 10, scale: 4 }),
  totalTrades: int("totalTrades"),
  results: json("results"), // Detailed backtest results
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Backtest = typeof backtests.$inferSelect;
export type InsertBacktest = typeof backtests.$inferInsert;

/**
 * Portfolio snapshots - daily portfolio state for analytics
 */
export const portfolioSnapshots = mysqlTable("portfolio_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  accountId: int("accountId").notNull(),
  snapshotDate: timestamp("snapshotDate").notNull(),
  totalValue: decimal("totalValue", { precision: 18, scale: 2 }).notNull(),
  cashBalance: decimal("cashBalance", { precision: 18, scale: 2 }).notNull(),
  positions: json("positions").notNull(), // Array of positions
  dailyPnl: decimal("dailyPnl", { precision: 18, scale: 2 }),
  dailyReturn: decimal("dailyReturn", { precision: 10, scale: 4 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PortfolioSnapshot = typeof portfolioSnapshots.$inferSelect;
export type InsertPortfolioSnapshot = typeof portfolioSnapshots.$inferInsert;

/**
 * AI Agent analyses - stores analysis from each agent
 */
export const agentAnalyses = mysqlTable("agent_analyses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  botId: int("botId"),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  // Individual agent scores/signals (-1 to 1)
  technicalScore: decimal("technicalScore", { precision: 5, scale: 4 }),
  fundamentalScore: decimal("fundamentalScore", { precision: 5, scale: 4 }),
  sentimentScore: decimal("sentimentScore", { precision: 5, scale: 4 }),
  riskScore: decimal("riskScore", { precision: 5, scale: 4 }),
  microstructureScore: decimal("microstructureScore", { precision: 5, scale: 4 }),
  macroScore: decimal("macroScore", { precision: 5, scale: 4 }),
  quantScore: decimal("quantScore", { precision: 5, scale: 4 }),
  // Consensus
  consensusScore: decimal("consensusScore", { precision: 5, scale: 4 }),
  consensusAction: mysqlEnum("consensusAction", ["strong_buy", "buy", "hold", "sell", "strong_sell"]),
  confidence: decimal("confidence", { precision: 5, scale: 4 }),
  // Detailed analysis
  analysisDetails: json("analysisDetails"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgentAnalysis = typeof agentAnalyses.$inferSelect;
export type InsertAgentAnalysis = typeof agentAnalyses.$inferInsert;

/**
 * Bot marketplace listings
 */
export const marketplaceListings = mysqlTable("marketplace_listings", {
  id: int("id").autoincrement().primaryKey(),
  botId: int("botId").notNull(),
  userId: int("userId").notNull(), // Creator
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", ["momentum", "mean_reversion", "trend_following", "arbitrage", "ml_based", "other"]).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).default("0.00").notNull(), // 0 = free
  subscriptionPrice: decimal("subscriptionPrice", { precision: 10, scale: 2 }), // Monthly subscription
  // Stats
  totalCopies: int("totalCopies").default(0).notNull(),
  totalRevenue: decimal("totalRevenue", { precision: 18, scale: 2 }).default("0.00").notNull(),
  rating: decimal("rating", { precision: 3, scale: 2 }),
  reviewCount: int("reviewCount").default(0).notNull(),
  // Performance (last 30 days)
  monthlyReturn: decimal("monthlyReturn", { precision: 10, scale: 4 }),
  monthlyTrades: int("monthlyTrades"),
  winRate: decimal("winRate", { precision: 10, scale: 4 }),
  // Accuracy metrics
  accuracyScore: decimal("accuracyScore", { precision: 5, scale: 4 }), // AI prediction accuracy
  totalPredictions: int("totalPredictions").default(0).notNull(),
  correctPredictions: int("correctPredictions").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  isFeatured: boolean("isFeatured").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MarketplaceListing = typeof marketplaceListings.$inferSelect;
export type InsertMarketplaceListing = typeof marketplaceListings.$inferInsert;

/**
 * Bot copies - tracks who copied which bot
 */
export const botCopies = mysqlTable("bot_copies", {
  id: int("id").autoincrement().primaryKey(),
  originalBotId: int("originalBotId").notNull(),
  copiedBotId: int("copiedBotId").notNull(),
  userId: int("userId").notNull(), // User who copied
  listingId: int("listingId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BotCopy = typeof botCopies.$inferSelect;
export type InsertBotCopy = typeof botCopies.$inferInsert;

/**
 * Watchlists - user's watched symbols
 */
export const watchlists = mysqlTable("watchlists", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  symbols: json("symbols").notNull(), // Array of symbols
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Watchlist = typeof watchlists.$inferSelect;
export type InsertWatchlist = typeof watchlists.$inferInsert;

/**
 * Subscription tier limits - defines what each tier can access
 */
export const subscriptionTierLimits = {
  free: {
    maxBots: 1,
    maxAccounts: 1,
    liveTrading: false,
    backtestYears: 0.25, // 3 months
    aiAgents: 2,
    apiAccess: false,
    prioritySupport: false,
  },
  starter: {
    maxBots: 3,
    maxAccounts: 2,
    liveTrading: true,
    backtestYears: 1,
    aiAgents: 4,
    apiAccess: false,
    prioritySupport: false,
  },
  pro: {
    maxBots: 10,
    maxAccounts: 5,
    liveTrading: true,
    backtestYears: 5,
    aiAgents: 7,
    apiAccess: true,
    prioritySupport: true,
  },
  elite: {
    maxBots: -1, // Unlimited
    maxAccounts: -1,
    liveTrading: true,
    backtestYears: 15, // Since 2010
    aiAgents: 7,
    apiAccess: true,
    prioritySupport: true,
  },
} as const;

export type SubscriptionTier = keyof typeof subscriptionTierLimits;


/**
 * User LLM Settings - stores user's preferred LLM provider and API keys
 * API keys are encrypted before storage
 */
export const userLlmSettings = mysqlTable("user_llm_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  // Provider selection
  activeProvider: mysqlEnum("activeProvider", ["openai", "deepseek", "claude", "gemini"]).default("openai").notNull(),
  // API Keys (encrypted)
  openaiApiKey: text("openaiApiKey"),
  deepseekApiKey: text("deepseekApiKey"),
  claudeApiKey: text("claudeApiKey"),
  geminiApiKey: text("geminiApiKey"),
  // Model preferences
  openaiModel: varchar("openaiModel", { length: 100 }).default("gpt-4-turbo"),
  deepseekModel: varchar("deepseekModel", { length: 100 }).default("deepseek-reasoner"),
  claudeModel: varchar("claudeModel", { length: 100 }).default("claude-sonnet-4-20250514"),
  geminiModel: varchar("geminiModel", { length: 100 }).default("gemini-2.0-flash"),
  // Settings
  temperature: decimal("temperature", { precision: 3, scale: 2 }).default("0.7"),
  maxTokens: int("maxTokens").default(4096),
  // Usage tracking
  totalTokensUsed: int("totalTokensUsed").default(0),
  lastUsedAt: timestamp("lastUsedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserLlmSettings = typeof userLlmSettings.$inferSelect;
export type InsertUserLlmSettings = typeof userLlmSettings.$inferInsert;

/**
 * LLM Provider configurations - available models for each provider
 */
export const llmProviderConfigs = {
  openai: {
    name: "OpenAI",
    models: [
      { id: "gpt-4-turbo", name: "GPT-4 Turbo", description: "Most capable model, best for complex analysis" },
      { id: "gpt-4o", name: "GPT-4o", description: "Optimized for speed and quality balance" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", description: "Fast and cost-effective" },
      { id: "o1-preview", name: "O1 Preview", description: "Advanced reasoning capabilities" },
      { id: "o1-mini", name: "O1 Mini", description: "Fast reasoning model" },
    ],
    baseUrl: "https://api.openai.com/v1",
  },
  deepseek: {
    name: "DeepSeek",
    models: [
      { id: "deepseek-reasoner", name: "DeepSeek R1", description: "Advanced reasoning with chain-of-thought" },
      { id: "deepseek-chat", name: "DeepSeek Chat", description: "General purpose chat model" },
      { id: "deepseek-coder", name: "DeepSeek Coder", description: "Specialized for code analysis" },
    ],
    baseUrl: "https://api.deepseek.com/v1",
  },
  claude: {
    name: "Anthropic Claude",
    models: [
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", description: "Best balance of speed and intelligence" },
      { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", description: "Previous generation, very capable" },
      { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", description: "Fast and efficient" },
      { id: "claude-3-opus-20240229", name: "Claude 3 Opus", description: "Most powerful for complex tasks" },
    ],
    baseUrl: "https://api.anthropic.com/v1",
  },
  gemini: {
    name: "Google Gemini",
    models: [
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", description: "Latest fast model with multimodal" },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", description: "Advanced reasoning and long context" },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", description: "Fast and efficient" },
    ],
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
  },
} as const;

export type LlmProvider = keyof typeof llmProviderConfigs;


/**
 * LLM Usage Logs - detailed tracking of every LLM API call
 * Used for billing, analytics, and cost estimation
 */
export const llmUsageLogs = mysqlTable("llm_usage_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // Provider and model info
  provider: mysqlEnum("provider", ["openai", "deepseek", "claude", "gemini"]).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  // Token usage
  promptTokens: int("promptTokens").notNull(),
  completionTokens: int("completionTokens").notNull(),
  totalTokens: int("totalTokens").notNull(),
  // Cost calculation (in USD cents for precision)
  costCents: int("costCents").notNull(),
  // Context
  analysisType: mysqlEnum("analysisType", ["technical", "fundamental", "sentiment", "risk", "microstructure", "macro", "quant", "consensus"]),
  symbol: varchar("symbol", { length: 20 }),
  // Fallback tracking
  wasFallback: boolean("wasFallback").default(false).notNull(),
  originalProvider: mysqlEnum("originalProvider", ["openai", "deepseek", "claude", "gemini"]),
  fallbackReason: varchar("fallbackReason", { length: 255 }),
  // Response info
  responseTimeMs: int("responseTimeMs"),
  success: boolean("success").default(true).notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LlmUsageLog = typeof llmUsageLogs.$inferSelect;
export type InsertLlmUsageLog = typeof llmUsageLogs.$inferInsert;

/**
 * User Fallback Settings - configures fallback provider preferences
 */
export const userFallbackSettings = mysqlTable("user_fallback_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  // Fallback enabled
  fallbackEnabled: boolean("fallbackEnabled").default(true).notNull(),
  // Priority order (JSON array of provider names) - no default, set in application
  fallbackPriority: json("fallbackPriority"),
  // Retry settings
  maxRetries: int("maxRetries").default(2),
  retryDelayMs: int("retryDelayMs").default(1000),
  // Notifications
  notifyOnFallback: boolean("notifyOnFallback").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserFallbackSettings = typeof userFallbackSettings.$inferSelect;
export type InsertUserFallbackSettings = typeof userFallbackSettings.$inferInsert;

/**
 * LLM Provider pricing - cost per 1M tokens for each model
 * Prices in USD cents for precision
 */
export const llmPricing = {
  openai: {
    "gpt-4-turbo": { input: 1000, output: 3000 }, // $10/$30 per 1M tokens
    "gpt-4o": { input: 250, output: 1000 }, // $2.50/$10 per 1M tokens
    "gpt-4o-mini": { input: 15, output: 60 }, // $0.15/$0.60 per 1M tokens
    "o1-preview": { input: 1500, output: 6000 }, // $15/$60 per 1M tokens
    "o1-mini": { input: 300, output: 1200 }, // $3/$12 per 1M tokens
  },
  deepseek: {
    "deepseek-reasoner": { input: 55, output: 219 }, // $0.55/$2.19 per 1M tokens
    "deepseek-chat": { input: 14, output: 28 }, // $0.14/$0.28 per 1M tokens
    "deepseek-coder": { input: 14, output: 28 },
  },
  claude: {
    "claude-sonnet-4-20250514": { input: 300, output: 1500 }, // $3/$15 per 1M tokens
    "claude-3-5-sonnet": { input: 300, output: 1500 },
    "claude-3-opus": { input: 1500, output: 7500 }, // $15/$75 per 1M tokens
    "claude-3-haiku": { input: 25, output: 125 }, // $0.25/$1.25 per 1M tokens
  },
  gemini: {
    "gemini-2.0-flash": { input: 10, output: 40 }, // $0.10/$0.40 per 1M tokens
    "gemini-1.5-pro": { input: 125, output: 500 }, // $1.25/$5 per 1M tokens
    "gemini-1.5-flash": { input: 8, output: 30 }, // $0.075/$0.30 per 1M tokens
  },
} as const;

// LlmProvider type is already defined above from llmProviderConfigs


// ============================================
// PHASE 14: Performance Tracking & Accuracy
// ============================================

/**
 * Price Tracking - tracks actual price movements after AI recommendations
 */
export const priceTracking = mysqlTable("price_tracking", {
  id: int("id").autoincrement().primaryKey(),
  analysisId: int("analysisId").notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  // Price at recommendation time
  priceAtRecommendation: decimal("priceAtRecommendation", { precision: 18, scale: 6 }).notNull(),
  recommendedAction: mysqlEnum("recommendedAction", ["strong_buy", "buy", "hold", "sell", "strong_sell"]).notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 4 }).notNull(),
  // Tracked prices over time
  price1Day: decimal("price1Day", { precision: 18, scale: 6 }),
  price3Day: decimal("price3Day", { precision: 18, scale: 6 }),
  price7Day: decimal("price7Day", { precision: 18, scale: 6 }),
  price14Day: decimal("price14Day", { precision: 18, scale: 6 }),
  price30Day: decimal("price30Day", { precision: 18, scale: 6 }),
  // Calculated returns
  return1Day: decimal("return1Day", { precision: 10, scale: 4 }),
  return3Day: decimal("return3Day", { precision: 10, scale: 4 }),
  return7Day: decimal("return7Day", { precision: 10, scale: 4 }),
  return14Day: decimal("return14Day", { precision: 10, scale: 4 }),
  return30Day: decimal("return30Day", { precision: 10, scale: 4 }),
  // Accuracy flags
  wasAccurate1Day: boolean("wasAccurate1Day"),
  wasAccurate7Day: boolean("wasAccurate7Day"),
  wasAccurate30Day: boolean("wasAccurate30Day"),
  // Timestamps
  recommendedAt: timestamp("recommendedAt").notNull(),
  lastUpdatedAt: timestamp("lastUpdatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PriceTracking = typeof priceTracking.$inferSelect;
export type InsertPriceTracking = typeof priceTracking.$inferInsert;

/**
 * Prediction Accuracy - aggregated accuracy metrics per agent and overall
 */
export const predictionAccuracy = mysqlTable("prediction_accuracy", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  // Scope
  agentType: mysqlEnum("agentType", ["technical", "fundamental", "sentiment", "risk", "microstructure", "macro", "quant", "consensus"]),
  symbol: varchar("symbol", { length: 20 }), // NULL for overall
  timeframe: mysqlEnum("timeframe", ["1day", "7day", "30day"]).notNull(),
  // Metrics
  totalPredictions: int("totalPredictions").default(0).notNull(),
  correctPredictions: int("correctPredictions").default(0).notNull(),
  accuracyRate: decimal("accuracyRate", { precision: 5, scale: 4 }),
  avgConfidence: decimal("avgConfidence", { precision: 5, scale: 4 }),
  avgReturn: decimal("avgReturn", { precision: 10, scale: 4 }),
  // By action type
  buyAccuracy: decimal("buyAccuracy", { precision: 5, scale: 4 }),
  sellAccuracy: decimal("sellAccuracy", { precision: 5, scale: 4 }),
  holdAccuracy: decimal("holdAccuracy", { precision: 5, scale: 4 }),
  // Period
  periodStart: timestamp("periodStart").notNull(),
  periodEnd: timestamp("periodEnd").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PredictionAccuracy = typeof predictionAccuracy.$inferSelect;
export type InsertPredictionAccuracy = typeof predictionAccuracy.$inferInsert;

// ============================================
// PHASE 15: Saved Comparisons & Watchlists
// ============================================

/**
 * Saved Comparisons - user's saved analysis comparison sets
 */
export const savedComparisons = mysqlTable("saved_comparisons", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  analysisIds: json("analysisIds").notNull(), // Array of analysis IDs
  // Metadata
  symbolsIncluded: json("symbolsIncluded"), // Array of symbols for quick filtering
  dateRange: json("dateRange"), // { start, end }
  isPinned: boolean("isPinned").default(false).notNull(),
  lastViewedAt: timestamp("lastViewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SavedComparison = typeof savedComparisons.$inferSelect;
export type InsertSavedComparison = typeof savedComparisons.$inferInsert;

/**
 * Watchlist Alerts - alerts for recommendation changes
 */
export const watchlistAlerts = mysqlTable("watchlist_alerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  // Alert settings
  alertOnRecommendationChange: boolean("alertOnRecommendationChange").default(true).notNull(),
  alertOnConfidenceChange: boolean("alertOnConfidenceChange").default(false).notNull(),
  confidenceThreshold: decimal("confidenceThreshold", { precision: 5, scale: 4 }).default("0.1"), // Alert if confidence changes by this much
  alertOnPriceTarget: boolean("alertOnPriceTarget").default(false).notNull(),
  priceTargetHigh: decimal("priceTargetHigh", { precision: 18, scale: 6 }),
  priceTargetLow: decimal("priceTargetLow", { precision: 18, scale: 6 }),
  // Notification preferences
  emailNotification: boolean("emailNotification").default(true).notNull(),
  pushNotification: boolean("pushNotification").default(true).notNull(),
  // Last known state
  lastRecommendation: mysqlEnum("lastRecommendation", ["strong_buy", "buy", "hold", "sell", "strong_sell"]),
  lastConfidence: decimal("lastConfidence", { precision: 5, scale: 4 }),
  lastPrice: decimal("lastPrice", { precision: 18, scale: 6 }),
  lastAlertAt: timestamp("lastAlertAt"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WatchlistAlert = typeof watchlistAlerts.$inferSelect;
export type InsertWatchlistAlert = typeof watchlistAlerts.$inferInsert;

/**
 * Alert History - log of sent alerts
 */
export const alertHistory = mysqlTable("alert_history", {
  id: int("id").autoincrement().primaryKey(),
  uniqueId: varchar("uniqueId", { length: 64 }), // For new alert system
  userId: int("userId").notNull(),
  alertId: int("alertId").notNull(),
  alertIdStr: varchar("alertIdStr", { length: 64 }), // For new alert system
  symbol: varchar("symbol", { length: 20 }).notNull(),
  alertType: mysqlEnum("alertType", ["recommendation_change", "confidence_change", "price_target", "bot_status", "analysis_complete", "price", "regime", "sentiment"]).notNull(),
  // Alert content
  title: varchar("title", { length: 255 }),
  message: text("message").notNull(),
  // Previous and new values
  previousValue: varchar("previousValue", { length: 100 }),
  newValue: varchar("newValue", { length: 100 }),
  details: json("details"), // For new alert system
  isRead: boolean("isRead").default(false).notNull(),
  // Delivery status
  emailSent: boolean("emailSent").default(false).notNull(),
  pushSent: boolean("pushSent").default(false).notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AlertHistory = typeof alertHistory.$inferSelect;
export type InsertAlertHistory = typeof alertHistory.$inferInsert;

// ============================================
// PHASE 16: Real-Time Features
// ============================================

/**
 * User Notifications - in-app notification center
 */
export const userNotifications = mysqlTable("user_notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["info", "success", "warning", "error", "alert", "trade", "analysis", "social"]).notNull(),
  category: mysqlEnum("category", ["system", "trading", "analysis", "social", "billing"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  // Action link
  actionUrl: varchar("actionUrl", { length: 500 }),
  actionLabel: varchar("actionLabel", { length: 100 }),
  // Related entities
  relatedEntityType: varchar("relatedEntityType", { length: 50 }),
  relatedEntityId: int("relatedEntityId"),
  // Status
  isRead: boolean("isRead").default(false).notNull(),
  readAt: timestamp("readAt"),
  isPinned: boolean("isPinned").default(false).notNull(),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserNotification = typeof userNotifications.$inferSelect;
export type InsertUserNotification = typeof userNotifications.$inferInsert;

/**
 * Real-time Subscriptions - tracks what users are subscribed to for live updates
 */
export const realtimeSubscriptions = mysqlTable("realtime_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  socketId: varchar("socketId", { length: 100 }),
  subscriptionType: mysqlEnum("subscriptionType", ["price", "portfolio", "bot_status", "analysis", "notifications"]).notNull(),
  // Subscription target
  symbols: json("symbols"), // Array of symbols for price subscriptions
  botIds: json("botIds"), // Array of bot IDs for bot status
  accountIds: json("accountIds"), // Array of account IDs for portfolio
  // Status
  isActive: boolean("isActive").default(true).notNull(),
  lastHeartbeat: timestamp("lastHeartbeat"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RealtimeSubscription = typeof realtimeSubscriptions.$inferSelect;
export type InsertRealtimeSubscription = typeof realtimeSubscriptions.$inferInsert;

// ============================================
// PHASE 17: Advanced Bot Features
// ============================================

/**
 * Bot Schedules - scheduling for automated bot execution
 */
export const botSchedules = mysqlTable("bot_schedules", {
  id: int("id").autoincrement().primaryKey(),
  botId: int("botId").notNull(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  // Schedule type
  scheduleType: mysqlEnum("scheduleType", ["once", "daily", "weekly", "monthly", "cron"]).notNull(),
  // Schedule details
  cronExpression: varchar("cronExpression", { length: 100 }), // For cron type
  runTime: varchar("runTime", { length: 10 }), // HH:MM format for daily
  daysOfWeek: json("daysOfWeek"), // Array of days (0-6) for weekly
  dayOfMonth: int("dayOfMonth"), // For monthly
  timezone: varchar("timezone", { length: 50 }).default("UTC").notNull(),
  // Execution settings
  maxExecutionTime: int("maxExecutionTime").default(300), // seconds
  retryOnFailure: boolean("retryOnFailure").default(true).notNull(),
  maxRetries: int("maxRetries").default(3),
  // Status
  isActive: boolean("isActive").default(true).notNull(),
  lastRunAt: timestamp("lastRunAt"),
  nextRunAt: timestamp("nextRunAt"),
  lastRunStatus: mysqlEnum("lastRunStatus", ["success", "failed", "timeout", "skipped"]),
  lastRunError: text("lastRunError"),
  totalRuns: int("totalRuns").default(0).notNull(),
  successfulRuns: int("successfulRuns").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BotSchedule = typeof botSchedules.$inferSelect;
export type InsertBotSchedule = typeof botSchedules.$inferInsert;

/**
 * Bot Risk Rules - risk management rules for bots
 */
export const botRiskRules = mysqlTable("bot_risk_rules", {
  id: int("id").autoincrement().primaryKey(),
  botId: int("botId").notNull(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  ruleType: mysqlEnum("ruleType", ["stop_loss", "take_profit", "trailing_stop", "max_position", "max_daily_loss", "max_drawdown", "position_sizing"]).notNull(),
  // Rule parameters
  triggerValue: decimal("triggerValue", { precision: 18, scale: 6 }), // Percentage or absolute value
  triggerType: mysqlEnum("triggerType", ["percentage", "absolute", "atr_multiple"]).default("percentage"),
  // Position sizing
  positionSizeType: mysqlEnum("positionSizeType", ["fixed", "percentage", "risk_based"]),
  positionSizeValue: decimal("positionSizeValue", { precision: 18, scale: 6 }),
  maxPositionSize: decimal("maxPositionSize", { precision: 18, scale: 6 }),
  // Action on trigger
  actionOnTrigger: mysqlEnum("actionOnTrigger", ["close_position", "reduce_position", "pause_bot", "notify_only"]).default("close_position"),
  reduceByPercentage: decimal("reduceByPercentage", { precision: 5, scale: 2 }),
  // Status
  isActive: boolean("isActive").default(true).notNull(),
  triggeredCount: int("triggeredCount").default(0).notNull(),
  lastTriggeredAt: timestamp("lastTriggeredAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BotRiskRule = typeof botRiskRules.$inferSelect;
export type InsertBotRiskRule = typeof botRiskRules.$inferInsert;

/**
 * Bot Execution Logs - detailed logs of bot executions
 */
export const botExecutionLogs = mysqlTable("bot_execution_logs", {
  id: int("id").autoincrement().primaryKey(),
  botId: int("botId").notNull(),
  userId: int("userId").notNull(),
  scheduleId: int("scheduleId"),
  // Execution info
  executionType: mysqlEnum("executionType", ["scheduled", "manual", "triggered"]).notNull(),
  status: mysqlEnum("status", ["running", "completed", "failed", "timeout", "cancelled"]).notNull(),
  // Timing
  startedAt: timestamp("startedAt").notNull(),
  completedAt: timestamp("completedAt"),
  durationMs: int("durationMs"),
  // Results
  symbolsAnalyzed: json("symbolsAnalyzed"),
  tradesExecuted: int("tradesExecuted").default(0),
  ordersPlaced: int("ordersPlaced").default(0),
  // AI Analysis
  analysisResults: json("analysisResults"), // Summary of AI consensus
  // Errors
  errorMessage: text("errorMessage"),
  errorStack: text("errorStack"),
  // Performance
  pnlResult: decimal("pnlResult", { precision: 18, scale: 6 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BotExecutionLog = typeof botExecutionLogs.$inferSelect;
export type InsertBotExecutionLog = typeof botExecutionLogs.$inferInsert;

/**
 * Bot Benchmarks - performance comparison vs benchmarks
 */
export const botBenchmarks = mysqlTable("bot_benchmarks", {
  id: int("id").autoincrement().primaryKey(),
  botId: int("botId").notNull(),
  userId: int("userId").notNull(),
  // Benchmark
  benchmarkSymbol: varchar("benchmarkSymbol", { length: 20 }).default("SPY").notNull(), // S&P 500 ETF
  // Period
  periodStart: timestamp("periodStart").notNull(),
  periodEnd: timestamp("periodEnd").notNull(),
  periodDays: int("periodDays").notNull(),
  // Bot performance
  botReturn: decimal("botReturn", { precision: 10, scale: 4 }).notNull(),
  botSharpe: decimal("botSharpe", { precision: 10, scale: 4 }),
  botMaxDrawdown: decimal("botMaxDrawdown", { precision: 10, scale: 4 }),
  botWinRate: decimal("botWinRate", { precision: 5, scale: 4 }),
  botTotalTrades: int("botTotalTrades"),
  // Benchmark performance
  benchmarkReturn: decimal("benchmarkReturn", { precision: 10, scale: 4 }).notNull(),
  benchmarkSharpe: decimal("benchmarkSharpe", { precision: 10, scale: 4 }),
  benchmarkMaxDrawdown: decimal("benchmarkMaxDrawdown", { precision: 10, scale: 4 }),
  // Comparison
  alpha: decimal("alpha", { precision: 10, scale: 4 }), // Excess return vs benchmark
  beta: decimal("beta", { precision: 10, scale: 4 }), // Correlation with benchmark
  informationRatio: decimal("informationRatio", { precision: 10, scale: 4 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BotBenchmark = typeof botBenchmarks.$inferSelect;
export type InsertBotBenchmark = typeof botBenchmarks.$inferInsert;

// ============================================
// PHASE 18: Social & Community
// ============================================

/**
 * User Profiles - extended profile with trading stats
 */
export const userProfiles = mysqlTable("user_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  // Profile info
  displayName: varchar("displayName", { length: 100 }),
  bio: text("bio"),
  avatarUrl: varchar("avatarUrl", { length: 500 }),
  location: varchar("location", { length: 100 }),
  website: varchar("website", { length: 255 }),
  twitterHandle: varchar("twitterHandle", { length: 50 }),
  // Privacy settings
  isPublic: boolean("isPublic").default(true).notNull(),
  showTradingStats: boolean("showTradingStats").default(true).notNull(),
  showPortfolio: boolean("showPortfolio").default(false).notNull(),
  allowFollowers: boolean("allowFollowers").default(true).notNull(),
  // Trading stats (aggregated)
  totalTrades: int("totalTrades").default(0).notNull(),
  winRate: decimal("winRate", { precision: 5, scale: 4 }),
  totalReturn: decimal("totalReturn", { precision: 10, scale: 4 }),
  avgReturn: decimal("avgReturn", { precision: 10, scale: 4 }),
  bestTrade: decimal("bestTrade", { precision: 10, scale: 4 }),
  worstTrade: decimal("worstTrade", { precision: 10, scale: 4 }),
  sharpeRatio: decimal("sharpeRatio", { precision: 10, scale: 4 }),
  // Social stats
  followersCount: int("followersCount").default(0).notNull(),
  followingCount: int("followingCount").default(0).notNull(),
  strategiesShared: int("strategiesShared").default(0).notNull(),
  // Reputation
  reputationScore: int("reputationScore").default(0).notNull(),
  badges: json("badges"), // Array of badge IDs
  // Activity
  lastActiveAt: timestamp("lastActiveAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

/**
 * User Follows - follow relationships between users
 */
export const userFollows = mysqlTable("user_follows", {
  id: int("id").autoincrement().primaryKey(),
  followerId: int("followerId").notNull(), // User who is following
  followingId: int("followingId").notNull(), // User being followed
  // Notification preferences
  notifyOnTrade: boolean("notifyOnTrade").default(false).notNull(),
  notifyOnAnalysis: boolean("notifyOnAnalysis").default(true).notNull(),
  notifyOnStrategy: boolean("notifyOnStrategy").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserFollow = typeof userFollows.$inferSelect;
export type InsertUserFollow = typeof userFollows.$inferInsert;

/**
 * Discussion Threads - discussions on analyses and strategies
 */
export const discussionThreads = mysqlTable("discussion_threads", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Author
  // Thread type and target
  threadType: mysqlEnum("threadType", ["analysis", "strategy", "bot", "general", "market"]).notNull(),
  relatedEntityId: int("relatedEntityId"), // Analysis ID, Bot ID, etc.
  symbol: varchar("symbol", { length: 20 }),
  // Content
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  // Engagement
  viewCount: int("viewCount").default(0).notNull(),
  likeCount: int("likeCount").default(0).notNull(),
  commentCount: int("commentCount").default(0).notNull(),
  // Status
  isPinned: boolean("isPinned").default(false).notNull(),
  isLocked: boolean("isLocked").default(false).notNull(),
  isDeleted: boolean("isDeleted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DiscussionThread = typeof discussionThreads.$inferSelect;
export type InsertDiscussionThread = typeof discussionThreads.$inferInsert;

/**
 * Discussion Comments - comments on threads
 */
export const discussionComments = mysqlTable("discussion_comments", {
  id: int("id").autoincrement().primaryKey(),
  threadId: int("threadId").notNull(),
  userId: int("userId").notNull(),
  parentCommentId: int("parentCommentId"), // For nested replies
  // Content
  content: text("content").notNull(),
  // Engagement
  likeCount: int("likeCount").default(0).notNull(),
  // Status
  isEdited: boolean("isEdited").default(false).notNull(),
  isDeleted: boolean("isDeleted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DiscussionComment = typeof discussionComments.$inferSelect;
export type InsertDiscussionComment = typeof discussionComments.$inferInsert;

/**
 * Strategy Ratings - ratings and reviews for shared strategies
 */
export const strategyRatings = mysqlTable("strategy_ratings", {
  id: int("id").autoincrement().primaryKey(),
  listingId: int("listingId").notNull(), // Marketplace listing
  userId: int("userId").notNull(),
  // Rating
  rating: int("rating").notNull(), // 1-5 stars
  review: text("review"),
  // Helpful votes
  helpfulCount: int("helpfulCount").default(0).notNull(),
  // Status
  isVerifiedPurchase: boolean("isVerifiedPurchase").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StrategyRating = typeof strategyRatings.$inferSelect;
export type InsertStrategyRating = typeof strategyRatings.$inferInsert;

/**
 * Activity Feed - user activity for social feed
 */
export const activityFeed = mysqlTable("activity_feed", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  activityType: mysqlEnum("activityType", ["trade", "analysis", "strategy_share", "follow", "comment", "like", "achievement", "bot_created"]).notNull(),
  // Activity details
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  // Related entities
  relatedEntityType: varchar("relatedEntityType", { length: 50 }),
  relatedEntityId: int("relatedEntityId"),
  symbol: varchar("symbol", { length: 20 }),
  // Visibility
  isPublic: boolean("isPublic").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityFeed = typeof activityFeed.$inferSelect;
export type InsertActivityFeed = typeof activityFeed.$inferInsert;

/**
 * User Badges - achievement badges
 */
export const userBadges = mysqlTable("user_badges", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  badgeId: varchar("badgeId", { length: 50 }).notNull(),
  // Badge info
  badgeName: varchar("badgeName", { length: 100 }).notNull(),
  badgeDescription: text("badgeDescription"),
  badgeIcon: varchar("badgeIcon", { length: 100 }),
  badgeColor: varchar("badgeColor", { length: 20 }),
  // Achievement
  earnedAt: timestamp("earnedAt").defaultNow().notNull(),
  earnedReason: text("earnedReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserBadge = typeof userBadges.$inferSelect;
export type InsertUserBadge = typeof userBadges.$inferInsert;

/**
 * Badge Definitions - available badges
 */
export const badgeDefinitions = {
  first_trade: { name: "First Trade", description: "Completed your first trade", icon: "trophy", color: "bronze" },
  profitable_week: { name: "Profitable Week", description: "Had a profitable trading week", icon: "trending-up", color: "green" },
  profitable_month: { name: "Profitable Month", description: "Had a profitable trading month", icon: "calendar-check", color: "gold" },
  accuracy_80: { name: "Sharp Shooter", description: "Achieved 80%+ prediction accuracy", icon: "target", color: "purple" },
  accuracy_90: { name: "Master Predictor", description: "Achieved 90%+ prediction accuracy", icon: "bullseye", color: "diamond" },
  bot_creator: { name: "Bot Creator", description: "Created your first trading bot", icon: "robot", color: "blue" },
  strategy_sharer: { name: "Strategy Sharer", description: "Shared a strategy on marketplace", icon: "share", color: "teal" },
  top_performer: { name: "Top Performer", description: "Ranked in top 10% of traders", icon: "crown", color: "gold" },
  community_helper: { name: "Community Helper", description: "Received 50+ helpful votes", icon: "heart", color: "red" },
  early_adopter: { name: "Early Adopter", description: "Joined during beta", icon: "rocket", color: "orange" },
  whale: { name: "Whale", description: "Portfolio value over $1M", icon: "fish", color: "blue" },
  streak_7: { name: "Week Warrior", description: "7-day profitable streak", icon: "flame", color: "orange" },
  streak_30: { name: "Month Master", description: "30-day profitable streak", icon: "fire", color: "red" },
  diversified: { name: "Diversified", description: "Traded 20+ different symbols", icon: "pie-chart", color: "purple" },
  risk_manager: { name: "Risk Manager", description: "Never exceeded 5% drawdown", icon: "shield", color: "green" },
} as const;

export type BadgeId = keyof typeof badgeDefinitions;


// ============================================
// PHASE 23-25: Email Notifications & Background Jobs
// ============================================

/**
 * Email Templates - reusable email templates
 */
export const emailTemplates = mysqlTable("email_templates", {
  id: int("id").autoincrement().primaryKey(),
  templateKey: varchar("templateKey", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  htmlContent: text("htmlContent").notNull(),
  textContent: text("textContent"),
  // Variables that can be replaced
  variables: json("variables"), // Array of variable names
  // Status
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;

/**
 * Email Queue - pending emails to be sent
 */
export const emailQueue = mysqlTable("email_queue", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  toEmail: varchar("toEmail", { length: 320 }).notNull(),
  templateId: int("templateId"),
  // Email content
  subject: varchar("subject", { length: 500 }).notNull(),
  htmlContent: text("htmlContent").notNull(),
  textContent: text("textContent"),
  // Template variables
  templateVariables: json("templateVariables"),
  // Priority and scheduling
  priority: mysqlEnum("priority", ["low", "normal", "high", "urgent"]).default("normal").notNull(),
  scheduledAt: timestamp("scheduledAt"),
  // Status
  status: mysqlEnum("status", ["pending", "processing", "sent", "failed", "cancelled"]).default("pending").notNull(),
  attempts: int("attempts").default(0).notNull(),
  maxAttempts: int("maxAttempts").default(3).notNull(),
  lastAttemptAt: timestamp("lastAttemptAt"),
  sentAt: timestamp("sentAt"),
  errorMessage: text("errorMessage"),
  // Tracking
  messageId: varchar("messageId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailQueueItem = typeof emailQueue.$inferSelect;
export type InsertEmailQueueItem = typeof emailQueue.$inferInsert;

/**
 * User Email Preferences - email notification settings
 */
export const userEmailPreferences = mysqlTable("user_email_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  // Notification types
  botExecutionComplete: boolean("botExecutionComplete").default(true).notNull(),
  botExecutionError: boolean("botExecutionError").default(true).notNull(),
  priceTargetAlert: boolean("priceTargetAlert").default(true).notNull(),
  recommendationChange: boolean("recommendationChange").default(true).notNull(),
  weeklyReport: boolean("weeklyReport").default(true).notNull(),
  monthlyReport: boolean("monthlyReport").default(true).notNull(),
  marketingEmails: boolean("marketingEmails").default(false).notNull(),
  // Frequency settings
  digestFrequency: mysqlEnum("digestFrequency", ["immediate", "hourly", "daily", "weekly"]).default("immediate").notNull(),
  quietHoursStart: varchar("quietHoursStart", { length: 5 }), // HH:MM format
  quietHoursEnd: varchar("quietHoursEnd", { length: 5 }),
  timezone: varchar("timezone", { length: 50 }).default("UTC").notNull(),
  // Status
  isUnsubscribed: boolean("isUnsubscribed").default(false).notNull(),
  unsubscribedAt: timestamp("unsubscribedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserEmailPreference = typeof userEmailPreferences.$inferSelect;
export type InsertUserEmailPreference = typeof userEmailPreferences.$inferInsert;

/**
 * Background Jobs - scheduled and queued jobs
 */
export const backgroundJobs = mysqlTable("background_jobs", {
  id: int("id").autoincrement().primaryKey(),
  jobType: mysqlEnum("jobType", [
    "bot_execution",
    "price_tracking",
    "accuracy_calculation",
    "weekly_report",
    "monthly_report",
    "watchlist_check",
    "email_send",
    "cleanup"
  ]).notNull(),
  // Job configuration
  payload: json("payload").notNull(), // Job-specific data
  // Scheduling
  scheduledAt: timestamp("scheduledAt").notNull(),
  priority: int("priority").default(5).notNull(), // 1-10, lower is higher priority
  // Execution
  status: mysqlEnum("status", ["pending", "running", "completed", "failed", "cancelled"]).default("pending").notNull(),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  // Results
  result: json("result"),
  errorMessage: text("errorMessage"),
  // Retry logic
  attempts: int("attempts").default(0).notNull(),
  maxAttempts: int("maxAttempts").default(3).notNull(),
  nextRetryAt: timestamp("nextRetryAt"),
  // Tracking
  workerId: varchar("workerId", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BackgroundJob = typeof backgroundJobs.$inferSelect;
export type InsertBackgroundJob = typeof backgroundJobs.$inferInsert;

/**
 * Job History - completed job logs
 */
export const jobHistory = mysqlTable("job_history", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),
  jobType: varchar("jobType", { length: 50 }).notNull(),
  // Execution details
  status: mysqlEnum("status", ["completed", "failed"]).notNull(),
  startedAt: timestamp("startedAt").notNull(),
  completedAt: timestamp("completedAt").notNull(),
  durationMs: int("durationMs").notNull(),
  // Results
  payload: json("payload"),
  result: json("result"),
  errorMessage: text("errorMessage"),
  // Metrics
  itemsProcessed: int("itemsProcessed").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type JobHistoryEntry = typeof jobHistory.$inferSelect;
export type InsertJobHistoryEntry = typeof jobHistory.$inferInsert;

/**
 * Performance Reports - generated reports
 */
export const performanceReports = mysqlTable("performance_reports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  reportType: mysqlEnum("reportType", ["weekly", "monthly", "quarterly", "annual"]).notNull(),
  // Report period
  periodStart: timestamp("periodStart").notNull(),
  periodEnd: timestamp("periodEnd").notNull(),
  // Performance metrics
  totalTrades: int("totalTrades").default(0).notNull(),
  winningTrades: int("winningTrades").default(0).notNull(),
  losingTrades: int("losingTrades").default(0).notNull(),
  winRate: decimal("winRate", { precision: 5, scale: 4 }),
  totalProfitLoss: decimal("totalProfitLoss", { precision: 18, scale: 2 }),
  percentageReturn: decimal("percentageReturn", { precision: 8, scale: 4 }),
  // Risk metrics
  maxDrawdown: decimal("maxDrawdown", { precision: 8, scale: 4 }),
  sharpeRatio: decimal("sharpeRatio", { precision: 6, scale: 4 }),
  // AI accuracy
  totalPredictions: int("totalPredictions").default(0).notNull(),
  correctPredictions: int("correctPredictions").default(0).notNull(),
  predictionAccuracy: decimal("predictionAccuracy", { precision: 5, scale: 4 }),
  // Benchmark comparison
  benchmarkReturn: decimal("benchmarkReturn", { precision: 8, scale: 4 }),
  alphaGenerated: decimal("alphaGenerated", { precision: 8, scale: 4 }),
  // Report content
  summaryHtml: text("summaryHtml"),
  detailedJson: json("detailedJson"),
  // Email tracking
  emailSent: boolean("emailSent").default(false).notNull(),
  emailSentAt: timestamp("emailSentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PerformanceReport = typeof performanceReports.$inferSelect;
export type InsertPerformanceReport = typeof performanceReports.$inferInsert;

/**
 * Portfolio Snapshots - for real-time value tracking
 */
export const portfolioValueSnapshots = mysqlTable("portfolio_value_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  accountId: int("accountId").notNull(),
  // Value at snapshot time
  totalValue: decimal("totalValue", { precision: 18, scale: 2 }).notNull(),
  cashBalance: decimal("cashBalance", { precision: 18, scale: 2 }).notNull(),
  positionsValue: decimal("positionsValue", { precision: 18, scale: 2 }).notNull(),
  // Change from previous
  valueChange: decimal("valueChange", { precision: 18, scale: 2 }),
  percentChange: decimal("percentChange", { precision: 8, scale: 4 }),
  // Snapshot type
  snapshotType: mysqlEnum("snapshotType", ["realtime", "hourly", "daily", "weekly"]).default("realtime").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PortfolioValueSnapshot = typeof portfolioValueSnapshots.$inferSelect;
export type InsertPortfolioValueSnapshot = typeof portfolioValueSnapshots.$inferInsert;

// ============================================
// Phase 32-33: Email Configuration & Verification
// ============================================

/**
 * Platform email configuration - stores SendGrid API key and settings
 * Only one active configuration at a time (singleton pattern)
 */
export const emailConfig = mysqlTable("email_config", {
  id: int("id").autoincrement().primaryKey(),
  // SendGrid settings
  sendgridApiKey: text("sendgridApiKey"), // Encrypted
  senderEmail: varchar("senderEmail", { length: 320 }),
  senderName: varchar("senderName", { length: 255 }),
  replyToEmail: varchar("replyToEmail", { length: 320 }),
  // Email settings
  isEnabled: boolean("isEnabled").default(false).notNull(),
  dailyLimit: int("dailyLimit").default(1000),
  // Test mode
  testMode: boolean("testMode").default(true).notNull(),
  testEmail: varchar("testEmail", { length: 320 }),
  // Stats
  emailsSentToday: int("emailsSentToday").default(0),
  lastResetAt: timestamp("lastResetAt"),
  // Metadata
  configuredBy: int("configuredBy"), // Admin user ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailConfig = typeof emailConfig.$inferSelect;
export type InsertEmailConfig = typeof emailConfig.$inferInsert;

/**
 * Email verification tokens for user email confirmation
 */
export const emailVerifications = mysqlTable("email_verifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  // Status
  isVerified: boolean("isVerified").default(false).notNull(),
  verifiedAt: timestamp("verifiedAt"),
  // Expiration
  expiresAt: timestamp("expiresAt").notNull(),
  // Tracking
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  resendCount: int("resendCount").default(0),
  lastResendAt: timestamp("lastResendAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmailVerification = typeof emailVerifications.$inferSelect;
export type InsertEmailVerification = typeof emailVerifications.$inferInsert;


// ============================================
// PHASE 36: Reinforcement Learning Agent
// ============================================

/**
 * RL Agent Models - saved RL model weights and configurations
 */
export const rlAgentModels = mysqlTable("rl_agent_models", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  // Model configuration
  modelData: json("modelData").notNull(), // Q-table, network weights, etc.
  config: json("config"), // Hyperparameters
  // Performance metrics
  totalEpisodes: int("totalEpisodes").default(0).notNull(),
  avgReward: decimal("avgReward", { precision: 18, scale: 6 }),
  bestReward: decimal("bestReward", { precision: 18, scale: 6 }),
  winRate: decimal("winRate", { precision: 5, scale: 4 }),
  sharpeRatio: decimal("sharpeRatio", { precision: 10, scale: 4 }),
  // Status
  status: mysqlEnum("status", ["training", "ready", "deployed", "archived"]).default("training").notNull(),
  lastTrainedAt: timestamp("lastTrainedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RLAgentModel = typeof rlAgentModels.$inferSelect;
export type InsertRLAgentModel = typeof rlAgentModels.$inferInsert;

/**
 * RL Training History - training episode logs
 */
export const rlTrainingHistory = mysqlTable("rl_training_history", {
  id: int("id").autoincrement().primaryKey(),
  modelId: int("modelId").notNull(),
  episode: int("episode").notNull(),
  // Episode metrics
  totalReward: decimal("totalReward", { precision: 18, scale: 6 }).notNull(),
  avgLoss: decimal("avgLoss", { precision: 18, scale: 6 }),
  steps: int("steps").notNull(),
  // Trading metrics
  trades: int("trades").default(0).notNull(),
  winningTrades: int("winningTrades").default(0).notNull(),
  totalReturn: decimal("totalReturn", { precision: 10, scale: 4 }),
  maxDrawdown: decimal("maxDrawdown", { precision: 10, scale: 4 }),
  // Exploration
  epsilon: decimal("epsilon", { precision: 5, scale: 4 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RLTrainingHistoryEntry = typeof rlTrainingHistory.$inferSelect;
export type InsertRLTrainingHistoryEntry = typeof rlTrainingHistory.$inferInsert;

/**
 * RL Experiences - replay buffer storage for experience replay
 */
export const rlExperiences = mysqlTable("rl_experiences", {
  id: int("id").autoincrement().primaryKey(),
  modelId: int("modelId").notNull(),
  // State-Action-Reward-NextState tuple
  state: json("state").notNull(),
  action: int("action").notNull(),
  reward: decimal("reward", { precision: 18, scale: 6 }).notNull(),
  nextState: json("nextState").notNull(),
  done: boolean("done").default(false).notNull(),
  // Metadata
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  symbol: varchar("symbol", { length: 20 }),
  price: decimal("price", { precision: 18, scale: 6 }),
});

export type RLExperience = typeof rlExperiences.$inferSelect;
export type InsertRLExperience = typeof rlExperiences.$inferInsert;

// ============================================
// PHASE 36: Backtesting & Strategy Comparison
// ============================================

/**
 * Backtest Results - stored backtest runs
 */
export const backtestResults = mysqlTable("backtest_results", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  // Configuration
  symbol: varchar("symbol", { length: 20 }).notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  initialCapital: decimal("initialCapital", { precision: 18, scale: 2 }).notNull(),
  strategyType: mysqlEnum("strategyType", ["standard", "enhanced", "rl", "custom"]).notNull(),
  strategyConfig: json("strategyConfig"),
  // Results
  finalCapital: decimal("finalCapital", { precision: 18, scale: 2 }),
  totalReturn: decimal("totalReturn", { precision: 10, scale: 4 }),
  annualizedReturn: decimal("annualizedReturn", { precision: 10, scale: 4 }),
  sharpeRatio: decimal("sharpeRatio", { precision: 10, scale: 4 }),
  sortinoRatio: decimal("sortinoRatio", { precision: 10, scale: 4 }),
  maxDrawdown: decimal("maxDrawdown", { precision: 10, scale: 4 }),
  winRate: decimal("winRate", { precision: 5, scale: 4 }),
  profitFactor: decimal("profitFactor", { precision: 10, scale: 4 }),
  // Trade statistics
  totalTrades: int("totalTrades").default(0).notNull(),
  winningTrades: int("winningTrades").default(0).notNull(),
  losingTrades: int("losingTrades").default(0).notNull(),
  avgWin: decimal("avgWin", { precision: 18, scale: 6 }),
  avgLoss: decimal("avgLoss", { precision: 18, scale: 6 }),
  // Detailed data
  equityCurve: json("equityCurve"), // Array of { date, value }
  trades: json("trades"), // Array of trade details
  // Status
  status: mysqlEnum("status", ["running", "completed", "failed"]).default("running").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type BacktestResult = typeof backtestResults.$inferSelect;
export type InsertBacktestResult = typeof backtestResults.$inferInsert;

/**
 * Strategy Comparisons - side-by-side strategy comparisons
 */
export const strategyComparisons = mysqlTable("strategy_comparisons", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  // Comparison setup
  symbol: varchar("symbol", { length: 20 }).notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  initialCapital: decimal("initialCapital", { precision: 18, scale: 2 }).notNull(),
  // Strategies being compared
  strategies: json("strategies").notNull(), // Array of { type, config, backtestId }
  // Comparison results
  results: json("results"), // Comparative metrics
  winner: varchar("winner", { length: 50 }),
  // Status
  status: mysqlEnum("status", ["pending", "running", "completed", "failed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type StrategyComparison = typeof strategyComparisons.$inferSelect;
export type InsertStrategyComparison = typeof strategyComparisons.$inferInsert;


/**
 * Paper Trading Accounts
 * Virtual trading accounts for practice
 */
export const paperTradingAccounts = mysqlTable("paper_trading_accounts", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  initialBalance: decimal("initialBalance", { precision: 18, scale: 2 }).notNull(),
  currentBalance: decimal("currentBalance", { precision: 18, scale: 2 }).notNull(),
  totalEquity: decimal("totalEquity", { precision: 18, scale: 2 }).notNull(),
  totalPnL: decimal("totalPnL", { precision: 18, scale: 2 }).default("0").notNull(),
  totalPnLPercent: decimal("totalPnLPercent", { precision: 10, scale: 4 }).default("0").notNull(),
  totalTrades: int("totalTrades").default(0).notNull(),
  winningTrades: int("winningTrades").default(0).notNull(),
  losingTrades: int("losingTrades").default(0).notNull(),
  winRate: decimal("winRate", { precision: 10, scale: 4 }).default("0").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PaperTradingAccount = typeof paperTradingAccounts.$inferSelect;
export type InsertPaperTradingAccount = typeof paperTradingAccounts.$inferInsert;

/**
 * Paper Trading Orders
 * Orders placed in paper trading accounts
 */
export const paperTradingOrders = mysqlTable("paper_trading_orders", {
  id: varchar("id", { length: 64 }).primaryKey(),
  accountId: varchar("accountId", { length: 64 }).notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  assetType: mysqlEnum("assetType", ["stock", "crypto"]).notNull(),
  side: mysqlEnum("side", ["buy", "sell"]).notNull(),
  type: mysqlEnum("type", ["market", "limit", "stop_loss", "take_profit", "stop_limit"]).notNull(),
  quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
  price: decimal("price", { precision: 18, scale: 8 }),
  stopPrice: decimal("stopPrice", { precision: 18, scale: 8 }),
  takeProfitPrice: decimal("takeProfitPrice", { precision: 18, scale: 8 }),
  stopLossPrice: decimal("stopLossPrice", { precision: 18, scale: 8 }),
  status: mysqlEnum("status", ["pending", "filled", "partially_filled", "cancelled", "expired", "rejected"]).default("pending").notNull(),
  filledQuantity: decimal("filledQuantity", { precision: 18, scale: 8 }).default("0").notNull(),
  filledPrice: decimal("filledPrice", { precision: 18, scale: 8 }),
  commission: decimal("commission", { precision: 18, scale: 8 }).default("0").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  expiresAt: timestamp("expiresAt"),
});

export type PaperTradingOrder = typeof paperTradingOrders.$inferSelect;
export type InsertPaperTradingOrder = typeof paperTradingOrders.$inferInsert;

/**
 * Paper Trading Positions
 * Open positions in paper trading accounts
 */
export const paperTradingPositions = mysqlTable("paper_trading_positions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  accountId: varchar("accountId", { length: 64 }).notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  assetType: mysqlEnum("assetType", ["stock", "crypto"]).notNull(),
  quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
  averagePrice: decimal("averagePrice", { precision: 18, scale: 8 }).notNull(),
  currentPrice: decimal("currentPrice", { precision: 18, scale: 8 }).notNull(),
  marketValue: decimal("marketValue", { precision: 18, scale: 2 }).notNull(),
  unrealizedPnL: decimal("unrealizedPnL", { precision: 18, scale: 2 }).notNull(),
  unrealizedPnLPercent: decimal("unrealizedPnLPercent", { precision: 10, scale: 4 }).notNull(),
  realizedPnL: decimal("realizedPnL", { precision: 18, scale: 2 }).default("0").notNull(),
  openedAt: timestamp("openedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PaperTradingPosition = typeof paperTradingPositions.$inferSelect;
export type InsertPaperTradingPosition = typeof paperTradingPositions.$inferInsert;

/**
 * Paper Trading History
 * Trade execution history for paper trading
 */
export const paperTradingHistory = mysqlTable("paper_trading_history", {
  id: varchar("id", { length: 64 }).primaryKey(),
  accountId: varchar("accountId", { length: 64 }).notNull(),
  orderId: varchar("orderId", { length: 64 }).notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  assetType: mysqlEnum("assetType", ["stock", "crypto"]).notNull(),
  side: mysqlEnum("side", ["buy", "sell"]).notNull(),
  quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
  price: decimal("price", { precision: 18, scale: 8 }).notNull(),
  commission: decimal("commission", { precision: 18, scale: 8 }).notNull(),
  pnl: decimal("pnl", { precision: 18, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PaperTradingHistoryRecord = typeof paperTradingHistory.$inferSelect;
export type InsertPaperTradingHistoryRecord = typeof paperTradingHistory.$inferInsert;

/**
 * Price Alerts
 * User-configured price alerts
 */
export const priceAlerts = mysqlTable("price_alerts", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  assetType: mysqlEnum("assetType", ["stock", "crypto"]).notNull(),
  alertType: mysqlEnum("alertType", ["price_above", "price_below", "percent_change", "volume_spike"]).notNull(),
  targetValue: decimal("targetValue", { precision: 18, scale: 8 }).notNull(),
  currentValue: decimal("currentValue", { precision: 18, scale: 8 }),
  message: text("message"),
  isActive: boolean("isActive").default(true).notNull(),
  isTriggered: boolean("isTriggered").default(false).notNull(),
  triggeredAt: timestamp("triggeredAt"),
  notifyEmail: boolean("notifyEmail").default(true).notNull(),
  notifyPush: boolean("notifyPush").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PriceAlert = typeof priceAlerts.$inferSelect;
export type InsertPriceAlert = typeof priceAlerts.$inferInsert;

/**
 * Regime Change Alerts
 * Alerts for market regime changes
 */
export const regimeAlerts = mysqlTable("regime_alerts", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  fromRegime: mysqlEnum("fromRegime", ["bull", "bear", "sideways", "volatile"]),
  toRegime: mysqlEnum("toRegime", ["bull", "bear", "sideways", "volatile"]).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  isTriggered: boolean("isTriggered").default(false).notNull(),
  triggeredAt: timestamp("triggeredAt"),
  notifyEmail: boolean("notifyEmail").default(true).notNull(),
  notifyPush: boolean("notifyPush").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RegimeAlert = typeof regimeAlerts.$inferSelect;
export type InsertRegimeAlert = typeof regimeAlerts.$inferInsert;

/**
 * Sentiment Alerts
 * Alerts for sentiment shifts
 */
export const sentimentAlerts = mysqlTable("sentiment_alerts", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  alertType: mysqlEnum("alertType", ["sentiment_bullish", "sentiment_bearish", "fear_greed_extreme", "sentiment_shift"]).notNull(),
  threshold: decimal("threshold", { precision: 10, scale: 4 }),
  isActive: boolean("isActive").default(true).notNull(),
  isTriggered: boolean("isTriggered").default(false).notNull(),
  triggeredAt: timestamp("triggeredAt"),
  notifyEmail: boolean("notifyEmail").default(true).notNull(),
  notifyPush: boolean("notifyPush").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SentimentAlert = typeof sentimentAlerts.$inferSelect;
export type InsertSentimentAlert = typeof sentimentAlerts.$inferInsert;

// Alert History for new alert types is handled by the existing alertHistory table

/**
 * Crypto Watchlist
 * User's cryptocurrency watchlist
 */
export const cryptoWatchlist = mysqlTable("crypto_watchlist", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  notes: text("notes"),
  targetBuyPrice: decimal("targetBuyPrice", { precision: 18, scale: 8 }),
  targetSellPrice: decimal("targetSellPrice", { precision: 18, scale: 8 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CryptoWatchlistItem = typeof cryptoWatchlist.$inferSelect;
export type InsertCryptoWatchlistItem = typeof cryptoWatchlist.$inferInsert;


/**
 * Copy Trading - Traders
 * Top traders that can be copied
 */
export const copyTraders = mysqlTable("copy_traders", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  bio: text("bio"),
  totalReturn: decimal("totalReturn", { precision: 10, scale: 2 }).default("0").notNull(),
  winRate: decimal("winRate", { precision: 5, scale: 2 }).default("0").notNull(),
  totalTrades: int("totalTrades").default(0).notNull(),
  followers: int("followers").default(0).notNull(),
  riskScore: int("riskScore").default(5).notNull(),
  sharpeRatio: decimal("sharpeRatio", { precision: 6, scale: 3 }).default("0").notNull(),
  maxDrawdown: decimal("maxDrawdown", { precision: 6, scale: 2 }).default("0").notNull(),
  tradingStyle: mysqlEnum("tradingStyle", ["day_trader", "swing_trader", "position_trader", "scalper"]).default("swing_trader").notNull(),
  isVerified: boolean("isVerified").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CopyTrader = typeof copyTraders.$inferSelect;
export type InsertCopyTrader = typeof copyTraders.$inferInsert;

/**
 * Copy Trading - Settings
 * User's copy trading configurations
 */
export const copySettings = mysqlTable("copy_settings", {
  id: varchar("id", { length: 64 }).primaryKey(),
  followerId: varchar("followerId", { length: 64 }).notNull(),
  traderId: varchar("traderId", { length: 64 }).notNull(),
  allocationMode: mysqlEnum("allocationMode", ["fixed", "percentage", "proportional"]).default("fixed").notNull(),
  allocationAmount: decimal("allocationAmount", { precision: 18, scale: 2 }).default("1000").notNull(),
  maxPositionSize: decimal("maxPositionSize", { precision: 18, scale: 2 }).default("10000").notNull(),
  maxDailyLoss: decimal("maxDailyLoss", { precision: 18, scale: 2 }).default("500").notNull(),
  copyStopLoss: boolean("copyStopLoss").default(true).notNull(),
  copyTakeProfit: boolean("copyTakeProfit").default(true).notNull(),
  excludeSymbols: json("excludeSymbols").$type<string[]>(),
  status: mysqlEnum("status", ["active", "paused", "stopped"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CopySettingsRecord = typeof copySettings.$inferSelect;
export type InsertCopySettings = typeof copySettings.$inferInsert;

/**
 * Copy Trading - Trades
 * Copied trade history
 */
export const copyTrades = mysqlTable("copy_trades", {
  id: varchar("id", { length: 64 }).primaryKey(),
  copySettingsId: varchar("copySettingsId", { length: 64 }).notNull(),
  originalTradeId: varchar("originalTradeId", { length: 64 }),
  followerId: varchar("followerId", { length: 64 }).notNull(),
  traderId: varchar("traderId", { length: 64 }).notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  side: mysqlEnum("side", ["buy", "sell"]).notNull(),
  originalQuantity: decimal("originalQuantity", { precision: 18, scale: 8 }).notNull(),
  copiedQuantity: decimal("copiedQuantity", { precision: 18, scale: 8 }).notNull(),
  originalPrice: decimal("originalPrice", { precision: 18, scale: 8 }).notNull(),
  copiedPrice: decimal("copiedPrice", { precision: 18, scale: 8 }).notNull(),
  slippage: decimal("slippage", { precision: 8, scale: 4 }).default("0").notNull(),
  pnl: decimal("pnl", { precision: 18, scale: 2 }),
  status: mysqlEnum("status", ["pending", "executed", "failed", "cancelled"]).default("pending").notNull(),
  executedAt: timestamp("executedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CopyTradeRecord = typeof copyTrades.$inferSelect;
export type InsertCopyTrade = typeof copyTrades.$inferInsert;

/**
 * Trading Journal - Entries
 * User's trading journal entries
 */
export const journalEntries = mysqlTable("journal_entries", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  tradeId: varchar("tradeId", { length: 64 }),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  side: mysqlEnum("side", ["long", "short"]).notNull(),
  entryPrice: decimal("entryPrice", { precision: 18, scale: 8 }).notNull(),
  exitPrice: decimal("exitPrice", { precision: 18, scale: 8 }),
  quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
  entryDate: timestamp("entryDate").notNull(),
  exitDate: timestamp("exitDate"),
  setup: mysqlEnum("setup", ["breakout", "pullback", "reversal", "trend_following", "range_bound", "news_based", "technical", "fundamental", "other"]).default("other").notNull(),
  emotionBefore: mysqlEnum("emotionBefore", ["confident", "anxious", "greedy", "fearful", "neutral", "excited", "frustrated", "calm"]).default("neutral").notNull(),
  emotionDuring: mysqlEnum("emotionDuring", ["confident", "anxious", "greedy", "fearful", "neutral", "excited", "frustrated", "calm"]),
  emotionAfter: mysqlEnum("emotionAfter", ["confident", "anxious", "greedy", "fearful", "neutral", "excited", "frustrated", "calm"]),
  confidenceLevel: int("confidenceLevel").default(5).notNull(),
  planFollowed: boolean("planFollowed").default(true).notNull(),
  notes: text("notes").notNull(),
  lessonsLearned: text("lessonsLearned"),
  mistakes: json("mistakes").$type<string[]>(),
  tags: json("tags").$type<string[]>(),
  screenshots: json("screenshots").$type<string[]>(),
  outcome: mysqlEnum("outcome", ["win", "loss", "breakeven", "open"]).default("open"),
  pnl: decimal("pnl", { precision: 18, scale: 2 }),
  pnlPercent: decimal("pnlPercent", { precision: 8, scale: 4 }),
  riskRewardRatio: decimal("riskRewardRatio", { precision: 6, scale: 2 }),
  holdingPeriod: int("holdingPeriod"), // in minutes
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type JournalEntryRecord = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = typeof journalEntries.$inferInsert;

/**
 * Exchange Connections
 * User's connected exchange accounts
 */
export const exchangeConnections = mysqlTable("exchange_connections", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  exchange: mysqlEnum("exchange", ["binance", "coinbase", "alpaca", "interactive_brokers"]).notNull(),
  status: mysqlEnum("status", ["connected", "disconnected", "error", "pending"]).default("pending").notNull(),
  apiKeyEncrypted: text("apiKeyEncrypted"),
  apiSecretEncrypted: text("apiSecretEncrypted"),
  passphraseEncrypted: text("passphraseEncrypted"),
  accountId: varchar("accountId", { length: 64 }),
  permissions: json("permissions").$type<string[]>(),
  error: text("error"),
  lastSyncAt: timestamp("lastSyncAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExchangeConnectionRecord = typeof exchangeConnections.$inferSelect;
export type InsertExchangeConnection = typeof exchangeConnections.$inferInsert;

/**
 * Exchange Orders
 * Orders placed through connected exchanges
 */
export const exchangeOrders = mysqlTable("exchange_orders", {
  id: varchar("id", { length: 64 }).primaryKey(),
  connectionId: varchar("connectionId", { length: 64 }).notNull(),
  userId: varchar("userId", { length: 64 }).notNull(),
  exchangeOrderId: varchar("exchangeOrderId", { length: 128 }),
  exchange: mysqlEnum("exchange", ["binance", "coinbase", "alpaca", "interactive_brokers"]).notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  side: mysqlEnum("side", ["buy", "sell"]).notNull(),
  orderType: mysqlEnum("orderType", ["market", "limit", "stop", "stop_limit"]).notNull(),
  quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
  price: decimal("price", { precision: 18, scale: 8 }),
  stopPrice: decimal("stopPrice", { precision: 18, scale: 8 }),
  filledQuantity: decimal("filledQuantity", { precision: 18, scale: 8 }).default("0").notNull(),
  avgFillPrice: decimal("avgFillPrice", { precision: 18, scale: 8 }),
  status: mysqlEnum("status", ["pending", "open", "filled", "partially_filled", "cancelled", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExchangeOrderRecord = typeof exchangeOrders.$inferSelect;
export type InsertExchangeOrder = typeof exchangeOrders.$inferInsert;
