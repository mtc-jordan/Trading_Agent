/**
 * Prediction Tracking Service
 * 
 * Tracks prediction outcomes and feeds real performance data
 * to the adaptive learning engine for weight adjustments.
 */

import { getDb } from '../../db';
import { sql, eq, and, gte, desc, asc } from 'drizzle-orm';
import { updateWeights, detectMarketRegime, type PredictionRecord } from './AdaptiveLearning';

// Types
export interface PredictionEntry {
  userId: string;
  symbol: string;
  assetType: 'stock' | 'crypto';
  predictionSignal: 'buy' | 'sell' | 'hold';
  confidence: number;
  entryPrice: number;
  targetPrice?: number;
  stopLoss?: number;
  agentVotes: Record<string, 'buy' | 'sell' | 'hold'>;
  consensusMethod: string;
  marketRegime: string;
}

export interface PredictionOutcome {
  predictionId: number;
  actualExitPrice: number;
  outcomeTimestamp: Date;
}

export interface PredictionStats {
  totalPredictions: number;
  pendingPredictions: number;
  completedPredictions: number;
  profitablePredictions: number;
  lossPredictions: number;
  neutralPredictions: number;
  overallAccuracy: number;
  averageReturn: number;
  winRate: number;
  profitFactor: number;
  bySignal: {
    buy: { total: number; profitable: number; accuracy: number };
    sell: { total: number; profitable: number; accuracy: number };
    hold: { total: number; profitable: number; accuracy: number };
  };
  byAgent: Record<string, { accuracy: number; contribution: number }>;
}

export interface AgentWeightSnapshot {
  userId: string;
  snapshotTimestamp: Date;
  marketRegime: string;
  weights: Record<string, number>;
  triggerReason: string;
  performanceMetrics: Record<string, number>;
}

// In-memory storage for predictions (will be replaced with proper DB queries)
const predictionStore: Map<number, any> = new Map();
const weightHistoryStore: Map<string, AgentWeightSnapshot[]> = new Map();
let nextPredictionId = 1;

/**
 * Record a new prediction
 */
export async function recordPrediction(entry: PredictionEntry): Promise<number> {
  const id = nextPredictionId++;
  const prediction = {
    id,
    ...entry,
    outcome: 'pending',
    predictionTimestamp: new Date(),
    actualExitPrice: null,
    actualReturnPct: null,
    outcomeTimestamp: null,
    holdingPeriodHours: null,
  };
  predictionStore.set(id, prediction);
  return id;
}

/**
 * Update prediction with actual outcome
 */
export async function updatePredictionOutcome(outcome: PredictionOutcome): Promise<void> {
  const prediction = predictionStore.get(outcome.predictionId);
  if (!prediction) {
    throw new Error('Prediction not found');
  }

  const entryPrice = prediction.entryPrice;
  const exitPrice = outcome.actualExitPrice;
  
  // Calculate return percentage
  let returnPct = 0;
  if (prediction.predictionSignal === 'buy') {
    returnPct = ((exitPrice - entryPrice) / entryPrice) * 100;
  } else if (prediction.predictionSignal === 'sell') {
    returnPct = ((entryPrice - exitPrice) / entryPrice) * 100;
  }

  // Determine outcome
  let outcomeResult: 'profit' | 'loss' | 'neutral' = 'neutral';
  if (returnPct > 0.5) {
    outcomeResult = 'profit';
  } else if (returnPct < -0.5) {
    outcomeResult = 'loss';
  }

  // Calculate holding period
  const predictionTime = prediction.predictionTimestamp.getTime();
  const outcomeTime = outcome.outcomeTimestamp.getTime();
  const holdingPeriodHours = Math.round((outcomeTime - predictionTime) / (1000 * 60 * 60));

  // Update the prediction
  prediction.actualExitPrice = exitPrice;
  prediction.actualReturnPct = returnPct;
  prediction.outcome = outcomeResult;
  prediction.outcomeTimestamp = outcome.outcomeTimestamp;
  prediction.holdingPeriodHours = holdingPeriodHours;

  // Trigger adaptive learning update
  await triggerAdaptiveLearningUpdate(prediction.userId);
}

/**
 * Get prediction statistics for a user
 */
