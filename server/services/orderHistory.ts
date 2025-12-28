/**
 * Order Execution History Service
 * Handles order tracking, P&L calculations, and execution analytics
 */

import { getDb } from '../db';
import { orderExecutions } from '../../drizzle/schema';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export interface OrderExecutionInput {
  orderId: string;
  connectionId: string;
  userId: string;
  symbol: string;
  side: 'buy' | 'sell';
  orderType: string;
  executionId?: string;
  executedQuantity: number;
  executedPrice: number;
  commission?: number;
  fees?: number;
  marketPrice?: number;
  executedAt: Date;
}

export interface OrderHistoryFilters {
  userId: string;
  connectionId?: string;
  symbol?: string;
  side?: 'buy' | 'sell';
  startDate?: Date;
  endDate?: Date;
  isClosingTrade?: boolean;
  limit?: number;
  offset?: number;
}

export interface PnLSummary {
  totalRealizedPL: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  largestWin: number;
  largestLoss: number;
  avgHoldingPeriod: number;
}

/**
 * Record an order execution
 */
export async function recordOrderExecution(input: OrderExecutionInput) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const executionValue = input.executedQuantity * input.executedPrice;
  const commission = input.commission || 0;
  const fees = input.fees || 0;
  const totalCost = executionValue + commission + fees;
  
  // Calculate slippage if market price is provided
  let slippage: number | null = null;
  if (input.marketPrice && input.marketPrice > 0) {
    slippage = ((input.executedPrice - input.marketPrice) / input.marketPrice) * 100;
    if (input.side === 'sell') {
      slippage = -slippage;
    }
  }
  
  // Check if this is a closing trade
  const closingTradeInfo = await findOpeningTrade(input.userId, input.symbol, input.side);
  
  let realizedPL: number | null = null;
  let realizedPLPercent: number | null = null;
  let holdingPeriodDays: number | null = null;
  
  if (closingTradeInfo) {
    if (input.side === 'sell') {
      realizedPL = (input.executedPrice - closingTradeInfo.avgEntryPrice) * input.executedQuantity - commission - fees;
    } else {
      realizedPL = (closingTradeInfo.avgEntryPrice - input.executedPrice) * input.executedQuantity - commission - fees;
    }
    
    realizedPLPercent = (realizedPL / (closingTradeInfo.avgEntryPrice * input.executedQuantity)) * 100;
    
    const openDate = new Date(closingTradeInfo.openedAt);
    const closeDate = input.executedAt;
    holdingPeriodDays = Math.floor((closeDate.getTime() - openDate.getTime()) / (1000 * 60 * 60 * 24));
  }
  
  const execution = {
    id: randomUUID(),
    orderId: input.orderId,
    connectionId: input.connectionId,
    userId: input.userId,
    symbol: input.symbol,
    side: input.side,
    orderType: input.orderType,
    executionId: input.executionId || null,
    executedQuantity: input.executedQuantity.toString(),
    executedPrice: input.executedPrice.toString(),
    executionValue: executionValue.toString(),
    commission: commission.toString(),
    fees: fees.toString(),
    totalCost: totalCost.toString(),
    isClosingTrade: !!closingTradeInfo,
    openingExecutionId: closingTradeInfo?.executionId || null,
    realizedPL: realizedPL?.toString() || null,
    realizedPLPercent: realizedPLPercent?.toString() || null,
    holdingPeriodDays,
    marketPrice: input.marketPrice?.toString() || null,
    slippage: slippage?.toString() || null,
    executedAt: input.executedAt,
  };
  
  await db.insert(orderExecutions).values(execution);
  
  return execution;
}

/**
 * Find the opening trade for a closing position
 */
async function findOpeningTrade(userId: string, symbol: string, closingSide: 'buy' | 'sell') {
  const db = await getDb();
  if (!db) return null;
  
  const openingSide = closingSide === 'sell' ? 'buy' : 'sell';
  
  const openingTrades = await db
    .select()
    .from(orderExecutions)
    .where(
      and(
        eq(orderExecutions.userId, userId),
        eq(orderExecutions.symbol, symbol),
        eq(orderExecutions.side, openingSide),
        eq(orderExecutions.isClosingTrade, false)
      )
    )
    .orderBy(desc(orderExecutions.executedAt))
    .limit(1);
  
  if (openingTrades.length === 0) {
    return null;
  }
  
  const trade = openingTrades[0];
  return {
    executionId: trade.id,
    avgEntryPrice: parseFloat(trade.executedPrice),
    openedAt: trade.executedAt,
  };
}

/**
 * Get order execution history with filters
 */
