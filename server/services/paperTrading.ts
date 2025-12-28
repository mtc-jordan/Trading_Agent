/**
 * Paper Trading Simulator Service
 * Provides virtual trading environment with simulated order execution
 */

import { getDb } from '../db';
import { 
  paperTradingAccounts, 
  paperTradingOrders, 
  paperTradingPositions,
  paperTradingHistory 
} from '../../drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';

export type OrderType = 'market' | 'limit' | 'stop_loss' | 'take_profit' | 'stop_limit';
export type OrderSide = 'buy' | 'sell';
export type OrderStatus = 'pending' | 'filled' | 'partially_filled' | 'cancelled' | 'expired' | 'rejected';
export type AssetType = 'stock' | 'crypto';

export interface PaperAccount {
  id: string;
  userId: string;
  name: string;
  initialBalance: number;
  currentBalance: number;
  totalEquity: number;
  totalPnL: number;
  totalPnLPercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaperOrder {
  id: string;
  accountId: string;
  symbol: string;
  assetType: AssetType;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  status: OrderStatus;
  filledQuantity: number;
  filledPrice?: number;
  commission: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export interface PaperPosition {
  id: string;
  accountId: string;
  symbol: string;
  assetType: AssetType;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL: number;
  openedAt: Date;
  updatedAt: Date;
}

export interface TradeExecution {
  orderId: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  price: number;
  commission: number;
  timestamp: Date;
  pnl?: number;
}

export interface PerformanceMetrics {
  totalReturn: number;
  totalReturnPercent: number;
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  totalTrades: number;
  tradingDays: number;
  averageHoldingPeriod: number;
}

// Commission rates
const COMMISSION_RATES = { stock: 0.001, crypto: 0.002 };
const SLIPPAGE_RANGE = { stock: 0.001, crypto: 0.002 };

// Helper to parse decimal strings
const toNum = (v: string | number | null | undefined): number => {
  if (v === null || v === undefined) return 0;
  return typeof v === 'number' ? v : parseFloat(v) || 0;
};

/**
 * Create a new paper trading account
 */
export async function createPaperAccount(
  userId: string,
  name: string,
  initialBalance: number = 100000
): Promise<PaperAccount> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const id = `pta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date();
  
  await db.insert(paperTradingAccounts).values({
    id,
    userId,
    name,
    initialBalance: String(initialBalance),
    currentBalance: String(initialBalance),
    totalEquity: String(initialBalance),
    totalPnL: '0',
    totalPnLPercent: '0',
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: '0',
    createdAt: now,
    updatedAt: now,
  });

  return {
    id, userId, name, initialBalance,
    currentBalance: initialBalance,
    totalEquity: initialBalance,
    totalPnL: 0, totalPnLPercent: 0,
    totalTrades: 0, winningTrades: 0, losingTrades: 0, winRate: 0,
    createdAt: now, updatedAt: now,
  };
}

/**
 * Get paper trading account by ID
 */
export async function getPaperAccount(accountId: string): Promise<PaperAccount | null> {
  const db = await getDb();
  if (!db) return null;
  
  const results = await db.select().from(paperTradingAccounts).where(eq(paperTradingAccounts.id, accountId));
  if (results.length === 0) return null;
  
  const r = results[0];
  return {
    id: r.id, userId: r.userId, name: r.name,
    initialBalance: toNum(r.initialBalance),
    currentBalance: toNum(r.currentBalance),
    totalEquity: toNum(r.totalEquity),
    totalPnL: toNum(r.totalPnL),
    totalPnLPercent: toNum(r.totalPnLPercent),
    totalTrades: r.totalTrades,
    winningTrades: r.winningTrades,
    losingTrades: r.losingTrades,
    winRate: toNum(r.winRate),
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
  };
}

/**
 * Get all paper trading accounts for a user
 */
export async function getUserPaperAccounts(userId: string): Promise<PaperAccount[]> {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db.select()
    .from(paperTradingAccounts)
    .where(eq(paperTradingAccounts.userId, userId))
    .orderBy(desc(paperTradingAccounts.createdAt));
  
  return results.map(r => ({
    id: r.id, userId: r.userId, name: r.name,
    initialBalance: toNum(r.initialBalance),
    currentBalance: toNum(r.currentBalance),
    totalEquity: toNum(r.totalEquity),
    totalPnL: toNum(r.totalPnL),
    totalPnLPercent: toNum(r.totalPnLPercent),
    totalTrades: r.totalTrades,
    winningTrades: r.winningTrades,
    losingTrades: r.losingTrades,
    winRate: toNum(r.winRate),
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
  }));
}

/**
 * Get current price for a symbol (simulated)
 */
async function getCurrentPrice(symbol: string, assetType: AssetType): Promise<number> {
  const cryptoPrices: Record<string, number> = {
    BTC: 43000, ETH: 2300, SOL: 100, BNB: 310, XRP: 0.55,
    ADA: 0.45, DOGE: 0.08, DOT: 7, MATIC: 0.85, AVAX: 35,
  };
  const stockPrices: Record<string, number> = {
    AAPL: 185, GOOGL: 140, MSFT: 375, AMZN: 155, NVDA: 480, META: 350, TSLA: 250,
  };
  
  const base = assetType === 'crypto' ? (cryptoPrices[symbol] || 100) : (stockPrices[symbol] || 100);
  return base * (1 + (Math.random() - 0.5) * 0.02);
}

/**
 * Place a paper trading order
 */
export async function placePaperOrder(
  accountId: string,
  symbol: string,
  assetType: AssetType,
  side: OrderSide,
  type: OrderType,
  quantity: number,
  options?: {
    price?: number;
    stopPrice?: number;
    takeProfitPrice?: number;
    stopLossPrice?: number;
    expiresAt?: Date;
  }
): Promise<PaperOrder> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const account = await getPaperAccount(accountId);
  if (!account) throw new Error('Account not found');

  const id = `pto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const currentPrice = await getCurrentPrice(symbol, assetType);
  const now = new Date();
  
  // Validate balance for buy orders
  const estimatedCost = quantity * (options?.price || currentPrice);
  if (side === 'buy' && estimatedCost > account.currentBalance) {
    throw new Error('Insufficient balance');
  }

  let status: OrderStatus = 'pending';
  let filledQuantity = 0;
  let filledPrice: number | undefined;
  let commission = 0;

  // Execute market orders immediately
  if (type === 'market') {
    const slippage = (Math.random() - 0.5) * 2 * SLIPPAGE_RANGE[assetType];
    filledPrice = currentPrice * (1 + (side === 'buy' ? slippage : -slippage));
    commission = quantity * filledPrice * COMMISSION_RATES[assetType];
    filledQuantity = quantity;
    status = 'filled';
    
    // Update account and positions
    await executeMarketOrder(db, account, symbol, assetType, side, quantity, filledPrice, commission);
  }

  await db.insert(paperTradingOrders).values({
    id, accountId, symbol, assetType, side, type,
    quantity: String(quantity),
    price: options?.price ? String(options.price) : null,
    stopPrice: options?.stopPrice ? String(options.stopPrice) : null,
    takeProfitPrice: options?.takeProfitPrice ? String(options.takeProfitPrice) : null,
    stopLossPrice: options?.stopLossPrice ? String(options.stopLossPrice) : null,
    status,
    filledQuantity: String(filledQuantity),
    filledPrice: filledPrice ? String(filledPrice) : null,
    commission: String(commission),
    createdAt: now,
    updatedAt: now,
    expiresAt: options?.expiresAt || null,
  });

  return {
    id, accountId, symbol, assetType, side, type, quantity,
    price: options?.price,
    stopPrice: options?.stopPrice,
    takeProfitPrice: options?.takeProfitPrice,
    stopLossPrice: options?.stopLossPrice,
    status, filledQuantity, filledPrice, commission,
    createdAt: now, updatedAt: now,
    expiresAt: options?.expiresAt,
  };
}

/**
 * Execute a market order
 */
async function executeMarketOrder(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  account: PaperAccount,
  symbol: string,
  assetType: AssetType,
  side: OrderSide,
  quantity: number,
  price: number,
  commission: number
): Promise<void> {
  const orderId = `pto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  let pnl = 0;
  
  if (side === 'buy') {
    const totalCost = quantity * price + commission;
    const newBalance = account.currentBalance - totalCost;
    
    await db.update(paperTradingAccounts)
      .set({ 
        currentBalance: String(newBalance),
        updatedAt: new Date(),
      })
      .where(eq(paperTradingAccounts.id, account.id));
    
    // Create or update position
    const existingPos = await db.select().from(paperTradingPositions)
      .where(and(eq(paperTradingPositions.accountId, account.id), eq(paperTradingPositions.symbol, symbol)));
    
    if (existingPos.length > 0) {
      const pos = existingPos[0];
      const oldQty = toNum(pos.quantity);
      const oldAvg = toNum(pos.averagePrice);
      const newQty = oldQty + quantity;
      const newAvg = ((oldQty * oldAvg) + (quantity * price)) / newQty;
      
      await db.update(paperTradingPositions)
        .set({
          quantity: String(newQty),
          averagePrice: String(newAvg),
          currentPrice: String(price),
          marketValue: String(newQty * price),
          unrealizedPnL: String((price - newAvg) * newQty),
          unrealizedPnLPercent: String(((price - newAvg) / newAvg) * 100),
          updatedAt: new Date(),
        })
        .where(eq(paperTradingPositions.id, pos.id));
    } else {
      await db.insert(paperTradingPositions).values({
        id: `ptp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        accountId: account.id,
        symbol, assetType,
        quantity: String(quantity),
        averagePrice: String(price),
        currentPrice: String(price),
        marketValue: String(quantity * price),
        unrealizedPnL: '0',
        unrealizedPnLPercent: '0',
        realizedPnL: '0',
        openedAt: new Date(),
        updatedAt: new Date(),
      });
    }
  } else {
    // Sell
    const existingPos = await db.select().from(paperTradingPositions)
      .where(and(eq(paperTradingPositions.accountId, account.id), eq(paperTradingPositions.symbol, symbol)));
    
    if (existingPos.length === 0) throw new Error('No position to sell');
    
    const pos = existingPos[0];
    const posQty = toNum(pos.quantity);
    const avgPrice = toNum(pos.averagePrice);
    
    if (quantity > posQty) throw new Error('Insufficient position');
    
    pnl = (price - avgPrice) * quantity - commission;
    const proceeds = quantity * price - commission;
    const newBalance = account.currentBalance + proceeds;
    const isWin = pnl > 0;
    
    await db.update(paperTradingAccounts)
      .set({
        currentBalance: String(newBalance),
        totalPnL: String(account.totalPnL + pnl),
        totalTrades: account.totalTrades + 1,
        winningTrades: isWin ? account.winningTrades + 1 : account.winningTrades,
        losingTrades: !isWin ? account.losingTrades + 1 : account.losingTrades,
        winRate: String(((isWin ? account.winningTrades + 1 : account.winningTrades) / (account.totalTrades + 1)) * 100),
        updatedAt: new Date(),
      })
      .where(eq(paperTradingAccounts.id, account.id));
    
    const newQty = posQty - quantity;
    if (newQty <= 0) {
      await db.delete(paperTradingPositions).where(eq(paperTradingPositions.id, pos.id));
    } else {
      await db.update(paperTradingPositions)
        .set({
          quantity: String(newQty),
          currentPrice: String(price),
          marketValue: String(newQty * price),
          unrealizedPnL: String((price - avgPrice) * newQty),
          realizedPnL: String(toNum(pos.realizedPnL) + pnl),
          updatedAt: new Date(),
        })
        .where(eq(paperTradingPositions.id, pos.id));
    }
  }

  // Record trade history
  await db.insert(paperTradingHistory).values({
    id: `pth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    accountId: account.id,
    orderId,
    symbol, assetType, side,
    quantity: String(quantity),
    price: String(price),
    commission: String(commission),
    pnl: String(pnl),
    createdAt: new Date(),
  });
}

/**
 * Get all positions for an account
 */
export async function getAccountPositions(accountId: string): Promise<PaperPosition[]> {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db.select().from(paperTradingPositions)
    .where(eq(paperTradingPositions.accountId, accountId));
  
  const positions: PaperPosition[] = [];
  for (const r of results) {
    const currentPrice = await getCurrentPrice(r.symbol, r.assetType as AssetType);
    const qty = toNum(r.quantity);
    const avgPrice = toNum(r.averagePrice);
    const unrealizedPnL = (currentPrice - avgPrice) * qty;
    const unrealizedPnLPercent = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;
    
    positions.push({
      id: r.id, accountId: r.accountId, symbol: r.symbol,
      assetType: r.assetType as AssetType,
      quantity: qty, averagePrice: avgPrice, currentPrice,
      marketValue: qty * currentPrice,
      unrealizedPnL, unrealizedPnLPercent,
      realizedPnL: toNum(r.realizedPnL),
      openedAt: new Date(r.openedAt),
      updatedAt: new Date(r.updatedAt),
    });
  }
  
  return positions;
}

/**
 * Get order history for an account
 */
export async function getAccountOrders(accountId: string, status?: OrderStatus): Promise<PaperOrder[]> {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db.select().from(paperTradingOrders)
    .where(eq(paperTradingOrders.accountId, accountId))
    .orderBy(desc(paperTradingOrders.createdAt));
  
  return results
    .filter(r => !status || r.status === status)
    .map(r => ({
      id: r.id, accountId: r.accountId, symbol: r.symbol,
      assetType: r.assetType as AssetType,
      side: r.side as OrderSide,
      type: r.type as OrderType,
      quantity: toNum(r.quantity),
      price: r.price ? toNum(r.price) : undefined,
      stopPrice: r.stopPrice ? toNum(r.stopPrice) : undefined,
      takeProfitPrice: r.takeProfitPrice ? toNum(r.takeProfitPrice) : undefined,
      stopLossPrice: r.stopLossPrice ? toNum(r.stopLossPrice) : undefined,
      status: r.status as OrderStatus,
      filledQuantity: toNum(r.filledQuantity),
      filledPrice: r.filledPrice ? toNum(r.filledPrice) : undefined,
      commission: toNum(r.commission),
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
      expiresAt: r.expiresAt ? new Date(r.expiresAt) : undefined,
    }));
}

/**
 * Get trade history for an account
 */
export async function getTradeHistory(accountId: string): Promise<TradeExecution[]> {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db.select().from(paperTradingHistory)
    .where(eq(paperTradingHistory.accountId, accountId))
    .orderBy(desc(paperTradingHistory.createdAt));
  
  return results.map(r => ({
    orderId: r.orderId,
    symbol: r.symbol,
    side: r.side as OrderSide,
    quantity: toNum(r.quantity),
    price: toNum(r.price),
    commission: toNum(r.commission),
    timestamp: new Date(r.createdAt),
    pnl: toNum(r.pnl),
  }));
}

/**
 * Cancel a pending order
 */
export async function cancelOrder(orderId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  await db.update(paperTradingOrders)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(and(eq(paperTradingOrders.id, orderId), eq(paperTradingOrders.status, 'pending')));
  
  return true;
}

/**
 * Calculate performance metrics
 */
export async function calculatePerformanceMetrics(accountId: string): Promise<PerformanceMetrics> {
  const account = await getPaperAccount(accountId);
  if (!account) throw new Error('Account not found');
  
  const trades = await getTradeHistory(accountId);
  const positions = await getAccountPositions(accountId);
  
  const positionValue = positions.reduce((sum, p) => sum + p.marketValue, 0);
  const totalEquity = account.currentBalance + positionValue;
  const totalReturn = totalEquity - account.initialBalance;
  const totalReturnPercent = (totalReturn / account.initialBalance) * 100;
  
  const wins = trades.filter(t => (t.pnl || 0) > 0);
  const losses = trades.filter(t => (t.pnl || 0) < 0);
  
  const averageWin = wins.length > 0 ? wins.reduce((s, t) => s + (t.pnl || 0), 0) / wins.length : 0;
  const averageLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + (t.pnl || 0), 0) / losses.length) : 0;
  const largestWin = wins.length > 0 ? Math.max(...wins.map(t => t.pnl || 0)) : 0;
  const largestLoss = losses.length > 0 ? Math.abs(Math.min(...losses.map(t => t.pnl || 0))) : 0;
  
  const grossProfit = wins.reduce((s, t) => s + (t.pnl || 0), 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + (t.pnl || 0), 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  
  // Simplified Sharpe ratio
  const returns = trades.map(t => (t.pnl || 0) / account.initialBalance);
  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const variance = returns.length > 1 ? returns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1) : 0;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (avgReturn * Math.sqrt(252)) / stdDev : 0;
  
  // Max drawdown
  let peak = account.initialBalance;
  let maxDrawdown = 0;
  let runningBalance = account.initialBalance;
  for (const trade of trades) {
    runningBalance += trade.pnl || 0;
    if (runningBalance > peak) peak = runningBalance;
    const drawdown = peak - runningBalance;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  const maxDrawdownPercent = peak > 0 ? (maxDrawdown / peak) * 100 : 0;
  
  const tradeDates = new Set(trades.map(t => t.timestamp.toDateString()));
  
  return {
    totalReturn, totalReturnPercent, sharpeRatio,
    maxDrawdown, maxDrawdownPercent,
    winRate: account.winRate,
    profitFactor, averageWin, averageLoss, largestWin, largestLoss,
    totalTrades: account.totalTrades,
    tradingDays: tradeDates.size,
    averageHoldingPeriod: 24,
  };
}

/**
 * Reset paper trading account
 */
export async function resetPaperAccount(accountId: string): Promise<PaperAccount> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const account = await getPaperAccount(accountId);
  if (!account) throw new Error('Account not found');
  
  await db.delete(paperTradingPositions).where(eq(paperTradingPositions.accountId, accountId));
  await db.delete(paperTradingOrders).where(eq(paperTradingOrders.accountId, accountId));
  await db.delete(paperTradingHistory).where(eq(paperTradingHistory.accountId, accountId));
  
  await db.update(paperTradingAccounts)
    .set({
      currentBalance: String(account.initialBalance),
      totalEquity: String(account.initialBalance),
      totalPnL: '0',
      totalPnLPercent: '0',
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: '0',
      updatedAt: new Date(),
    })
    .where(eq(paperTradingAccounts.id, accountId));
  
  return getPaperAccount(accountId) as Promise<PaperAccount>;
}

export default {
  createPaperAccount,
  getPaperAccount,
  getUserPaperAccounts,
  placePaperOrder,
  getAccountPositions,
  getAccountOrders,
  getTradeHistory,
  cancelOrder,
  calculatePerformanceMetrics,
  resetPaperAccount,
};
