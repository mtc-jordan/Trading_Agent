import { eq, sql, desc, count, sum, gte, lte, like, or, inArray, and, lt, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  tradingAccounts, InsertTradingAccount, TradingAccount,
  tradingBots, InsertTradingBot, TradingBot,
  trades, InsertTrade, Trade,
  backtests, InsertBacktest, Backtest,
  portfolioSnapshots, InsertPortfolioSnapshot,
  agentAnalyses, InsertAgentAnalysis,
  marketplaceListings, InsertMarketplaceListing,
  botCopies, InsertBotCopy,
  watchlists, InsertWatchlist,
  subscriptionTierLimits, SubscriptionTier,
  userLlmSettings, InsertUserLlmSettings, UserLlmSettings,
  llmUsageLogs, InsertLlmUsageLog, LlmUsageLog,
  userFallbackSettings, InsertUserFallbackSettings, UserFallbackSettings,
  // Phase 14: Performance Tracking
  priceTracking, InsertPriceTracking, PriceTracking,
  predictionAccuracy, InsertPredictionAccuracy, PredictionAccuracy,
  // Phase 15: Saved Comparisons & Watchlists
  savedComparisons, InsertSavedComparison, SavedComparison,
  watchlistAlerts, InsertWatchlistAlert, WatchlistAlert,
  alertHistory, InsertAlertHistory, AlertHistory,
  // Phase 16: Real-Time Features
  userNotifications, InsertUserNotification, UserNotification,
  realtimeSubscriptions, InsertRealtimeSubscription, RealtimeSubscription,
  // Phase 17: Advanced Bot Features
  botSchedules, InsertBotSchedule, BotSchedule,
  botRiskRules, InsertBotRiskRule, BotRiskRule,
  botExecutionLogs, InsertBotExecutionLog, BotExecutionLog,
  botBenchmarks, InsertBotBenchmark, BotBenchmark,
  // Phase 18: Social & Community
  userProfiles, InsertUserProfile, UserProfile,
  userFollows, InsertUserFollow, UserFollow,
  discussionThreads, InsertDiscussionThread, DiscussionThread,
  discussionComments, InsertDiscussionComment, DiscussionComment,
  strategyRatings, InsertStrategyRating, StrategyRating,
  activityFeed, InsertActivityFeed, ActivityFeed,
  userBadges, InsertUserBadge, UserBadge,
  badgeDefinitions, BadgeId,
  // Phase 32-33: Email Configuration & Verification
  emailConfig, InsertEmailConfig, EmailConfig,
  emailVerifications, InsertEmailVerification, EmailVerification
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ==================== USER OPERATIONS ====================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserSubscription(userId: number, data: {
  subscriptionTier?: SubscriptionTier;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: "active" | "canceled" | "past_due" | "trialing" | "incomplete";
  subscriptionEndsAt?: Date | null;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function updateUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// ==================== TRADING ACCOUNT OPERATIONS ====================

export async function createTradingAccount(data: InsertTradingAccount) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tradingAccounts).values(data);
  return result[0].insertId;
}

export async function getUserTradingAccounts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tradingAccounts)
    .where(eq(tradingAccounts.userId, userId))
    .orderBy(desc(tradingAccounts.createdAt));
}

export async function getTradingAccountById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tradingAccounts)
    .where(and(eq(tradingAccounts.id, id), eq(tradingAccounts.userId, userId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateTradingAccountBalance(id: number, balance: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(tradingAccounts).set({ balance }).where(eq(tradingAccounts.id, id));
}

// ==================== TRADING BOT OPERATIONS ====================

export async function createTradingBot(data: InsertTradingBot) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tradingBots).values(data);
  return result[0].insertId;
}

export async function getUserTradingBots(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tradingBots)
    .where(eq(tradingBots.userId, userId))
    .orderBy(desc(tradingBots.createdAt));
}

export async function getTradingBotById(id: number, userId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  const conditions = userId 
    ? and(eq(tradingBots.id, id), eq(tradingBots.userId, userId))
    : eq(tradingBots.id, id);
  const result = await db.select().from(tradingBots).where(conditions).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateTradingBot(id: number, userId: number, data: Partial<TradingBot>) {
  const db = await getDb();
  if (!db) return;
  await db.update(tradingBots).set(data)
    .where(and(eq(tradingBots.id, id), eq(tradingBots.userId, userId)));
}

export async function updateBotPerformance(id: number, data: {
  totalTrades?: number;
  winningTrades?: number;
  totalPnl?: string;
  sharpeRatio?: string;
  maxDrawdown?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(tradingBots).set(data).where(eq(tradingBots.id, id));
}

export async function getPublicBots() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tradingBots)
    .where(eq(tradingBots.isPublic, true))
    .orderBy(desc(tradingBots.totalPnl));
}

// ==================== TRADE OPERATIONS ====================

export async function createTrade(data: InsertTrade) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(trades).values(data);
  return result[0].insertId;
}

export async function getUserTrades(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(trades)
    .where(eq(trades.userId, userId))
    .orderBy(desc(trades.createdAt))
    .limit(limit);
}

export async function getAccountTrades(accountId: number, userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(trades)
    .where(and(eq(trades.accountId, accountId), eq(trades.userId, userId)))
    .orderBy(desc(trades.createdAt))
    .limit(limit);
}

export async function getBotTrades(botId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(trades)
    .where(eq(trades.botId, botId))
    .orderBy(desc(trades.createdAt))
    .limit(limit);
}