export async function getPredictionStats(userId: string, days: number = 30): Promise<PredictionStats> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const rows = Array.from(predictionStore.values()).filter(
    p => p.userId === userId && p.predictionTimestamp >= cutoffDate
  );
  
  const stats: PredictionStats = {
    totalPredictions: rows.length,
    pendingPredictions: 0,
    completedPredictions: 0,
    profitablePredictions: 0,
    lossPredictions: 0,
    neutralPredictions: 0,
    overallAccuracy: 0,
    averageReturn: 0,
    winRate: 0,
    profitFactor: 0,
    bySignal: {
      buy: { total: 0, profitable: 0, accuracy: 0 },
      sell: { total: 0, profitable: 0, accuracy: 0 },
      hold: { total: 0, profitable: 0, accuracy: 0 },
    },
    byAgent: {},
  };

  let totalReturn = 0;
  let totalProfit = 0;
  let totalLoss = 0;
  const agentStats: Record<string, { correct: number; total: number }> = {};

  for (const row of rows) {
    const signal = row.predictionSignal as 'buy' | 'sell' | 'hold';
    stats.bySignal[signal].total++;

    if (row.outcome === 'pending') {
      stats.pendingPredictions++;
    } else {
      stats.completedPredictions++;
      const returnPct = row.actualReturnPct || 0;
      totalReturn += returnPct;

      if (row.outcome === 'profit') {
        stats.profitablePredictions++;
        stats.bySignal[signal].profitable++;
        totalProfit += returnPct;
      } else if (row.outcome === 'loss') {
        stats.lossPredictions++;
        totalLoss += Math.abs(returnPct);
      } else {
        stats.neutralPredictions++;
      }

      // Track agent performance
      const agentVotes = row.agentVotes || {};
      for (const [agent, vote] of Object.entries(agentVotes)) {
        if (!agentStats[agent]) {
          agentStats[agent] = { correct: 0, total: 0 };
        }
        agentStats[agent].total++;
        
        // Agent was correct if their vote matched the outcome direction
        const wasCorrect = 
          (vote === 'buy' && row.outcome === 'profit') ||
          (vote === 'sell' && row.outcome === 'profit') ||
          (vote === 'hold' && row.outcome === 'neutral');
        
        if (wasCorrect) {
          agentStats[agent].correct++;
        }
      }
    }
  }

  // Calculate derived stats
  if (stats.completedPredictions > 0) {
    stats.overallAccuracy = (stats.profitablePredictions / stats.completedPredictions) * 100;
    stats.averageReturn = totalReturn / stats.completedPredictions;
    stats.winRate = (stats.profitablePredictions / stats.completedPredictions) * 100;
    stats.profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;
  }

  // Calculate signal accuracies
  for (const signal of ['buy', 'sell', 'hold'] as const) {
    const signalStats = stats.bySignal[signal];
    if (signalStats.total > 0) {
      signalStats.accuracy = (signalStats.profitable / signalStats.total) * 100;
    }
  }

  // Calculate agent stats
  for (const [agent, data] of Object.entries(agentStats)) {
    stats.byAgent[agent] = {
      accuracy: data.total > 0 ? (data.correct / data.total) * 100 : 0,
      contribution: data.total,
    };
  }

  return stats;
}

/**
 * Get pending predictions that need outcome tracking
 */
export async function getPendingPredictions(userId: string): Promise<any[]> {
  return Array.from(predictionStore.values()).filter(
    p => p.userId === userId && p.outcome === 'pending'
  );
}

/**
 * Record agent weight snapshot
 */
export async function recordWeightSnapshot(snapshot: AgentWeightSnapshot): Promise<void> {
  const history = weightHistoryStore.get(snapshot.userId) || [];
  history.push(snapshot);
  weightHistoryStore.set(snapshot.userId, history);
}

/**
 * Get agent weight history
 */
export async function getWeightHistory(
  userId: string,
  days: number = 30
): Promise<AgentWeightSnapshot[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const history = weightHistoryStore.get(userId) || [];
  return history.filter(s => s.snapshotTimestamp >= cutoffDate);
}

/**
 * Trigger adaptive learning update based on recent predictions
 */
async function triggerAdaptiveLearningUpdate(userId: string): Promise<void> {
  // Get recent completed predictions
  const rows = Array.from(predictionStore.values())
    .filter(p => p.userId === userId && p.outcome !== 'pending')
    .sort((a, b) => b.outcomeTimestamp.getTime() - a.outcomeTimestamp.getTime())
    .slice(0, 50);

  if (rows.length < 10) return; // Need minimum predictions for learning

  // Get current weights (or use defaults)
  const history = weightHistoryStore.get(userId) || [];
  let currentWeights: Record<string, number> = {
    technical: 0.20,
    fundamental: 0.18,
    sentiment: 0.15,
    risk: 0.15,
    regime: 0.12,
    execution: 0.10,
    coordinator: 0.10,
  };

  if (history.length > 0) {
    currentWeights = history[history.length - 1].weights;
  }

  // Detect current market regime
  const priceData = rows.map(r => ({
    close: r.entryPrice,
    volume: 1000000, // Placeholder
  }));
  const volatilityData = rows.map(r => Math.abs(r.actualReturnPct || 0) / 100);
  const regime = detectMarketRegime(priceData, volatilityData);

  // Expand predictions per agent
  const agentPredictions: PredictionRecord[] = [];
  for (const row of rows) {
    const agentVotes = row.agentVotes || {};
    for (const [agent, vote] of Object.entries(agentVotes)) {
      agentPredictions.push({
        id: `${row.id}-${agent}`,
        agentType: agent,
        symbol: row.symbol,
        prediction: vote as 'buy' | 'sell' | 'hold',
        confidence: row.confidence,
        actualOutcome: row.outcome as 'profit' | 'loss' | 'neutral',
        returnPercent: row.actualReturnPct || 0,
        marketRegime: row.marketRegime as 'bull' | 'bear' | 'sideways' | 'volatile' | 'calm',
        timestamp: row.outcomeTimestamp.getTime(),
      });
    }
  }

  // Update weights
  const result = updateWeights(currentWeights, agentPredictions, regime);

  // Record the new weight snapshot
  await recordWeightSnapshot({
    userId,
    snapshotTimestamp: new Date(),
    marketRegime: regime.type,
    weights: result.newWeights,
    triggerReason: 'Automatic update from prediction outcomes',
    performanceMetrics: {
      recentPredictions: rows.length,
      accuracy: (rows.filter(r => r.outcome === 'profit').length / rows.length) * 100,
    },
  });
}

