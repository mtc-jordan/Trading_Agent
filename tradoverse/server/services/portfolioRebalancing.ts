/**
 * Portfolio Rebalancing Service
 * Handles target allocations, rebalancing calculations, and trade execution
 */

import { getDb } from '../db';
import { 
  portfolioAllocations, 
  rebalancingHistory,
  brokerConnections,
  brokerPositions 
} from '../../drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export interface TargetAllocation {
  symbol: string;
  targetPercent: number;
}

export interface AllocationInput {
  userId: string;
  name: string;
  description?: string;
  targetAllocations: TargetAllocation[];
  rebalanceThreshold?: number;
  rebalanceFrequency?: 'manual' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
  preferredBrokers?: string[];
}

export interface RebalanceTrade {
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  estimatedValue: number;
  connectionId: string;
  brokerType: string;
  reason: string;
}

export interface RebalanceSuggestion {
  allocationId: string;
  totalPortfolioValue: number;
  currentAllocations: Array<{
    symbol: string;
    currentPercent: number;
    targetPercent: number;
    drift: number;
    currentValue: number;
    targetValue: number;
  }>;
  suggestedTrades: RebalanceTrade[];
  estimatedFees: number;
  estimatedTaxImpact: number;
}

/**
 * Create a new portfolio allocation
 */
export async function createAllocation(input: AllocationInput) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  // Validate allocations sum to 100%
  const totalPercent = input.targetAllocations.reduce((sum, a) => sum + a.targetPercent, 0);
  if (Math.abs(totalPercent - 100) > 0.01) {
    throw new Error(`Target allocations must sum to 100%. Current sum: ${totalPercent.toFixed(2)}%`);
  }
  
  const allocation = {
    id: randomUUID(),
    userId: input.userId,
    name: input.name,
    description: input.description || null,
    targetAllocations: JSON.stringify(input.targetAllocations),
    rebalanceThreshold: (input.rebalanceThreshold || 5).toString(),
    rebalanceFrequency: input.rebalanceFrequency || 'manual',
    lastRebalancedAt: null,
    nextRebalanceAt: calculateNextRebalance(input.rebalanceFrequency || 'manual'),
    preferredBrokers: input.preferredBrokers ? JSON.stringify(input.preferredBrokers) : null,
    isActive: true,
  };
  
  await db.insert(portfolioAllocations).values(allocation);
  return formatAllocation(allocation);
}

/**
 * Update an existing allocation
 */
export async function updateAllocation(
  allocationId: string,
  userId: string,
  updates: Partial<AllocationInput>
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const existing = await db
    .select()
    .from(portfolioAllocations)
    .where(
      and(
        eq(portfolioAllocations.id, allocationId),
        eq(portfolioAllocations.userId, userId)
      )
    )
    .limit(1);
  
  if (existing.length === 0) {
    throw new Error('Allocation not found');
  }
  
  const updateData: Record<string, unknown> = {};
  
  if (updates.name) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.targetAllocations) {
    const totalPercent = updates.targetAllocations.reduce((sum, a) => sum + a.targetPercent, 0);
    if (Math.abs(totalPercent - 100) > 0.01) {
      throw new Error(`Target allocations must sum to 100%. Current sum: ${totalPercent.toFixed(2)}%`);
    }
    updateData.targetAllocations = JSON.stringify(updates.targetAllocations);
  }
  if (updates.rebalanceThreshold !== undefined) {
    updateData.rebalanceThreshold = updates.rebalanceThreshold.toString();
  }
  if (updates.rebalanceFrequency) {
    updateData.rebalanceFrequency = updates.rebalanceFrequency;
    updateData.nextRebalanceAt = calculateNextRebalance(updates.rebalanceFrequency);
  }
  if (updates.preferredBrokers) {
    updateData.preferredBrokers = JSON.stringify(updates.preferredBrokers);
  }
  
  await db
    .update(portfolioAllocations)
    .set(updateData)
    .where(eq(portfolioAllocations.id, allocationId));
  
  return getAllocation(allocationId, userId);
}

/**
 * Get allocation by ID
 */
