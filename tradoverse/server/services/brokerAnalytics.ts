/**
 * Broker Account Analytics Service
 * Handles account performance metrics, snapshots, and analytics
 */

import { getDb } from '../db';
import { 
  brokerAccountSnapshots, 
  brokerPerformanceMetrics,
  brokerConnections,
  orderExecutions 
} from '../../drizzle/schema';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export interface AccountSnapshot {
  connectionId: string;
  userId: string;
  equity: number;
  cash: number;
  buyingPower: number;
  portfolioValue: number;
  marginUsed?: number;
  marginAvailable?: number;
  dayPL?: number;
  totalPL?: number;
  positionsCount?: number;
}

export interface PerformanceMetrics {
  connectionId: string;
  periodType: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time';
  periodStart: Date;
  periodEnd: Date;
  totalReturn: number;
  totalReturnPercent?: number;
  sharpeRatio?: number;
  sortinoRatio?: number;
  maxDrawdown?: number;
  volatility?: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalVolume: number;
}

/**
 * Record an account snapshot
 */
export async function recordAccountSnapshot(snapshot: AccountSnapshot) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const marginUtilization = snapshot.buyingPower > 0 
    ? ((snapshot.marginUsed || 0) / snapshot.buyingPower) * 100 
    : 0;
  
  const dayPLPercent = snapshot.equity > 0 && snapshot.dayPL
    ? (snapshot.dayPL / snapshot.equity) * 100
    : 0;
  
  const totalPLPercent = snapshot.portfolioValue > 0 && snapshot.totalPL
    ? (snapshot.totalPL / snapshot.portfolioValue) * 100
    : 0;
  
  const record = {
    id: randomUUID(),
    connectionId: snapshot.connectionId,
    userId: snapshot.userId,
    equity: snapshot.equity.toString(),
    cash: snapshot.cash.toString(),
    buyingPower: snapshot.buyingPower.toString(),
    portfolioValue: snapshot.portfolioValue.toString(),
    marginUsed: (snapshot.marginUsed || 0).toString(),
    marginAvailable: snapshot.marginAvailable?.toString() || null,
    marginUtilization: marginUtilization.toString(),
    dayPL: (snapshot.dayPL || 0).toString(),
    dayPLPercent: dayPLPercent.toString(),
    totalPL: (snapshot.totalPL || 0).toString(),
    totalPLPercent: totalPLPercent.toString(),
    tradesCount: 0,
    winningTrades: 0,
    losingTrades: 0,
    tradingVolume: '0',
    positionsCount: snapshot.positionsCount || 0,
    longPositions: 0,
    shortPositions: 0,
    snapshotDate: new Date(),
  };
  
  await db.insert(brokerAccountSnapshots).values(record);
  return record;
}

/**
 * Get account snapshots for a connection
 */
export async function getAccountSnapshots(
  connectionId: string,
  userId: string,
  days: number = 30
) {
  const db = await getDb();
  if (!db) return [];
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const snapshots = await db
    .select()
    .from(brokerAccountSnapshots)
    .where(
      and(
        eq(brokerAccountSnapshots.connectionId, connectionId),
        eq(brokerAccountSnapshots.userId, userId),
        gte(brokerAccountSnapshots.snapshotDate, startDate)
      )
    )
    .orderBy(desc(brokerAccountSnapshots.snapshotDate));
  
  return snapshots.map(formatSnapshot);
}

/**
 * Get latest snapshot for a connection
 */
export async function getLatestSnapshot(connectionId: string, userId: string) {
  const db = await getDb();
  if (!db) return null;
  
  const snapshots = await db
    .select()
    .from(brokerAccountSnapshots)
    .where(
      and(
        eq(brokerAccountSnapshots.connectionId, connectionId),
        eq(brokerAccountSnapshots.userId, userId)
      )
    )
    .orderBy(desc(brokerAccountSnapshots.snapshotDate))
    .limit(1);
  
  if (snapshots.length === 0) return null;
  return formatSnapshot(snapshots[0]);
}

/**
 * Calculate and store performance metrics
 */
