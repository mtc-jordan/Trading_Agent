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