export async function getOrderHistory(filters: OrderHistoryFilters) {
  const db = await getDb();
  if (!db) return { executions: [], total: 0, limit: 50, offset: 0 };
  
  const conditions = [eq(orderExecutions.userId, filters.userId)];
  
  if (filters.connectionId) {
    conditions.push(eq(orderExecutions.connectionId, filters.connectionId));
  }
  if (filters.symbol) {
    conditions.push(eq(orderExecutions.symbol, filters.symbol));
  }
  if (filters.side) {
    conditions.push(eq(orderExecutions.side, filters.side));
  }
  if (filters.startDate) {
    conditions.push(gte(orderExecutions.executedAt, filters.startDate));
  }
  if (filters.endDate) {
    conditions.push(lte(orderExecutions.executedAt, filters.endDate));
  }
  if (filters.isClosingTrade !== undefined) {
    conditions.push(eq(orderExecutions.isClosingTrade, filters.isClosingTrade));
  }
  
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;
  
  const executions = await db
    .select()
    .from(orderExecutions)
    .where(and(...conditions))
    .orderBy(desc(orderExecutions.executedAt))
    .limit(limit)
    .offset(offset);
  
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(orderExecutions)
    .where(and(...conditions));
  
  const total = countResult[0]?.count || 0;
  
  return {
    executions: executions.map(formatExecution),
    total,
    limit,
    offset,
  };
}

/**
 * Get P&L summary for a user
 */
export async function getPnLSummary(
  userId: string,
  connectionId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<PnLSummary> {
  const db = await getDb();
  if (!db) {
    return {
      totalRealizedPL: 0, totalTrades: 0, winningTrades: 0, losingTrades: 0,
      winRate: 0, avgWin: 0, avgLoss: 0, profitFactor: 0, largestWin: 0, largestLoss: 0, avgHoldingPeriod: 0,
    };
  }
  
  const conditions = [
    eq(orderExecutions.userId, userId),
    eq(orderExecutions.isClosingTrade, true),
  ];
  
  if (connectionId) conditions.push(eq(orderExecutions.connectionId, connectionId));
  if (startDate) conditions.push(gte(orderExecutions.executedAt, startDate));
  if (endDate) conditions.push(lte(orderExecutions.executedAt, endDate));
  
  const closingTrades = await db
    .select()
    .from(orderExecutions)
    .where(and(...conditions));
  
  if (closingTrades.length === 0) {
    return {
      totalRealizedPL: 0, totalTrades: 0, winningTrades: 0, losingTrades: 0,
      winRate: 0, avgWin: 0, avgLoss: 0, profitFactor: 0, largestWin: 0, largestLoss: 0, avgHoldingPeriod: 0,
    };
  }
  
  let totalRealizedPL = 0, winningTrades = 0, losingTrades = 0;
  let totalWins = 0, totalLosses = 0, largestWin = 0, largestLoss = 0, totalHoldingPeriod = 0;
  
  for (const trade of closingTrades) {
    const pl = parseFloat(trade.realizedPL || '0');
    totalRealizedPL += pl;
    
    if (pl > 0) {
      winningTrades++;
      totalWins += pl;
      if (pl > largestWin) largestWin = pl;
    } else if (pl < 0) {
      losingTrades++;
      totalLosses += Math.abs(pl);
      if (Math.abs(pl) > largestLoss) largestLoss = Math.abs(pl);
    }
    
    if (trade.holdingPeriodDays) totalHoldingPeriod += trade.holdingPeriodDays;
  }
  
  const totalTrades = closingTrades.length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const avgWin = winningTrades > 0 ? totalWins / winningTrades : 0;
  const avgLoss = losingTrades > 0 ? totalLosses / losingTrades : 0;
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;
  const avgHoldingPeriod = totalTrades > 0 ? totalHoldingPeriod / totalTrades : 0;
  
  return {
    totalRealizedPL, totalTrades, winningTrades, losingTrades,
    winRate, avgWin, avgLoss, profitFactor, largestWin, largestLoss, avgHoldingPeriod,
  };
}

/**
 * Get execution details by ID
 */
export async function getExecutionById(executionId: string, userId: string) {
  const db = await getDb();
  if (!db) return null;
  
  const executions = await db
    .select()
    .from(orderExecutions)
    .where(and(eq(orderExecutions.id, executionId), eq(orderExecutions.userId, userId)))
    .limit(1);
  
  if (executions.length === 0) return null;
  return formatExecution(executions[0]);
}

/**
 * Get executions by order ID
 */
export async function getExecutionsByOrderId(orderId: string, userId: string) {
  const db = await getDb();
  if (!db) return [];
  
  const executions = await db
    .select()
    .from(orderExecutions)
    .where(and(eq(orderExecutions.orderId, orderId), eq(orderExecutions.userId, userId)))
    .orderBy(desc(orderExecutions.executedAt));
  
  return executions.map(formatExecution);
}

/**
 * Get symbol-level P&L breakdown
 */
export async function getSymbolPnLBreakdown(
  userId: string,
  connectionId?: string,
  startDate?: Date,
  endDate?: Date
) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [
    eq(orderExecutions.userId, userId),
    eq(orderExecutions.isClosingTrade, true),
  ];
  
  if (connectionId) conditions.push(eq(orderExecutions.connectionId, connectionId));
  if (startDate) conditions.push(gte(orderExecutions.executedAt, startDate));
  if (endDate) conditions.push(lte(orderExecutions.executedAt, endDate));
  
  const closingTrades = await db
    .select()
    .from(orderExecutions)
    .where(and(...conditions));
  
  const symbolMap = new Map<string, {
    symbol: string;
    totalPL: number;
    trades: number;
    wins: number;
    losses: number;
    totalVolume: number;
  }>();
  
  for (const trade of closingTrades) {
    const symbol = trade.symbol;
    const pl = parseFloat(trade.realizedPL || '0');
    const volume = parseFloat(trade.executionValue);
    
    if (!symbolMap.has(symbol)) {
      symbolMap.set(symbol, { symbol, totalPL: 0, trades: 0, wins: 0, losses: 0, totalVolume: 0 });
    }
    
    const data = symbolMap.get(symbol)!;
    data.totalPL += pl;
    data.trades++;
    data.totalVolume += volume;
    
    if (pl > 0) data.wins++;
    else if (pl < 0) data.losses++;
  }
  
  return Array.from(symbolMap.values())
    .map(d => ({ ...d, winRate: d.trades > 0 ? (d.wins / d.trades) * 100 : 0 }))
    .sort((a, b) => b.totalPL - a.totalPL);
}