export async function calculatePerformanceMetrics(
  connectionId: string,
  userId: string,
  periodType: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time'
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  // Calculate period dates
  const now = new Date();
  let periodStart = new Date();
  
  switch (periodType) {
    case 'daily':
      periodStart.setDate(now.getDate() - 1);
      break;
    case 'weekly':
      periodStart.setDate(now.getDate() - 7);
      break;
    case 'monthly':
      periodStart.setMonth(now.getMonth() - 1);
      break;
    case 'yearly':
      periodStart.setFullYear(now.getFullYear() - 1);
      break;
    case 'all_time':
      periodStart = new Date('2020-01-01');
      break;
  }
  
  // Get executions for the period
  const executions = await db
    .select()
    .from(orderExecutions)
    .where(
      and(
        eq(orderExecutions.connectionId, connectionId),
        eq(orderExecutions.userId, userId),
        eq(orderExecutions.isClosingTrade, true),
        gte(orderExecutions.executedAt, periodStart),
        lte(orderExecutions.executedAt, now)
      )
    );
  
  // Calculate metrics
  let totalReturn = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let totalVolume = 0;
  const returns: number[] = [];
  let largestWin = 0;
  let largestLoss = 0;
  let totalWins = 0;
  let totalLosses = 0;
  
  for (const exec of executions) {
    const pl = parseFloat(exec.realizedPL || '0');
    const volume = parseFloat(exec.executionValue);
    
    totalReturn += pl;
    totalVolume += volume;
    returns.push(pl);
    
    if (pl > 0) {
      winningTrades++;
      totalWins += pl;
      if (pl > largestWin) largestWin = pl;
    } else if (pl < 0) {
      losingTrades++;
      totalLosses += Math.abs(pl);
      if (Math.abs(pl) > largestLoss) largestLoss = Math.abs(pl);
    }
  }
  
  const totalTrades = executions.length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const avgWin = winningTrades > 0 ? totalWins / winningTrades : 0;
  const avgLoss = losingTrades > 0 ? totalLosses / losingTrades : 0;
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;
  const avgTradeSize = totalTrades > 0 ? totalVolume / totalTrades : 0;
  
  // Calculate volatility and Sharpe ratio
  let volatility = 0;
  let sharpeRatio = 0;
  
  if (returns.length > 1) {
    const avgReturn = totalReturn / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    volatility = Math.sqrt(variance);
    
    // Annualized Sharpe (assuming risk-free rate of 2%)
    const riskFreeRate = 0.02;
    if (volatility > 0) {
      sharpeRatio = (avgReturn - riskFreeRate) / volatility;
    }
  }
  
  // Calculate max drawdown
  let maxDrawdown = 0;
  let peak = 0;
  let cumulative = 0;
  
  for (const ret of returns) {
    cumulative += ret;
    if (cumulative > peak) peak = cumulative;
    const drawdown = peak > 0 ? ((peak - cumulative) / peak) * 100 : 0;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  
  // Get initial equity for return percentage
  const snapshots = await db
    .select()
    .from(brokerAccountSnapshots)
    .where(
      and(
        eq(brokerAccountSnapshots.connectionId, connectionId),
        eq(brokerAccountSnapshots.userId, userId),
        gte(brokerAccountSnapshots.snapshotDate, periodStart)
      )
    )
    .orderBy(brokerAccountSnapshots.snapshotDate)
    .limit(1);
  
  const initialEquity = snapshots.length > 0 ? parseFloat(snapshots[0].equity) : 0;
  const totalReturnPercent = initialEquity > 0 ? (totalReturn / initialEquity) * 100 : 0;
  
  const metrics = {
    id: randomUUID(),
    connectionId,
    userId,
    periodType,
    periodStart,
    periodEnd: now,
    totalReturn: totalReturn.toString(),
    totalReturnPercent: totalReturnPercent.toString(),
    sharpeRatio: sharpeRatio.toString(),
    sortinoRatio: null, // Would need downside deviation calculation
    maxDrawdown: maxDrawdown.toString(),
    maxDrawdownDuration: null,
    volatility: volatility.toString(),
    totalTrades,
    winningTrades,
    losingTrades,
    winRate: winRate.toString(),
    profitFactor: profitFactor.toString(),
    avgWin: avgWin.toString(),
    avgLoss: avgLoss.toString(),
    largestWin: largestWin.toString(),
    largestLoss: largestLoss.toString(),
    totalVolume: totalVolume.toString(),
    avgTradeSize: avgTradeSize.toString(),
    avgHoldingPeriod: null,
    calculatedAt: now,
    createdAt: now,
  };
  
  await db.insert(brokerPerformanceMetrics).values(metrics);
  return formatMetrics(metrics);
}

/**
 * Get performance metrics for a connection
 */
export async function getPerformanceMetrics(
  connectionId: string,
  userId: string,
  periodType?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time'
) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [
    eq(brokerPerformanceMetrics.connectionId, connectionId),
    eq(brokerPerformanceMetrics.userId, userId),
  ];
  
  if (periodType) {
    conditions.push(eq(brokerPerformanceMetrics.periodType, periodType));
  }
  
  const metrics = await db
    .select()
    .from(brokerPerformanceMetrics)
    .where(and(...conditions))
    .orderBy(desc(brokerPerformanceMetrics.calculatedAt));
  
  return metrics.map(formatMetrics);
}