export async function updateTradeStatus(id: number, data: {
  status: "pending" | "filled" | "partial" | "canceled" | "rejected";
  filledPrice?: string;
  filledQuantity?: string;
  pnl?: string;
  filledAt?: Date;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(trades).set(data).where(eq(trades.id, id));
}

// ==================== BACKTEST OPERATIONS ====================

export async function createBacktest(data: InsertBacktest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(backtests).values(data);
  return result[0].insertId;
}

export async function getUserBacktests(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(backtests)
    .where(eq(backtests.userId, userId))
    .orderBy(desc(backtests.createdAt));
}

export async function getBacktestById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(backtests)
    .where(and(eq(backtests.id, id), eq(backtests.userId, userId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateBacktestResults(id: number, data: {
  status: "pending" | "running" | "completed" | "failed";
  finalCapital?: string;
  totalReturn?: string;
  sharpeRatio?: string;
  maxDrawdown?: string;
  winRate?: string;
  profitFactor?: string;
  totalTrades?: number;
  results?: unknown;
  completedAt?: Date;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(backtests).set(data).where(eq(backtests.id, id));
}

// ==================== PORTFOLIO SNAPSHOT OPERATIONS ====================

export async function createPortfolioSnapshot(data: InsertPortfolioSnapshot) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(portfolioSnapshots).values(data);
}

export async function getPortfolioSnapshots(accountId: number, userId: number, days = 30) {
  const db = await getDb();
  if (!db) return [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return db.select().from(portfolioSnapshots)
    .where(and(
      eq(portfolioSnapshots.accountId, accountId),
      eq(portfolioSnapshots.userId, userId),
      gte(portfolioSnapshots.snapshotDate, startDate)
    ))
    .orderBy(portfolioSnapshots.snapshotDate);
}

// ==================== AGENT ANALYSIS OPERATIONS ====================

export async function createAgentAnalysis(data: InsertAgentAnalysis) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(agentAnalyses).values(data);
  return result[0].insertId;
}

export async function getLatestAgentAnalysis(symbol: string, userId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  const conditions = userId 
    ? and(eq(agentAnalyses.symbol, symbol), eq(agentAnalyses.userId, userId))
    : eq(agentAnalyses.symbol, symbol);
  const result = await db.select().from(agentAnalyses)
    .where(conditions)
    .orderBy(desc(agentAnalyses.createdAt))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAgentAnalysisHistory(symbol: string, userId: number, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agentAnalyses)
    .where(and(eq(agentAnalyses.symbol, symbol), eq(agentAnalyses.userId, userId)))
    .orderBy(desc(agentAnalyses.createdAt))
    .limit(limit);
}

// Enhanced analysis history with filtering
export interface AnalysisHistoryFilters {
  userId: number;
  symbol?: string;
  consensusAction?: string;
  startDate?: Date;
  endDate?: Date;
  minConfidence?: number;
  limit?: number;
  offset?: number;
}

export async function getFilteredAnalysisHistory(filters: AnalysisHistoryFilters) {
  const db = await getDb();
  if (!db) return { analyses: [], total: 0 };
  
  const conditions: ReturnType<typeof eq>[] = [eq(agentAnalyses.userId, filters.userId)];
  
  if (filters.symbol) {
    conditions.push(eq(agentAnalyses.symbol, filters.symbol));
  }
  
  if (filters.consensusAction) {
    conditions.push(eq(agentAnalyses.consensusAction, filters.consensusAction as any));
  }
  
  if (filters.startDate) {
    conditions.push(gte(agentAnalyses.createdAt, filters.startDate));
  }
  
  if (filters.endDate) {
    conditions.push(lte(agentAnalyses.createdAt, filters.endDate));
  }
  
  if (filters.minConfidence !== undefined) {
    conditions.push(gte(agentAnalyses.confidence, filters.minConfidence.toString()));
  }
  
  const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];
  
  // Get total count
  const [countResult] = await db.select({ count: sql<number>`count(*)` })
    .from(agentAnalyses)
    .where(whereClause);
  
  // Get paginated results
  const analyses = await db.select().from(agentAnalyses)
    .where(whereClause)
    .orderBy(desc(agentAnalyses.createdAt))
    .limit(filters.limit || 20)
    .offset(filters.offset || 0);
  
  return {
    analyses,
    total: countResult?.count || 0,
  };
}

export async function getAnalysisById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(agentAnalyses)
    .where(and(eq(agentAnalyses.id, id), eq(agentAnalyses.userId, userId)))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function getAnalysisStats(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const [totalCount] = await db.select({ count: sql<number>`count(*)` })
    .from(agentAnalyses)
    .where(eq(agentAnalyses.userId, userId));
  
  const actionCounts = await db.select({
    action: agentAnalyses.consensusAction,
    count: sql<number>`count(*)`
  })
    .from(agentAnalyses)
    .where(eq(agentAnalyses.userId, userId))
    .groupBy(agentAnalyses.consensusAction);
  
  const symbolCounts = await db.select({
    symbol: agentAnalyses.symbol,
    count: sql<number>`count(*)`
  })
    .from(agentAnalyses)
    .where(eq(agentAnalyses.userId, userId))
    .groupBy(agentAnalyses.symbol)
    .orderBy(desc(sql`count(*)`));
  
  const [avgConfidence] = await db.select({
    avg: sql<number>`AVG(confidence)`
  })
    .from(agentAnalyses)
    .where(eq(agentAnalyses.userId, userId));
  
  return {
    totalAnalyses: totalCount?.count || 0,
    byAction: actionCounts,
    bySymbol: symbolCounts.slice(0, 10), // Top 10 symbols
    avgConfidence: avgConfidence?.avg || 0,
  };
}

export async function getUniqueSymbols(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.selectDistinct({ symbol: agentAnalyses.symbol })
    .from(agentAnalyses)
    .where(eq(agentAnalyses.userId, userId))
    .orderBy(agentAnalyses.symbol);
  
  return result.map(r => r.symbol);
}

// ==================== MARKETPLACE OPERATIONS ====================

export async function createMarketplaceListing(data: InsertMarketplaceListing) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(marketplaceListings).values(data);
  return result[0].insertId;
}

export async function getMarketplaceListings(category?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = category 
    ? and(eq(marketplaceListings.isActive, true), eq(marketplaceListings.category, category as any))
    : eq(marketplaceListings.isActive, true);
  return db.select().from(marketplaceListings)
    .where(conditions)
    .orderBy(desc(marketplaceListings.totalCopies));
}

export async function getFeaturedListings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(marketplaceListings)
    .where(and(eq(marketplaceListings.isActive, true), eq(marketplaceListings.isFeatured, true)))
    .orderBy(desc(marketplaceListings.rating));
}

export async function getLeaderboard(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(marketplaceListings)
    .where(eq(marketplaceListings.isActive, true))
    .orderBy(desc(marketplaceListings.monthlyReturn))
    .limit(limit);
}

export async function updateListingStats(id: number, data: {
  totalCopies?: number;
  totalRevenue?: string;
  rating?: string;
  reviewCount?: number;
  monthlyReturn?: string;
  monthlyTrades?: number;
  winRate?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(marketplaceListings).set(data).where(eq(marketplaceListings.id, id));
}

// ==================== BOT COPY OPERATIONS ====================

export async function createBotCopy(data: InsertBotCopy) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(botCopies).values(data);
}

export async function getUserBotCopies(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(botCopies)
    .where(eq(botCopies.userId, userId))
    .orderBy(desc(botCopies.createdAt));
}

// ==================== WATCHLIST OPERATIONS ====================

export async function createWatchlist(data: InsertWatchlist) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(watchlists).values(data);
  return result[0].insertId;
}