/**
 * Get daily P&L for charting
 */
export async function getDailyPnL(userId: string, connectionId?: string, days: number = 30) {
  const db = await getDb();
  if (!db) return [];
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const conditions = [
    eq(orderExecutions.userId, userId),
    eq(orderExecutions.isClosingTrade, true),
    gte(orderExecutions.executedAt, startDate),
  ];
  
  if (connectionId) conditions.push(eq(orderExecutions.connectionId, connectionId));
  
  const closingTrades = await db
    .select()
    .from(orderExecutions)
    .where(and(...conditions))
    .orderBy(orderExecutions.executedAt);
  
  const dailyMap = new Map<string, number>();
  
  for (const trade of closingTrades) {
    const date = trade.executedAt.toISOString().split('T')[0];
    const pl = parseFloat(trade.realizedPL || '0');
    dailyMap.set(date, (dailyMap.get(date) || 0) + pl);
  }
  
  const result: { date: string; pnl: number; cumulativePnl: number }[] = [];
  let cumulativePnl = 0;
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayPnl = dailyMap.get(dateStr) || 0;
    cumulativePnl += dayPnl;
    
    result.push({ date: dateStr, pnl: dayPnl, cumulativePnl });
  }
  
  return result;
}

/**
 * Format execution for API response
 */
function formatExecution(execution: typeof orderExecutions.$inferSelect) {
  return {
    id: execution.id,
    orderId: execution.orderId,
    connectionId: execution.connectionId,
    symbol: execution.symbol,
    side: execution.side,
    orderType: execution.orderType,
    executionId: execution.executionId,
    executedQuantity: parseFloat(execution.executedQuantity),
    executedPrice: parseFloat(execution.executedPrice),
    executionValue: parseFloat(execution.executionValue),
    commission: parseFloat(execution.commission),
    fees: parseFloat(execution.fees),
    totalCost: parseFloat(execution.totalCost),
    isClosingTrade: execution.isClosingTrade,
    openingExecutionId: execution.openingExecutionId,
    realizedPL: execution.realizedPL ? parseFloat(execution.realizedPL) : null,
    realizedPLPercent: execution.realizedPLPercent ? parseFloat(execution.realizedPLPercent) : null,
    holdingPeriodDays: execution.holdingPeriodDays,
    marketPrice: execution.marketPrice ? parseFloat(execution.marketPrice) : null,
    slippage: execution.slippage ? parseFloat(execution.slippage) : null,
    executedAt: execution.executedAt.toISOString(),
    createdAt: execution.createdAt.toISOString(),
  };
}