export async function getAllocation(allocationId: string, userId: string) {
  const db = await getDb();
  if (!db) return null;
  
  const allocations = await db
    .select()
    .from(portfolioAllocations)
    .where(
      and(
        eq(portfolioAllocations.id, allocationId),
        eq(portfolioAllocations.userId, userId)
      )
    )
    .limit(1);
  
  if (allocations.length === 0) return null;
  return formatAllocation(allocations[0]);
}

/**
 * Get all allocations for a user
 */
export async function getUserAllocations(userId: string) {
  const db = await getDb();
  if (!db) return [];
  
  const allocations = await db
    .select()
    .from(portfolioAllocations)
    .where(eq(portfolioAllocations.userId, userId))
    .orderBy(desc(portfolioAllocations.createdAt));
  
  return allocations.map(formatAllocation);
}

/**
 * Delete an allocation
 */
export async function deleteAllocation(allocationId: string, userId: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db
    .delete(portfolioAllocations)
    .where(
      and(
        eq(portfolioAllocations.id, allocationId),
        eq(portfolioAllocations.userId, userId)
      )
    );
}

/**
 * Calculate rebalancing suggestions
 */
export async function calculateRebalanceSuggestions(
  allocationId: string,
  userId: string
): Promise<RebalanceSuggestion | null> {
  const db = await getDb();
  if (!db) return null;
  
  // Get allocation
  const allocation = await getAllocation(allocationId, userId);
  if (!allocation) return null;
  
  // Get all positions across brokers
  const positions = await db
    .select()
    .from(brokerPositions)
    .where(eq(brokerPositions.userId, userId));
  
  // Get broker connections
  const connections = await db
    .select()
    .from(brokerConnections)
    .where(eq(brokerConnections.userId, userId));
  
  const connectionMap = new Map(connections.map(c => [c.id, c]));
  
  // Calculate current portfolio value and allocations
  let totalPortfolioValue = 0;
  const currentHoldings = new Map<string, { value: number; quantity: number; connectionId: string }>();
  
  for (const pos of positions) {
    const value = parseFloat(pos.marketValue || '0');
    totalPortfolioValue += value;
    
    const existing = currentHoldings.get(pos.symbol);
    if (existing) {
      existing.value += value;
      existing.quantity += parseFloat(pos.quantity);
    } else {
      currentHoldings.set(pos.symbol, {
        value,
        quantity: parseFloat(pos.quantity),
        connectionId: pos.connectionId,
      });
    }
  }
  
  if (totalPortfolioValue === 0) {
    return {
      allocationId,
      totalPortfolioValue: 0,
      currentAllocations: [],
      suggestedTrades: [],
      estimatedFees: 0,
      estimatedTaxImpact: 0,
    };
  }
  
  // Calculate current vs target allocations
  const currentAllocations: RebalanceSuggestion['currentAllocations'] = [];
  const suggestedTrades: RebalanceTrade[] = [];
  
  for (const target of allocation.targetAllocations) {
    const current = currentHoldings.get(target.symbol);
    const currentValue = current?.value || 0;
    const currentPercent = (currentValue / totalPortfolioValue) * 100;
    const targetValue = (target.targetPercent / 100) * totalPortfolioValue;
    const drift = currentPercent - target.targetPercent;
    
    currentAllocations.push({
      symbol: target.symbol,
      currentPercent,
      targetPercent: target.targetPercent,
      drift,
      currentValue,
      targetValue,
    });
    
    // Check if rebalancing is needed
    if (Math.abs(drift) > allocation.rebalanceThreshold) {
      const valueDiff = targetValue - currentValue;
      const currentPrice = current?.value && current?.quantity 
        ? current.value / current.quantity 
        : 0;
      
      // Estimate quantity (would need real price data)
      const estimatedPrice = currentPrice || 100; // Fallback price
      const quantity = Math.abs(valueDiff / estimatedPrice);
      
      // Find best broker for this trade
      let connectionId = current?.connectionId || '';
      let brokerType = 'unknown';
      
      if (allocation.preferredBrokers && allocation.preferredBrokers.length > 0) {
        connectionId = allocation.preferredBrokers[0];
      }
      
      const conn = connectionMap.get(connectionId);
      if (conn) {
        brokerType = conn.brokerType;
      }
      
      if (valueDiff !== 0 && connectionId) {
        suggestedTrades.push({
          symbol: target.symbol,
          side: valueDiff > 0 ? 'buy' : 'sell',
          quantity: Math.round(quantity * 100) / 100,
          estimatedValue: Math.abs(valueDiff),
          connectionId,
          brokerType,
          reason: `${drift > 0 ? 'Overweight' : 'Underweight'} by ${Math.abs(drift).toFixed(2)}%`,
        });
      }
    }
  }
  
  // Check for positions not in target allocation (should be sold)
  for (const [symbol, holding] of Array.from(currentHoldings.entries())) {
    const inTarget = allocation.targetAllocations.some((t: TargetAllocation) => t.symbol === symbol);
    if (!inTarget && holding.value > 0) {
      const conn = connectionMap.get(holding.connectionId);
      
      currentAllocations.push({
        symbol,
        currentPercent: (holding.value / totalPortfolioValue) * 100,
        targetPercent: 0,
        drift: (holding.value / totalPortfolioValue) * 100,
        currentValue: holding.value,
        targetValue: 0,
      });
      
      suggestedTrades.push({
        symbol,
        side: 'sell',
        quantity: holding.quantity,
        estimatedValue: holding.value,
        connectionId: holding.connectionId,
        brokerType: conn?.brokerType || 'unknown',
        reason: 'Not in target allocation - should be sold',
      });
    }
  }
  
  // Estimate fees (rough estimate: $0.01 per share)
  const estimatedFees = suggestedTrades.reduce((sum, t) => sum + t.quantity * 0.01, 0);
  
  // Estimate tax impact (rough estimate: 15% on gains for sells)
  const estimatedTaxImpact = suggestedTrades
    .filter(t => t.side === 'sell')
    .reduce((sum, t) => sum + t.estimatedValue * 0.15, 0);
  
  return {
    allocationId,
    totalPortfolioValue,
    currentAllocations: currentAllocations.sort((a, b) => b.currentValue - a.currentValue),
    suggestedTrades: suggestedTrades.sort((a, b) => b.estimatedValue - a.estimatedValue),
    estimatedFees,
    estimatedTaxImpact,
  };
}