export async function getUserWatchlists(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(watchlists)
    .where(eq(watchlists.userId, userId))
    .orderBy(desc(watchlists.createdAt));
}

export async function updateWatchlist(id: number, userId: number, data: { name?: string; symbols?: unknown }) {
  const db = await getDb();
  if (!db) return;
  await db.update(watchlists).set(data)
    .where(and(eq(watchlists.id, id), eq(watchlists.userId, userId)));
}

export async function deleteWatchlist(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(watchlists)
    .where(and(eq(watchlists.id, id), eq(watchlists.userId, userId)));
}

// ==================== SUBSCRIPTION TIER HELPERS ====================

export function getTierLimits(tier: SubscriptionTier) {
  return subscriptionTierLimits[tier];
}

export async function checkTierLimit(userId: number, limitType: keyof typeof subscriptionTierLimits.free): Promise<{ allowed: boolean; current: number; limit: number }> {
  const db = await getDb();
  if (!db) return { allowed: false, current: 0, limit: 0 };
  
  const user = await getUserById(userId);
  if (!user) return { allowed: false, current: 0, limit: 0 };
  
  const limits = getTierLimits(user.subscriptionTier as SubscriptionTier);
  const limit = limits[limitType];
  
  if (typeof limit === 'boolean') {
    return { allowed: limit, current: 0, limit: limit ? 1 : 0 };
  }
  
  if (limit === -1) {
    return { allowed: true, current: 0, limit: -1 }; // Unlimited
  }
  
  let current = 0;
  if (limitType === 'maxBots') {
    const bots = await getUserTradingBots(userId);
    current = bots.length;
  } else if (limitType === 'maxAccounts') {
    const accounts = await getUserTradingAccounts(userId);
    current = accounts.length;
  }
  
  return { allowed: current < limit, current, limit };
}

// ==================== ADMIN OPERATIONS ====================

export async function getAdminStats() {
  const db = await getDb();
  if (!db) return null;
  
  const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const [botCount] = await db.select({ count: sql<number>`count(*)` }).from(tradingBots);
  const [tradeCount] = await db.select({ count: sql<number>`count(*)` }).from(trades);
  const [backtestCount] = await db.select({ count: sql<number>`count(*)` }).from(backtests);
  
  const tierCounts = await db.select({
    tier: users.subscriptionTier,
    count: sql<number>`count(*)`
  }).from(users).groupBy(users.subscriptionTier);
  
  return {
    totalUsers: userCount?.count || 0,
    totalBots: botCount?.count || 0,
    totalTrades: tradeCount?.count || 0,
    totalBacktests: backtestCount?.count || 0,
    usersByTier: tierCounts,
  };
}


// ==================== USER LLM SETTINGS OPERATIONS ====================

export async function getUserLlmSettings(userId: number): Promise<UserLlmSettings | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(userLlmSettings)
    .where(eq(userLlmSettings.userId, userId))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function createUserLlmSettings(data: InsertUserLlmSettings): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(userLlmSettings).values(data);
  return result[0].insertId;
}

export async function updateUserLlmSettings(
  userId: number, 
  data: Partial<Omit<InsertUserLlmSettings, 'userId'>>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(userLlmSettings)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(userLlmSettings.userId, userId));
}

export async function upsertUserLlmSettings(
  userId: number,
  data: Partial<Omit<InsertUserLlmSettings, 'userId'>>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getUserLlmSettings(userId);
  
  if (existing) {
    await updateUserLlmSettings(userId, data);
  } else {
    await createUserLlmSettings({ userId, ...data } as InsertUserLlmSettings);
  }
}

export async function updateLlmUsage(userId: number, tokensUsed: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const existing = await getUserLlmSettings(userId);
  
  if (existing) {
    await db.update(userLlmSettings)
      .set({ 
        totalTokensUsed: (existing.totalTokensUsed || 0) + tokensUsed,
        lastUsedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(userLlmSettings.userId, userId));
  }
}

export async function deleteUserLlmSettings(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.delete(userLlmSettings)
    .where(eq(userLlmSettings.userId, userId));
}


// ==================== LLM USAGE LOGGING OPERATIONS ====================

export async function logLlmUsage(data: InsertLlmUsageLog): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(llmUsageLogs).values(data);
  return result[0].insertId;
}