/**
 * Get current agent weights for a user
 */
export async function getCurrentWeights(userId: string): Promise<Record<string, number>> {
  const history = weightHistoryStore.get(userId) || [];
  
  if (history.length > 0) {
    return history[history.length - 1].weights;
  }

  return {
    technical: 0.20,
    fundamental: 0.18,
    sentiment: 0.15,
    risk: 0.15,
    regime: 0.12,
    execution: 0.10,
    coordinator: 0.10,
  };
}

/**
 * Get all predictions for a user (for visualization)
 */
export async function getAllPredictions(userId: string): Promise<any[]> {
  return Array.from(predictionStore.values())
    .filter(p => p.userId === userId)
    .sort((a, b) => b.predictionTimestamp.getTime() - a.predictionTimestamp.getTime());
}

/**
 * Initialize with some sample data for visualization
 */
export function initializeSampleData(userId: string): void {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  
  // Create sample predictions over the last 30 days
  const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA'];
  const signals: ('buy' | 'sell' | 'hold')[] = ['buy', 'sell', 'hold'];
  
  for (let i = 0; i < 50; i++) {
    const timestamp = new Date(now - (i * day * 0.6));
    const symbol = symbols[i % symbols.length];
    const signal = signals[Math.floor(Math.random() * 3)];
    const entryPrice = 100 + Math.random() * 100;
    const returnPct = (Math.random() - 0.4) * 10; // Slight positive bias
    
    const prediction = {
      id: nextPredictionId++,
      userId,
      symbol,
      assetType: 'stock' as const,
      predictionSignal: signal,
      confidence: 60 + Math.random() * 35,
      entryPrice,
      targetPrice: entryPrice * (1 + Math.random() * 0.1),
      stopLoss: entryPrice * (1 - Math.random() * 0.05),
      agentVotes: {
        technical: signals[Math.floor(Math.random() * 3)] as 'buy' | 'sell' | 'hold',
        fundamental: signals[Math.floor(Math.random() * 3)] as 'buy' | 'sell' | 'hold',
        sentiment: signals[Math.floor(Math.random() * 3)] as 'buy' | 'sell' | 'hold',
        risk: signals[Math.floor(Math.random() * 3)] as 'buy' | 'sell' | 'hold',
        regime: signals[Math.floor(Math.random() * 3)] as 'buy' | 'sell' | 'hold',
        execution: signals[Math.floor(Math.random() * 3)] as 'buy' | 'sell' | 'hold',
        coordinator: signal as 'buy' | 'sell' | 'hold',
      },
      consensusMethod: 'weighted_voting',
      marketRegime: ['bull', 'bear', 'sideways', 'volatile'][Math.floor(Math.random() * 4)],
      outcome: returnPct > 0.5 ? 'profit' : returnPct < -0.5 ? 'loss' : 'neutral',
      predictionTimestamp: timestamp,
      actualExitPrice: entryPrice * (1 + returnPct / 100),
      actualReturnPct: returnPct,
      outcomeTimestamp: new Date(timestamp.getTime() + day * 2),
      holdingPeriodHours: 48,
    };
    
    predictionStore.set(prediction.id, prediction);
  }
  
  // Create sample weight history
  const regimes = ['bull', 'bear', 'sideways', 'volatile'];
  for (let i = 30; i >= 0; i--) {
    const snapshot: AgentWeightSnapshot = {
      userId,
      snapshotTimestamp: new Date(now - i * day),
      marketRegime: regimes[Math.floor(Math.random() * 4)],
      weights: {
        technical: 0.15 + Math.random() * 0.10,
        fundamental: 0.13 + Math.random() * 0.10,
        sentiment: 0.10 + Math.random() * 0.10,
        risk: 0.10 + Math.random() * 0.10,
        regime: 0.08 + Math.random() * 0.08,
        execution: 0.06 + Math.random() * 0.08,
        coordinator: 0.06 + Math.random() * 0.08,
      },
      triggerReason: i === 30 ? 'Initial weights' : 'Automatic update from prediction outcomes',
      performanceMetrics: {
        recentPredictions: 10 + Math.floor(Math.random() * 40),
        accuracy: 50 + Math.random() * 30,
      },
    };
    
    // Normalize weights to sum to 1
    const total = Object.values(snapshot.weights).reduce((a, b) => a + b, 0);
    for (const key of Object.keys(snapshot.weights)) {
      snapshot.weights[key] /= total;
    }
    
    const history = weightHistoryStore.get(userId) || [];
    history.push(snapshot);
    weightHistoryStore.set(userId, history);
  }
}
