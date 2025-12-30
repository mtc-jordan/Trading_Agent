import { getDb } from "../db";
import { portfolioValueSnapshots, tradingAccounts, trades } from "../../drizzle/schema";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { getIO } from "../_core/websocket";

interface Position {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

interface PortfolioValue {
  accountId: number;
  totalValue: number;
  cashBalance: number;
  positionsValue: number;
  positions: Position[];
  valueChange: number;
  percentChange: number;
  lastUpdated: Date;
}

// Price cache for real-time calculations
const priceCache = new Map<string, { price: number; timestamp: number }>();
const PRICE_CACHE_TTL = 60 * 1000; // 1 minute

// Update price in cache
export function updatePriceCache(symbol: string, price: number) {
  priceCache.set(symbol, { price, timestamp: Date.now() });
}

// Get cached price
function getCachedPrice(symbol: string): number | null {
  const cached = priceCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < PRICE_CACHE_TTL) {
    return cached.price;
  }
  return null;
}

// Calculate portfolio value for an account
export async function calculatePortfolioValue(accountId: number, userId: number): Promise<PortfolioValue | null> {
  const db = await getDb();
  if (!db) return null;

  // Get account info
  const [account] = await db
    .select()
    .from(tradingAccounts)
    .where(and(
      eq(tradingAccounts.id, accountId),
      eq(tradingAccounts.userId, userId)
    ));

  if (!account) return null;

  // Get all trades for this account to calculate positions
  const accountTrades = await db
    .select()
    .from(trades)
    .where(eq(trades.accountId, accountId))
    .orderBy(trades.createdAt);

  // Calculate positions from trades
  const positionMap = new Map<string, { quantity: number; totalCost: number }>();
  
  for (const trade of accountTrades) {
    const current = positionMap.get(trade.symbol) || { quantity: 0, totalCost: 0 };
    
    if (trade.side === "buy") {
      current.quantity += Number(trade.quantity);
      current.totalCost += Number(trade.quantity) * Number(trade.price);
    } else {
      // For sells, reduce position
      const sellValue = Number(trade.quantity) * Number(trade.price);
      const avgCost = current.quantity > 0 ? current.totalCost / current.quantity : 0;
      current.quantity -= Number(trade.quantity);
      current.totalCost -= Number(trade.quantity) * avgCost;
    }
    
    if (current.quantity > 0) {
      positionMap.set(trade.symbol, current);
    } else {
      positionMap.delete(trade.symbol);
    }
  }

  // Calculate current values using cached prices
  const positions: Position[] = [];
  let totalPositionsValue = 0;

  for (const [symbol, position] of Array.from(positionMap.entries())) {
    const currentPrice = getCachedPrice(symbol) || position.totalCost / position.quantity; // Fallback to avg cost
    const marketValue = position.quantity * currentPrice;
    const averagePrice = position.totalCost / position.quantity;
    const unrealizedPnL = marketValue - position.totalCost;
    const unrealizedPnLPercent = (unrealizedPnL / position.totalCost) * 100;

    positions.push({
      symbol,
      quantity: position.quantity,
      averagePrice,
      currentPrice,
      marketValue,
      unrealizedPnL,
      unrealizedPnLPercent,
    });

    totalPositionsValue += marketValue;
  }

  const cashBalance = Number(account.balance);
  const totalValue = cashBalance + totalPositionsValue;

  // Get previous snapshot for change calculation
  const [previousSnapshot] = await db
    .select()
    .from(portfolioValueSnapshots)
    .where(eq(portfolioValueSnapshots.accountId, accountId))
    .orderBy(desc(portfolioValueSnapshots.createdAt))
    .limit(1);

  const previousValue = previousSnapshot ? Number(previousSnapshot.totalValue) : Number(account.initialBalance);
  const valueChange = totalValue - previousValue;
  const percentChange = previousValue > 0 ? (valueChange / previousValue) * 100 : 0;

  return {
    accountId,
    totalValue,
    cashBalance,
    positionsValue: totalPositionsValue,
    positions,
    valueChange,
    percentChange,
    lastUpdated: new Date(),
  };
}