export async function getUserLlmUsageLogs(
  userId: number, 
  options?: { 
    limit?: number; 
    offset?: number; 
    startDate?: Date; 
    endDate?: Date;
    provider?: string;
  }
): Promise<LlmUsageLog[]> {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(llmUsageLogs)
    .where(eq(llmUsageLogs.userId, userId))
    .orderBy(desc(llmUsageLogs.createdAt));
  
  if (options?.limit) {
    query = query.limit(options.limit) as typeof query;
  }
  if (options?.offset) {
    query = query.offset(options.offset) as typeof query;
  }
  
  return query;
}

export async function getUserUsageStats(
  userId: number,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalTokens: number;
  totalCostCents: number;
  callCount: number;
  avgResponseTimeMs: number;
  successRate: number;
  fallbackRate: number;
  byProvider: Record<string, { tokens: number; costCents: number; calls: number }>;
  byDay: { date: string; tokens: number; costCents: number; calls: number }[];
}> {
  const db = await getDb();
  if (!db) {
    return {
      totalTokens: 0,
      totalCostCents: 0,
      callCount: 0,
      avgResponseTimeMs: 0,
      successRate: 100,
      fallbackRate: 0,
      byProvider: {},
      byDay: [],
    };
  }
  
  // Get all logs for the user within date range
  const conditions = [eq(llmUsageLogs.userId, userId)];
  if (startDate) {
    conditions.push(gte(llmUsageLogs.createdAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(llmUsageLogs.createdAt, endDate));
  }
  
  const logs = await db.select().from(llmUsageLogs)
    .where(and(...conditions))
    .orderBy(desc(llmUsageLogs.createdAt));
  
  // Calculate stats
  let totalTokens = 0;
  let totalCostCents = 0;
  let totalResponseTime = 0;
  let successCount = 0;
  let fallbackCount = 0;
  const byProvider: Record<string, { tokens: number; costCents: number; calls: number }> = {};
  const byDayMap: Record<string, { tokens: number; costCents: number; calls: number }> = {};
  
  for (const log of logs) {
    totalTokens += log.totalTokens;
    totalCostCents += log.costCents;
    totalResponseTime += log.responseTimeMs || 0;
    if (log.success) successCount++;
    if (log.wasFallback) fallbackCount++;
    
    // By provider
    if (!byProvider[log.provider]) {
      byProvider[log.provider] = { tokens: 0, costCents: 0, calls: 0 };
    }
    byProvider[log.provider].tokens += log.totalTokens;
    byProvider[log.provider].costCents += log.costCents;
    byProvider[log.provider].calls++;
    
    // By day
    const dateKey = log.createdAt.toISOString().split('T')[0];
    if (!byDayMap[dateKey]) {
      byDayMap[dateKey] = { tokens: 0, costCents: 0, calls: 0 };
    }
    byDayMap[dateKey].tokens += log.totalTokens;
    byDayMap[dateKey].costCents += log.costCents;
    byDayMap[dateKey].calls++;
  }
  
  const callCount = logs.length;
  
  return {
    totalTokens,
    totalCostCents,
    callCount,
    avgResponseTimeMs: callCount > 0 ? Math.round(totalResponseTime / callCount) : 0,
    successRate: callCount > 0 ? Math.round((successCount / callCount) * 100) : 100,
    fallbackRate: callCount > 0 ? Math.round((fallbackCount / callCount) * 100) : 0,
    byProvider,
    byDay: Object.entries(byDayMap)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export async function getRecentUsageSummary(userId: number, days: number = 30): Promise<{
  totalCostCents: number;
  totalTokens: number;
  callCount: number;
  topProvider: string | null;
  dailyAvgCostCents: number;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const stats = await getUserUsageStats(userId, startDate);
  
  // Find top provider
  let topProvider: string | null = null;
  let maxCalls = 0;
  for (const [provider, data] of Object.entries(stats.byProvider)) {
    if (data.calls > maxCalls) {
      maxCalls = data.calls;
      topProvider = provider;
    }
  }
  
  return {
    totalCostCents: stats.totalCostCents,
    totalTokens: stats.totalTokens,
    callCount: stats.callCount,
    topProvider,
    dailyAvgCostCents: days > 0 ? Math.round(stats.totalCostCents / days) : 0,
  };
}

// ==================== USER FALLBACK SETTINGS OPERATIONS ====================

export async function getUserFallbackSettings(userId: number): Promise<UserFallbackSettings | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(userFallbackSettings)
    .where(eq(userFallbackSettings.userId, userId))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function createUserFallbackSettings(data: InsertUserFallbackSettings): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(userFallbackSettings).values(data);
  return result[0].insertId;
}

export async function updateUserFallbackSettings(
  userId: number,
  data: Partial<Omit<InsertUserFallbackSettings, 'userId'>>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(userFallbackSettings)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(userFallbackSettings.userId, userId));
}

export async function upsertUserFallbackSettings(
  userId: number,
  data: Partial<Omit<InsertUserFallbackSettings, 'userId'>>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getUserFallbackSettings(userId);
  
  if (existing) {
    await updateUserFallbackSettings(userId, data);
  } else {
    // Set default fallback priority if not provided
    const defaultPriority = ["openai", "claude", "deepseek", "gemini"];
    await createUserFallbackSettings({ 
      userId, 
      fallbackPriority: data.fallbackPriority || defaultPriority,
      ...data 
    } as InsertUserFallbackSettings);
  }
}

// ==================== ADMIN LLM USAGE STATS ====================

export async function getAdminLlmUsageStats(): Promise<{
  totalCostCents: number;
  totalTokens: number;
  totalCalls: number;
  byProvider: Record<string, { tokens: number; costCents: number; calls: number }>;
  topUsers: { userId: number; costCents: number; calls: number }[];
}> {
  const db = await getDb();
  if (!db) {
    return {
      totalCostCents: 0,
      totalTokens: 0,
      totalCalls: 0,
      byProvider: {},
      topUsers: [],
    };
  }
  
  // Get all logs
  const logs = await db.select().from(llmUsageLogs);
  
  let totalCostCents = 0;
  let totalTokens = 0;
  const byProvider: Record<string, { tokens: number; costCents: number; calls: number }> = {};
  const byUser: Record<number, { costCents: number; calls: number }> = {};
  
  for (const log of logs) {
    totalCostCents += log.costCents;
    totalTokens += log.totalTokens;
    
    // By provider
    if (!byProvider[log.provider]) {
      byProvider[log.provider] = { tokens: 0, costCents: 0, calls: 0 };
    }
    byProvider[log.provider].tokens += log.totalTokens;
    byProvider[log.provider].costCents += log.costCents;
    byProvider[log.provider].calls++;
    
    // By user
    if (!byUser[log.userId]) {
      byUser[log.userId] = { costCents: 0, calls: 0 };
    }
    byUser[log.userId].costCents += log.costCents;
    byUser[log.userId].calls++;
  }
  
  // Get top 10 users by cost
  const topUsers = Object.entries(byUser)
    .map(([userId, stats]) => ({ userId: parseInt(userId), ...stats }))
    .sort((a, b) => b.costCents - a.costCents)
    .slice(0, 10);
  
  return {
    totalCostCents,
    totalTokens,
    totalCalls: logs.length,
    byProvider,
    topUsers,
  };
}


// ==================== PHASE 14: PERFORMANCE TRACKING & ACCURACY ====================

export async function createPriceTracking(data: InsertPriceTracking): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(priceTracking).values(data);
  return result[0].insertId;
}