/**
 * Get aggregated analytics across all brokers
 */
export async function getAggregatedAnalytics(userId: string) {
  const db = await getDb();
  if (!db) return null;
  
  // Get all connections
  const connections = await db
    .select()
    .from(brokerConnections)
    .where(eq(brokerConnections.userId, userId));
  
  if (connections.length === 0) {
    return {
      totalEquity: 0,
      totalCash: 0,
      totalBuyingPower: 0,
      totalPortfolioValue: 0,
      totalMarginUsed: 0,
      totalDayPL: 0,
      totalPL: 0,
      connectionCount: 0,
      brokerBreakdown: [],
    };
  }
  
  let totalEquity = 0;
  let totalCash = 0;
  let totalBuyingPower = 0;
  let totalPortfolioValue = 0;
  let totalMarginUsed = 0;
  let totalDayPL = 0;
  let totalPL = 0;
  
  const brokerBreakdown: Array<{
    connectionId: string;
    brokerType: string;
    equity: number;
    portfolioValue: number;
    dayPL: number;
    totalPL: number;
  }> = [];
  
  for (const conn of connections) {
    const snapshot = await getLatestSnapshot(conn.id, userId);
    
    if (snapshot) {
      totalEquity += snapshot.equity;
      totalCash += snapshot.cash;
      totalBuyingPower += snapshot.buyingPower;
      totalPortfolioValue += snapshot.portfolioValue;
      totalMarginUsed += snapshot.marginUsed;
      totalDayPL += snapshot.dayPL;
      totalPL += snapshot.totalPL;
      
      brokerBreakdown.push({
        connectionId: conn.id,
        brokerType: conn.brokerType,
        equity: snapshot.equity,
        portfolioValue: snapshot.portfolioValue,
        dayPL: snapshot.dayPL,
        totalPL: snapshot.totalPL,
      });
    }
  }
  
  return {
    totalEquity,
    totalCash,
    totalBuyingPower,
    totalPortfolioValue,
    totalMarginUsed,
    totalDayPL,
    totalPL,
    connectionCount: connections.length,
    brokerBreakdown,
  };
}

/**
 * Get buying power utilization over time
 */
export async function getBuyingPowerHistory(
  connectionId: string,
  userId: string,
  days: number = 30
) {
  const db = await getDb();
  if (!db) return [];
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const snapshots = await db
    .select()
    .from(brokerAccountSnapshots)
    .where(
      and(
        eq(brokerAccountSnapshots.connectionId, connectionId),
        eq(brokerAccountSnapshots.userId, userId),
        gte(brokerAccountSnapshots.snapshotDate, startDate)
      )
    )
    .orderBy(brokerAccountSnapshots.snapshotDate);
  
  return snapshots.map(s => ({
    date: s.snapshotDate.toISOString().split('T')[0],
    buyingPower: parseFloat(s.buyingPower),
    marginUsed: parseFloat(s.marginUsed),
    marginUtilization: s.marginUtilization ? parseFloat(s.marginUtilization) : 0,
  }));
}

/**
 * Get trade frequency analysis
 */
