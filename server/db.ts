import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
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
  subscriptionTierLimits, SubscriptionTier
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