export async function getPriceTrackingByAnalysis(analysisId: number): Promise<PriceTracking | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(priceTracking)
    .where(eq(priceTracking.analysisId, analysisId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updatePriceTracking(id: number, data: Partial<InsertPriceTracking>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(priceTracking).set({ ...data, lastUpdatedAt: new Date() })
    .where(eq(priceTracking.id, id));
}

export async function getPendingPriceTrackings(): Promise<PriceTracking[]> {
  const db = await getDb();
  if (!db) return [];
  // Get price trackings that haven't been fully tracked yet (missing 30-day price)
  return db.select().from(priceTracking)
    .where(sql`price_30_day IS NULL`)
    .orderBy(asc(priceTracking.createdAt));
}

export async function createPredictionAccuracy(data: InsertPredictionAccuracy): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(predictionAccuracy).values(data);
  return result[0].insertId;
}

export async function getUserPredictionAccuracy(userId: number): Promise<PredictionAccuracy[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(predictionAccuracy)
    .where(eq(predictionAccuracy.userId, userId))
    .orderBy(desc(predictionAccuracy.updatedAt));
}

export async function getAgentAccuracyStats(userId: number): Promise<{
  overall: { correct: number; total: number; accuracy: number };
  byAgent: Record<string, { correct: number; total: number; accuracy: number }>;
  byTimeframe: Record<string, { correct: number; total: number; accuracy: number }>;
}> {
  const db = await getDb();
  if (!db) return { overall: { correct: 0, total: 0, accuracy: 0 }, byAgent: {}, byTimeframe: {} };
  
  const records = await db.select().from(predictionAccuracy)
    .where(eq(predictionAccuracy.userId, userId));
  
  let totalCorrect = 0;
  let totalCount = 0;
  const byAgent: Record<string, { correct: number; total: number }> = {};
  const byTimeframe: Record<string, { correct: number; total: number }> = {};
  
  for (const record of records) {
    totalCount += record.totalPredictions;
    totalCorrect += record.correctPredictions;
    
    // By agent
    const agentKey = record.agentType || 'consensus';
    if (!byAgent[agentKey]) {
      byAgent[agentKey] = { correct: 0, total: 0 };
    }
    byAgent[agentKey].total += record.totalPredictions;
    byAgent[agentKey].correct += record.correctPredictions;
    
    // By timeframe
    const tfKey = record.timeframe;
    if (!byTimeframe[tfKey]) {
      byTimeframe[tfKey] = { correct: 0, total: 0 };
    }
    byTimeframe[tfKey].total += record.totalPredictions;
    byTimeframe[tfKey].correct += record.correctPredictions;
  }
  
  const calcAccuracy = (c: number, t: number) => t > 0 ? Math.round((c / t) * 100) : 0;
  
  return {
    overall: { correct: totalCorrect, total: totalCount, accuracy: calcAccuracy(totalCorrect, totalCount) },
    byAgent: Object.fromEntries(
      Object.entries(byAgent).map(([k, v]) => [k, { ...v, accuracy: calcAccuracy(v.correct, v.total) }])
    ),
    byTimeframe: Object.fromEntries(
      Object.entries(byTimeframe).map(([k, v]) => [k, { ...v, accuracy: calcAccuracy(v.correct, v.total) }])
    ),
  };
}

// ==================== PHASE 15: SAVED COMPARISONS & WATCHLISTS ====================

export async function createSavedComparison(data: InsertSavedComparison): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(savedComparisons).values(data);
  return result[0].insertId;
}

export async function getUserSavedComparisons(userId: number): Promise<SavedComparison[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(savedComparisons)
    .where(eq(savedComparisons.userId, userId))
    .orderBy(desc(savedComparisons.updatedAt));
}