/**
 * Execute rebalancing trades
 */
export async function executeRebalancing(
  allocationId: string,
  userId: string,
  tradesToExecute?: string[] // Optional: specific symbols to rebalance
): Promise<{ historyId: string; status: string }> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  // Get suggestions
  const suggestions = await calculateRebalanceSuggestions(allocationId, userId);
  if (!suggestions) {
    throw new Error('Could not calculate rebalancing suggestions');
  }
  
  // Filter trades if specific symbols requested
  let trades = suggestions.suggestedTrades;
  if (tradesToExecute && tradesToExecute.length > 0) {
    trades = trades.filter(t => tradesToExecute.includes(t.symbol));
  }
  
  if (trades.length === 0) {
    throw new Error('No trades to execute');
  }
  
  // Create history record
  const historyId = randomUUID();
  const now = new Date();
  
  const historyRecord = {
    id: historyId,
    allocationId,
    userId,
    preAllocations: JSON.stringify(
      suggestions.currentAllocations.map(a => ({
        symbol: a.symbol,
        actual: a.currentPercent,
        target: a.targetPercent,
        value: a.currentValue,
      }))
    ),
    totalPortfolioValue: suggestions.totalPortfolioValue.toString(),
    tradesExecuted: JSON.stringify(trades),
    tradesCount: trades.length,
    totalTradingVolume: trades.reduce((sum, t) => sum + t.estimatedValue, 0).toString(),
    totalFees: suggestions.estimatedFees.toString(),
    postAllocations: JSON.stringify([]), // Will be updated after execution
    status: 'pending' as const,
    errorMessage: null,
    triggeredBy: 'manual' as const,
    startedAt: now,
    completedAt: null,
  };
  
  await db.insert(rebalancingHistory).values(historyRecord);
  
  // In a real implementation, this would:
  // 1. Place orders through broker APIs
  // 2. Wait for fills
  // 3. Update status and post-allocations
  
  // For now, mark as completed (simulated)
  await db
    .update(rebalancingHistory)
    .set({
      status: 'completed',
      completedAt: new Date(),
      postAllocations: JSON.stringify(
        suggestions.currentAllocations.map(a => ({
          symbol: a.symbol,
          actual: a.targetPercent, // Assuming perfect execution
          target: a.targetPercent,
          value: a.targetValue,
        }))
      ),
    })
    .where(eq(rebalancingHistory.id, historyId));
  
  // Update allocation's last rebalanced time
  await db
    .update(portfolioAllocations)
    .set({
      lastRebalancedAt: now,
      nextRebalanceAt: calculateNextRebalance(
        (await getAllocation(allocationId, userId))?.rebalanceFrequency || 'manual'
      ),
    })
    .where(eq(portfolioAllocations.id, allocationId));
  
  return { historyId, status: 'completed' };
}