export async function getTradeFrequency(
  connectionId: string,
  userId: string,
  days: number = 30
) {
  const db = await getDb();
  if (!db) return { daily: [], hourly: [], bySymbol: [] };
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const executions = await db
    .select()
    .from(orderExecutions)
    .where(
      and(
        eq(orderExecutions.connectionId, connectionId),
        eq(orderExecutions.userId, userId),
        gte(orderExecutions.executedAt, startDate)
      )
    );
  
  // Daily frequency
  const dailyMap = new Map<string, number>();
  const hourlyMap = new Map<number, number>();
  const symbolMap = new Map<string, number>();
  
  for (const exec of executions) {
    const date = exec.executedAt.toISOString().split('T')[0];
    const hour = exec.executedAt.getHours();
    const symbol = exec.symbol;
    
    dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
    hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
    symbolMap.set(symbol, (symbolMap.get(symbol) || 0) + 1);
  }
  
  const daily = Array.from(dailyMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  const hourly = Array.from(hourlyMap.entries())
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour - b.hour);
  
  const bySymbol = Array.from(symbolMap.entries())
    .map(([symbol, count]) => ({ symbol, count }))
    .sort((a, b) => b.count - a.count);
  
  return { daily, hourly, bySymbol };
}

function formatSnapshot(snapshot: typeof brokerAccountSnapshots.$inferSelect) {
  return {
    id: snapshot.id,
    connectionId: snapshot.connectionId,
    equity: parseFloat(snapshot.equity),
    cash: parseFloat(snapshot.cash),
    buyingPower: parseFloat(snapshot.buyingPower),
    portfolioValue: parseFloat(snapshot.portfolioValue),
    marginUsed: parseFloat(snapshot.marginUsed),
    marginAvailable: snapshot.marginAvailable ? parseFloat(snapshot.marginAvailable) : null,
    marginUtilization: snapshot.marginUtilization ? parseFloat(snapshot.marginUtilization) : 0,
    dayPL: parseFloat(snapshot.dayPL),
    dayPLPercent: snapshot.dayPLPercent ? parseFloat(snapshot.dayPLPercent) : 0,
    totalPL: parseFloat(snapshot.totalPL),
    totalPLPercent: snapshot.totalPLPercent ? parseFloat(snapshot.totalPLPercent) : 0,
    tradesCount: snapshot.tradesCount,
    winningTrades: snapshot.winningTrades,
    losingTrades: snapshot.losingTrades,
    tradingVolume: parseFloat(snapshot.tradingVolume),
    positionsCount: snapshot.positionsCount,
    longPositions: snapshot.longPositions,
    shortPositions: snapshot.shortPositions,
    snapshotDate: snapshot.snapshotDate.toISOString(),
  };
}

function formatMetrics(metrics: typeof brokerPerformanceMetrics.$inferSelect) {
  return {
    id: metrics.id,
    connectionId: metrics.connectionId,
    periodType: metrics.periodType,
    periodStart: metrics.periodStart.toISOString(),
    periodEnd: metrics.periodEnd.toISOString(),
    totalReturn: parseFloat(metrics.totalReturn),
    totalReturnPercent: metrics.totalReturnPercent ? parseFloat(metrics.totalReturnPercent) : null,
    sharpeRatio: metrics.sharpeRatio ? parseFloat(metrics.sharpeRatio) : null,
    sortinoRatio: metrics.sortinoRatio ? parseFloat(metrics.sortinoRatio) : null,
    maxDrawdown: metrics.maxDrawdown ? parseFloat(metrics.maxDrawdown) : null,
    maxDrawdownDuration: metrics.maxDrawdownDuration,
    volatility: metrics.volatility ? parseFloat(metrics.volatility) : null,
    totalTrades: metrics.totalTrades,
    winningTrades: metrics.winningTrades,
    losingTrades: metrics.losingTrades,
    winRate: metrics.winRate ? parseFloat(metrics.winRate) : null,
    profitFactor: metrics.profitFactor ? parseFloat(metrics.profitFactor) : null,
    avgWin: metrics.avgWin ? parseFloat(metrics.avgWin) : null,
    avgLoss: metrics.avgLoss ? parseFloat(metrics.avgLoss) : null,
    largestWin: metrics.largestWin ? parseFloat(metrics.largestWin) : null,
    largestLoss: metrics.largestLoss ? parseFloat(metrics.largestLoss) : null,
    totalVolume: parseFloat(metrics.totalVolume),
    avgTradeSize: metrics.avgTradeSize ? parseFloat(metrics.avgTradeSize) : null,
    avgHoldingPeriod: metrics.avgHoldingPeriod ? parseFloat(metrics.avgHoldingPeriod) : null,
    calculatedAt: metrics.calculatedAt.toISOString(),
  };
}