export async function getSavedComparisonById(id: number, userId: number): Promise<SavedComparison | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(savedComparisons)
    .where(and(eq(savedComparisons.id, id), eq(savedComparisons.userId, userId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateSavedComparison(id: number, userId: number, data: Partial<InsertSavedComparison>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(savedComparisons).set({ ...data, updatedAt: new Date() })
    .where(and(eq(savedComparisons.id, id), eq(savedComparisons.userId, userId)));
}

export async function deleteSavedComparison(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(savedComparisons)
    .where(and(eq(savedComparisons.id, id), eq(savedComparisons.userId, userId)));
}

export async function createWatchlistAlert(data: InsertWatchlistAlert): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(watchlistAlerts).values(data);
  return result[0].insertId;
}

export async function getUserWatchlistAlerts(userId: number): Promise<WatchlistAlert[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(watchlistAlerts)
    .where(eq(watchlistAlerts.userId, userId))
    .orderBy(desc(watchlistAlerts.createdAt));
}

export async function getActiveWatchlistAlerts(): Promise<WatchlistAlert[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(watchlistAlerts)
    .where(eq(watchlistAlerts.isActive, true))
    .orderBy(asc(watchlistAlerts.createdAt));
}

export async function updateWatchlistAlert(id: number, userId: number, data: Partial<InsertWatchlistAlert>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(watchlistAlerts).set({ ...data, updatedAt: new Date() })
    .where(and(eq(watchlistAlerts.id, id), eq(watchlistAlerts.userId, userId)));
}

export async function deleteWatchlistAlert(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(watchlistAlerts)
    .where(and(eq(watchlistAlerts.id, id), eq(watchlistAlerts.userId, userId)));
}

export async function createAlertHistory(data: InsertAlertHistory): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(alertHistory).values(data);
  return result[0].insertId;
}

export async function getUserAlertHistory(userId: number, limit = 50): Promise<AlertHistory[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(alertHistory)
    .where(eq(alertHistory.userId, userId))
    .orderBy(desc(alertHistory.createdAt))
    .limit(limit);
}

// ==================== PHASE 16: REAL-TIME FEATURES ====================

export async function createUserNotification(data: InsertUserNotification): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(userNotifications).values(data);
  return result[0].insertId;
}

export async function getUserNotifications(userId: number, unreadOnly = false): Promise<UserNotification[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = unreadOnly
    ? and(eq(userNotifications.userId, userId), eq(userNotifications.isRead, false))
    : eq(userNotifications.userId, userId);
  return db.select().from(userNotifications)
    .where(conditions)
    .orderBy(desc(userNotifications.createdAt))
    .limit(100);
}

export async function markNotificationRead(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(userNotifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(userNotifications.id, id), eq(userNotifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(userNotifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(userNotifications.userId, userId), eq(userNotifications.isRead, false)));
}

export async function deleteNotification(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(userNotifications)
    .where(and(eq(userNotifications.id, id), eq(userNotifications.userId, userId)));
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const [result] = await db.select({ count: sql<number>`count(*)` })
    .from(userNotifications)
    .where(and(eq(userNotifications.userId, userId), eq(userNotifications.isRead, false)));
  return result?.count || 0;
}

export async function createRealtimeSubscription(data: InsertRealtimeSubscription): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(realtimeSubscriptions).values(data);
  return result[0].insertId;
}

export async function getUserRealtimeSubscriptions(userId: number): Promise<RealtimeSubscription[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(realtimeSubscriptions)
    .where(and(eq(realtimeSubscriptions.userId, userId), eq(realtimeSubscriptions.isActive, true)));
}

export async function deleteRealtimeSubscription(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(realtimeSubscriptions)
    .where(and(eq(realtimeSubscriptions.id, id), eq(realtimeSubscriptions.userId, userId)));
}

// ==================== PHASE 17: ADVANCED BOT FEATURES ====================

export async function createBotSchedule(data: InsertBotSchedule): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(botSchedules).values(data);
  return result[0].insertId;
}

export async function getBotSchedules(botId: number): Promise<BotSchedule[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(botSchedules)
    .where(eq(botSchedules.botId, botId))
    .orderBy(desc(botSchedules.createdAt));
}

export async function getActiveBotSchedules(): Promise<BotSchedule[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(botSchedules)
    .where(eq(botSchedules.isActive, true));
}

export async function updateBotSchedule(id: number, data: Partial<InsertBotSchedule>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(botSchedules).set({ ...data, updatedAt: new Date() })
    .where(eq(botSchedules.id, id));
}

export async function deleteBotSchedule(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(botSchedules).where(eq(botSchedules.id, id));
}

export async function createBotRiskRule(data: InsertBotRiskRule): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(botRiskRules).values(data);
  return result[0].insertId;
}

export async function getBotRiskRules(botId: number): Promise<BotRiskRule[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(botRiskRules)
    .where(eq(botRiskRules.botId, botId))
    .orderBy(desc(botRiskRules.createdAt));
}

export async function updateBotRiskRule(id: number, data: Partial<InsertBotRiskRule>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(botRiskRules).set({ ...data, updatedAt: new Date() })
    .where(eq(botRiskRules.id, id));
}

export async function deleteBotRiskRule(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(botRiskRules).where(eq(botRiskRules.id, id));
}

export async function createBotExecutionLog(data: InsertBotExecutionLog): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(botExecutionLogs).values(data);
  return result[0].insertId;
}

export async function getBotExecutionLogs(botId: number | undefined, userId: number, limit = 100): Promise<BotExecutionLog[]> {
  const db = await getDb();
  if (!db) return [];
  
  // If botId is provided, filter by it; otherwise get all logs for user's bots
  if (botId) {
    return db.select().from(botExecutionLogs)
      .where(eq(botExecutionLogs.botId, botId))
      .orderBy(desc(botExecutionLogs.startedAt))
      .limit(limit);
  }
  
  // Get all bots for user and their logs
  const userBots = await db.select({ id: tradingBots.id }).from(tradingBots)
    .where(eq(tradingBots.userId, userId));
  
  if (userBots.length === 0) return [];
  
  const botIds = userBots.map(b => b.id);
  return db.select().from(botExecutionLogs)
    .where(inArray(botExecutionLogs.botId, botIds))
    .orderBy(desc(botExecutionLogs.startedAt))
    .limit(limit);
}

export async function updateBotExecutionLog(id: number, data: Partial<InsertBotExecutionLog>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(botExecutionLogs).set(data)
    .where(eq(botExecutionLogs.id, id));
}

export async function createBotBenchmark(data: InsertBotBenchmark): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(botBenchmarks).values(data);
  return result[0].insertId;
}

export async function getBotBenchmarks(botId: number): Promise<BotBenchmark[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(botBenchmarks)
    .where(eq(botBenchmarks.botId, botId))
    .orderBy(desc(botBenchmarks.periodEnd));
}