// Save portfolio snapshot
export async function savePortfolioSnapshot(
  userId: number,
  accountId: number,
  snapshotType: "realtime" | "hourly" | "daily" | "weekly" = "realtime"
) {
  const portfolioValue = await calculatePortfolioValue(accountId, userId);
  if (!portfolioValue) return null;

  const db = await getDb();
  if (!db) return null;

  const [result] = await db
    .insert(portfolioValueSnapshots)
    .values({
      userId,
      accountId,
      totalValue: String(portfolioValue.totalValue),
      cashBalance: String(portfolioValue.cashBalance),
      positionsValue: String(portfolioValue.positionsValue),
      valueChange: String(portfolioValue.valueChange),
      percentChange: String(portfolioValue.percentChange),
      snapshotType,
    })
    .$returningId();

  return result.id;
}

// Get portfolio value history
export async function getPortfolioValueHistory(
  accountId: number,
  userId: number,
  days: number = 30
) {
  const db = await getDb();
  if (!db) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const snapshots = await db
    .select()
    .from(portfolioValueSnapshots)
    .where(and(
      eq(portfolioValueSnapshots.accountId, accountId),
      eq(portfolioValueSnapshots.userId, userId),
      gte(portfolioValueSnapshots.createdAt, startDate)
    ))
    .orderBy(portfolioValueSnapshots.createdAt);

  return snapshots.map(s => ({
    timestamp: s.createdAt,
    totalValue: Number(s.totalValue),
    cashBalance: Number(s.cashBalance),
    positionsValue: Number(s.positionsValue),
    valueChange: Number(s.valueChange),
    percentChange: Number(s.percentChange),
  }));
}

// Broadcast portfolio update via WebSocket
export async function broadcastPortfolioUpdate(userId: number, accountId: number) {
  const portfolioValue = await calculatePortfolioValue(accountId, userId);
  if (!portfolioValue) return;

  const io = getIO();
  if (!io) return;

  // Emit to user's room
  io.to(`user:${userId}`).emit("portfolio:update", {
    accountId,
    totalValue: portfolioValue.totalValue,
    cashBalance: portfolioValue.cashBalance,
    positionsValue: portfolioValue.positionsValue,
    valueChange: portfolioValue.valueChange,
    percentChange: portfolioValue.percentChange,
    positions: portfolioValue.positions,
    lastUpdated: portfolioValue.lastUpdated.toISOString(),
  });
}

// Portfolio value service class
export class PortfolioValueService {
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();

  // Start real-time updates for a user's account
  startRealTimeUpdates(userId: number, accountId: number, intervalMs: number = 30000) {
    const key = `${userId}:${accountId}`;
    
    // Clear existing interval if any
    this.stopRealTimeUpdates(userId, accountId);

    // Set up new interval
    const interval = setInterval(async () => {
      await broadcastPortfolioUpdate(userId, accountId);
    }, intervalMs);

    this.updateIntervals.set(key, interval);

    // Send initial update
    broadcastPortfolioUpdate(userId, accountId);
  }

  // Stop real-time updates
  stopRealTimeUpdates(userId: number, accountId: number) {
    const key = `${userId}:${accountId}`;
    const interval = this.updateIntervals.get(key);
    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(key);
    }
  }

  // Stop all updates
  stopAllUpdates() {
    this.updateIntervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.updateIntervals.clear();
  }

  // Get current portfolio value
  async getPortfolioValue(userId: number, accountId: number) {
    return calculatePortfolioValue(accountId, userId);
  }

  // Get portfolio history
  async getHistory(userId: number, accountId: number, days: number = 30) {
    return getPortfolioValueHistory(accountId, userId, days);
  }

  // Save snapshot
  async saveSnapshot(userId: number, accountId: number, type: "realtime" | "hourly" | "daily" | "weekly" = "realtime") {
    return savePortfolioSnapshot(userId, accountId, type);
  }
}

// Export singleton instance
export const portfolioValueService = new PortfolioValueService();