/**
 * Get rebalancing history
 */
export async function getRebalancingHistory(
  userId: string,
  allocationId?: string,
  limit: number = 20
) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(rebalancingHistory.userId, userId)];
  
  if (allocationId) {
    conditions.push(eq(rebalancingHistory.allocationId, allocationId));
  }
  
  const history = await db
    .select()
    .from(rebalancingHistory)
    .where(and(...conditions))
    .orderBy(desc(rebalancingHistory.createdAt))
    .limit(limit);
  
  return history.map(formatHistory);
}

/**
 * Calculate next rebalance date
 */
function calculateNextRebalance(frequency: string): Date | null {
  const now = new Date();
  
  switch (frequency) {
    case 'daily':
      now.setDate(now.getDate() + 1);
      break;
    case 'weekly':
      now.setDate(now.getDate() + 7);
      break;
    case 'monthly':
      now.setMonth(now.getMonth() + 1);
      break;
    case 'quarterly':
      now.setMonth(now.getMonth() + 3);
      break;
    case 'manual':
    default:
      return null;
  }
  
  return now;
}

function formatAllocation(allocation: typeof portfolioAllocations.$inferSelect | Record<string, unknown>) {
  const targetAllocations = typeof allocation.targetAllocations === 'string'
    ? JSON.parse(allocation.targetAllocations)
    : allocation.targetAllocations;
  
  const preferredBrokers = allocation.preferredBrokers
    ? (typeof allocation.preferredBrokers === 'string'
        ? JSON.parse(allocation.preferredBrokers)
        : allocation.preferredBrokers)
    : [];
  
  return {
    id: allocation.id as string,
    userId: allocation.userId as string,
    name: allocation.name as string,
    description: allocation.description as string | null,
    targetAllocations,
    rebalanceThreshold: parseFloat(allocation.rebalanceThreshold as string),
    rebalanceFrequency: allocation.rebalanceFrequency as string,
    lastRebalancedAt: allocation.lastRebalancedAt 
      ? (allocation.lastRebalancedAt as Date).toISOString() 
      : null,
    nextRebalanceAt: allocation.nextRebalanceAt 
      ? (allocation.nextRebalanceAt as Date).toISOString() 
      : null,
    preferredBrokers,
    isActive: allocation.isActive as boolean,
    createdAt: allocation.createdAt ? (allocation.createdAt as Date).toISOString() : new Date().toISOString(),
    updatedAt: allocation.updatedAt ? (allocation.updatedAt as Date).toISOString() : new Date().toISOString(),
  };
}

function formatHistory(history: typeof rebalancingHistory.$inferSelect) {
  return {
    id: history.id,
    allocationId: history.allocationId,
    preAllocations: JSON.parse(history.preAllocations as string),
    totalPortfolioValue: parseFloat(history.totalPortfolioValue),
    tradesExecuted: JSON.parse(history.tradesExecuted as string),
    tradesCount: history.tradesCount,
    totalTradingVolume: parseFloat(history.totalTradingVolume),
    totalFees: parseFloat(history.totalFees),
    postAllocations: JSON.parse(history.postAllocations as string),
    status: history.status,
    errorMessage: history.errorMessage,
    triggeredBy: history.triggeredBy,
    startedAt: history.startedAt?.toISOString() || null,
    completedAt: history.completedAt?.toISOString() || null,
    createdAt: history.createdAt.toISOString(),
  };
}