export async function getLatestBotBenchmark(botId: number): Promise<BotBenchmark | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(botBenchmarks)
    .where(eq(botBenchmarks.botId, botId))
    .orderBy(desc(botBenchmarks.periodEnd))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ==================== PHASE 18: SOCIAL & COMMUNITY ====================

export async function createUserProfile(data: InsertUserProfile): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(userProfiles).values(data);
  return result[0].insertId;
}

export async function getUserProfile(userId: number): Promise<UserProfile | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPublicUserProfile(userId: number): Promise<UserProfile | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(userProfiles)
    .where(and(eq(userProfiles.userId, userId), eq(userProfiles.isPublic, true)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserProfile(userId: number, data: Partial<InsertUserProfile>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(userProfiles).set({ ...data, updatedAt: new Date() })
    .where(eq(userProfiles.userId, userId));
}

export async function upsertUserProfile(userId: number, data: Partial<InsertUserProfile>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getUserProfile(userId);
  if (existing) {
    await updateUserProfile(userId, data);
  } else {
    await createUserProfile({ userId, ...data } as InsertUserProfile);
  }
}

export async function getTopTraders(limit = 20): Promise<UserProfile[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userProfiles)
    .where(eq(userProfiles.isPublic, true))
    .orderBy(desc(userProfiles.totalReturn))
    .limit(limit);
}

export async function createUserFollow(data: InsertUserFollow): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(userFollows).values(data);
  return result[0].insertId;
}

export async function getUserFollowers(userId: number): Promise<UserFollow[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userFollows)
    .where(eq(userFollows.followingId, userId))
    .orderBy(desc(userFollows.createdAt));
}

export async function getUserFollowing(userId: number): Promise<UserFollow[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userFollows)
    .where(eq(userFollows.followerId, userId))
    .orderBy(desc(userFollows.createdAt));
}

export async function isFollowing(followerId: number, followingId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(userFollows)
    .where(and(eq(userFollows.followerId, followerId), eq(userFollows.followingId, followingId)))
    .limit(1);
  return result.length > 0;
}

export async function unfollowUser(followerId: number, followingId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(userFollows)
    .where(and(eq(userFollows.followerId, followerId), eq(userFollows.followingId, followingId)));
}

export async function createDiscussionThread(data: InsertDiscussionThread): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(discussionThreads).values(data);
  return result[0].insertId;
}

export async function getDiscussionThreads(options: {
  threadType?: string;
  symbol?: string;
  relatedEntityId?: number;
  limit?: number;
  offset?: number;
}): Promise<DiscussionThread[]> {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  if (options.threadType) conditions.push(eq(discussionThreads.threadType, options.threadType as any));
  if (options.symbol) conditions.push(eq(discussionThreads.symbol, options.symbol));
  if (options.relatedEntityId) conditions.push(eq(discussionThreads.relatedEntityId, options.relatedEntityId));
  
  let query = db.select().from(discussionThreads);
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return query
    .orderBy(desc(discussionThreads.isPinned), desc(discussionThreads.updatedAt))
    .limit(options.limit || 50)
    .offset(options.offset || 0);
}

export async function getDiscussionThreadById(id: number): Promise<DiscussionThread | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(discussionThreads)
    .where(eq(discussionThreads.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateDiscussionThread(id: number, data: Partial<InsertDiscussionThread>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(discussionThreads).set({ ...data, updatedAt: new Date() })
    .where(eq(discussionThreads.id, id));
}

export async function incrementThreadViews(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(discussionThreads)
    .set({ viewCount: sql`view_count + 1` })
    .where(eq(discussionThreads.id, id));
}

export async function createDiscussionComment(data: InsertDiscussionComment): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(discussionComments).values(data);
  
  // Update thread's comment count and last activity
  await db.update(discussionThreads)
    .set({ 
      commentCount: sql`comment_count + 1`,
      updatedAt: new Date()
    })
    .where(eq(discussionThreads.id, data.threadId));
  
  return result[0].insertId;
}

export async function getThreadComments(threadId: number): Promise<DiscussionComment[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(discussionComments)
    .where(eq(discussionComments.threadId, threadId))
    .orderBy(asc(discussionComments.createdAt));
}

export async function updateDiscussionComment(id: number, userId: number, data: Partial<InsertDiscussionComment>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(discussionComments)
    .set({ ...data, isEdited: true, updatedAt: new Date() })
    .where(and(eq(discussionComments.id, id), eq(discussionComments.userId, userId)));
}

export async function deleteDiscussionComment(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const comment = await db.select().from(discussionComments)
    .where(and(eq(discussionComments.id, id), eq(discussionComments.userId, userId)))
    .limit(1);
  
  if (comment.length > 0) {
    await db.delete(discussionComments)
      .where(eq(discussionComments.id, id));
    
    // Decrement thread's comment count
    await db.update(discussionThreads)
      .set({ commentCount: sql`comment_count - 1` })
      .where(eq(discussionThreads.id, comment[0].threadId));
  }
}

export async function createStrategyRating(data: InsertStrategyRating): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(strategyRatings).values(data);
  return result[0].insertId;
}

export async function getStrategyRatings(listingId: number): Promise<StrategyRating[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(strategyRatings)
    .where(eq(strategyRatings.listingId, listingId))
    .orderBy(desc(strategyRatings.createdAt));
}

export async function getUserStrategyRating(listingId: number, userId: number): Promise<StrategyRating | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(strategyRatings)
    .where(and(eq(strategyRatings.listingId, listingId), eq(strategyRatings.userId, userId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateStrategyRating(id: number, userId: number, data: Partial<InsertStrategyRating>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(strategyRatings)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(strategyRatings.id, id), eq(strategyRatings.userId, userId)));
}

export async function createActivityFeedItem(data: InsertActivityFeed): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(activityFeed).values(data);
  return result[0].insertId;
}

