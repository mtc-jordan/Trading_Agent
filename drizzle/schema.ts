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