export async function getUserActivityFeed(userId: number, limit = 50): Promise<ActivityFeed[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Get users that this user follows
  const following = await getUserFollowing(userId);
  const followingIds = following.map(f => f.followingId);
  
  if (followingIds.length === 0) {
    // Return own activity if not following anyone
    return db.select().from(activityFeed)
      .where(eq(activityFeed.userId, userId))
      .orderBy(desc(activityFeed.createdAt))
      .limit(limit);
  }
  
  // Return activity from followed users and self
  return db.select().from(activityFeed)
    .where(or(
      eq(activityFeed.userId, userId),
      inArray(activityFeed.userId, followingIds)
    ))
    .orderBy(desc(activityFeed.createdAt))
    .limit(limit);
}

export async function getPublicActivityFeed(limit = 50): Promise<ActivityFeed[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(activityFeed)
    .where(eq(activityFeed.isPublic, true))
    .orderBy(desc(activityFeed.createdAt))
    .limit(limit);
}

export async function createUserBadge(data: InsertUserBadge): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(userBadges).values(data);
  return result[0].insertId;
}

export async function getUserBadges(userId: number): Promise<UserBadge[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userBadges)
    .where(eq(userBadges.userId, userId))
    .orderBy(desc(userBadges.earnedAt));
}

export async function hasBadge(userId: number, badgeId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(userBadges)
    .where(and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId as BadgeId)))
    .limit(1);
  return result.length > 0;
}

export async function getBadgeDefinition(badgeId: BadgeId) {
  return badgeDefinitions[badgeId];
}

export async function getAllBadgeDefinitions() {
  return badgeDefinitions;
}

// ============================================
// Phase 32-33: Email Configuration & Verification
// ============================================

// Email Configuration Functions
export async function getEmailConfig(): Promise<EmailConfig | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const results = await db.select().from(emailConfig).limit(1);
  return results[0];
}

export async function createEmailConfig(data: InsertEmailConfig): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(emailConfig).values(data);
  return Number(result[0].insertId);
}

export async function updateEmailConfig(id: number, data: Partial<InsertEmailConfig>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(emailConfig).set(data).where(eq(emailConfig.id, id));
}

export async function upsertEmailConfig(data: Partial<InsertEmailConfig>): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getEmailConfig();
  if (existing) {
    await updateEmailConfig(existing.id, data);
    return existing.id;
  } else {
    return await createEmailConfig(data as InsertEmailConfig);
  }
}

export async function incrementEmailsSentToday(): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const config = await getEmailConfig();
  if (!config) return;
  
  // Reset counter if it's a new day
  const now = new Date();
  const lastReset = config.lastResetAt ? new Date(config.lastResetAt) : null;
  const isNewDay = !lastReset || lastReset.toDateString() !== now.toDateString();
  
  if (isNewDay) {
    await updateEmailConfig(config.id, {
      emailsSentToday: 1,
      lastResetAt: now,
    });
  } else {
    await db.update(emailConfig)
      .set({ emailsSentToday: (config.emailsSentToday || 0) + 1 })
      .where(eq(emailConfig.id, config.id));
  }
}

export async function canSendEmail(): Promise<{ allowed: boolean; reason?: string }> {
  const config = await getEmailConfig();
  
  if (!config) {
    return { allowed: false, reason: "Email not configured" };
  }
  
  if (!config.isEnabled) {
    return { allowed: false, reason: "Email sending is disabled" };
  }
  
  if (!config.sendgridApiKey) {
    return { allowed: false, reason: "SendGrid API key not configured" };
  }
  
  const dailyLimit = config.dailyLimit || 1000;
  const sentToday = config.emailsSentToday || 0;
  
  // Check if we need to reset the counter
  const now = new Date();
  const lastReset = config.lastResetAt ? new Date(config.lastResetAt) : null;
  const isNewDay = !lastReset || lastReset.toDateString() !== now.toDateString();
  
  if (isNewDay) {
    return { allowed: true };
  }
  
  if (sentToday >= dailyLimit) {
    return { allowed: false, reason: `Daily email limit (${dailyLimit}) reached` };
  }
  
  return { allowed: true };
}

// Email Verification Functions
export async function createEmailVerification(data: InsertEmailVerification): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(emailVerifications).values(data);
  return Number(result[0].insertId);
}

export async function getEmailVerificationByToken(token: string): Promise<EmailVerification | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const results = await db.select().from(emailVerifications).where(eq(emailVerifications.token, token));
  return results[0];
}

export async function getEmailVerificationByUserId(userId: number): Promise<EmailVerification | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const results = await db.select().from(emailVerifications)
    .where(eq(emailVerifications.userId, userId))
    .orderBy(desc(emailVerifications.createdAt))
    .limit(1);
  return results[0];
}

export async function markEmailVerified(token: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const verification = await getEmailVerificationByToken(token);
  if (!verification) return false;
  
  // Check if expired
  if (new Date(verification.expiresAt) < new Date()) {
    return false;
  }
  
  // Mark as verified
  await db.update(emailVerifications)
    .set({ 
      isVerified: true, 
      verifiedAt: new Date() 
    })
    .where(eq(emailVerifications.token, token));
  
  return true;
}

export async function incrementResendCount(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const verification = await getEmailVerificationByUserId(userId);
  if (!verification) return;
  
  await db.update(emailVerifications)
    .set({ 
      resendCount: (verification.resendCount || 0) + 1,
      lastResendAt: new Date()
    })
    .where(eq(emailVerifications.id, verification.id));
}

export async function deleteExpiredVerifications(): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(emailVerifications)
    .where(
      and(
        eq(emailVerifications.isVerified, false),
        lt(emailVerifications.expiresAt, new Date())
      )
    );
}

export async function isUserEmailVerified(userId: number): Promise<boolean> {
  const verification = await getEmailVerificationByUserId(userId);
  return verification?.isVerified === true;
}
