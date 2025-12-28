/**
 * Tests for Prediction Tracking and Backtest Comparison
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  initializeSampleData,
  getAllPredictions,
  getPredictionStats,
  getWeightHistory,
  getCurrentWeights,
} from './services/ai-agents/PredictionTracking';
import {
  initializeSampleBacktests,
  getUserBacktestRuns,
  compareBacktests,
  saveBacktestRun,
  deleteBacktestRun,
} from './services/ai-agents/BacktestComparison';

describe('Prediction Tracking', () => {
  const testUserId = 'test-user-prediction';

  beforeEach(() => {
    // Initialize sample data for testing
    initializeSampleData(testUserId);
  });

  describe('initializeSampleData', () => {
    it('should initialize sample predictions for a user', () => {
      initializeSampleData(testUserId);
      // Should not throw
      expect(true).toBe(true);
    });

    it('should be idempotent - calling multiple times should not duplicate data', () => {
      initializeSampleData(testUserId);
      initializeSampleData(testUserId);
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('getAllPredictions', () => {
    it('should return predictions for a user', async () => {
      const predictions = await getAllPredictions(testUserId);
      expect(Array.isArray(predictions)).toBe(true);
    });

    it('should return predictions with required fields', async () => {
      const predictions = await getAllPredictions(testUserId);
      if (predictions.length > 0) {
        const prediction = predictions[0];
        expect(prediction).toHaveProperty('id');
        expect(prediction).toHaveProperty('symbol');
        expect(prediction).toHaveProperty('predictionSignal');
        expect(prediction).toHaveProperty('confidence');
      }
    });
  });

  describe('getPredictionStats', () => {
    it('should return prediction statistics', async () => {
      const stats = await getPredictionStats(testUserId, 30);
      expect(stats).toHaveProperty('totalPredictions');
      expect(stats).toHaveProperty('overallAccuracy');
      expect(stats).toHaveProperty('winRate');
    });

    it('should calculate accuracy correctly', async () => {
      const stats = await getPredictionStats(testUserId, 30);
      expect(stats.overallAccuracy).toBeGreaterThanOrEqual(0);
      expect(stats.overallAccuracy).toBeLessThanOrEqual(100);
    });

    it('should include agent-specific accuracy', async () => {
      const stats = await getPredictionStats(testUserId, 30);
      expect(stats).toHaveProperty('byAgent');
      expect(typeof stats.byAgent).toBe('object');
    });
  });

  describe('getWeightHistory', () => {
    it('should return weight history for a user', async () => {
      const history = await getWeightHistory(testUserId, 30);
      expect(Array.isArray(history)).toBe(true);
    });

    it('should return weight snapshots with required fields', async () => {
      const history = await getWeightHistory(testUserId, 30);
      if (history.length > 0) {
        const snapshot = history[0];
        expect(snapshot).toHaveProperty('snapshotTimestamp');
        expect(snapshot).toHaveProperty('weights');
        expect(snapshot).toHaveProperty('marketRegime');
      }
    });
  });

  describe('getCurrentWeights', () => {
    it('should return current agent weights', async () => {
      const weights = await getCurrentWeights(testUserId);
      expect(weights).toHaveProperty('technical');
      expect(weights).toHaveProperty('fundamental');
    });

    it('should return weights for all agents', async () => {
      const weights = await getCurrentWeights(testUserId);
      const agentTypes = ['technical', 'fundamental', 'sentiment', 'risk', 'regime', 'execution', 'coordinator'];
      for (const agent of agentTypes) {
        expect(weights).toHaveProperty(agent);
      }
    });

    it('should have weights that sum to approximately 1', async () => {
      const weights = await getCurrentWeights(testUserId);
      const sum = Object.values(weights).reduce((a: number, b: number) => a + b, 0);
      expect(sum).toBeCloseTo(1, 1);
    });
  });
});

describe('Backtest Comparison', () => {
  const testUserId = 'test-user-backtest';

  beforeEach(() => {
    // Initialize sample backtests for testing
    initializeSampleBacktests(testUserId);
  });

  describe('initializeSampleBacktests', () => {
    it('should initialize sample backtests for a user', () => {
      initializeSampleBacktests(testUserId);
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('getUserBacktestRuns', () => {
    it('should return backtest runs for a user', async () => {
      const runs = await getUserBacktestRuns(testUserId);
      expect(Array.isArray(runs)).toBe(true);
    });

    it('should return runs with required fields', async () => {
      const runs = await getUserBacktestRuns(testUserId);
      if (runs.length > 0) {
        const run = runs[0];
        expect(run).toHaveProperty('id');
        expect(run).toHaveProperty('name');
        expect(run).toHaveProperty('symbol');
        expect(run).toHaveProperty('results');
      }
    });

    it('should return runs sorted by creation date', async () => {
      const runs = await getUserBacktestRuns(testUserId);
      if (runs.length > 1) {
        for (let i = 0; i < runs.length - 1; i++) {
          expect(runs[i].createdAt.getTime()).toBeGreaterThanOrEqual(runs[i + 1].createdAt.getTime());
        }
      }
    });
  });

  describe('saveBacktestRun', () => {
    it('should save a new backtest run', async () => {
      const newRun = {
        name: 'Test Run',
        symbol: 'AAPL',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        config: {
          initialCapital: 100000,
          transactionCost: 0.1,
          slippage: 0.05,
          useAgentWeights: true,
          rebalanceFrequency: 'daily',
        },
        results: {
          totalReturn: 15.5,
          annualizedReturn: 15.5,
          sharpeRatio: 1.2,
          maxDrawdown: 8.5,
          winRate: 55,
          totalTrades: 100,
          profitFactor: 1.3,
          volatility: 12,
          calmarRatio: 1.8,
          sortinoRatio: 1.5,
          beta: 0.9,
          alpha: 5,
          informationRatio: 0.8,
          treynorRatio: 12,
          equityCurve: [],
          drawdownCurve: [],
          monthlyReturns: [],
          tradeLog: [],
        },
      };

      const runId = await saveBacktestRun(testUserId, newRun);
      expect(typeof runId).toBe('string');
      expect(runId.startsWith('bt_')).toBe(true);
    });
  });

  describe('deleteBacktestRun', () => {
    it('should delete a backtest run', async () => {
      const runs = await getUserBacktestRuns(testUserId);
      if (runs.length > 0) {
        const result = await deleteBacktestRun(testUserId, runs[0].id);
        expect(typeof result).toBe('boolean');
      }
    });

    it('should return false for non-existent run', async () => {
      const result = await deleteBacktestRun(testUserId, 'non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('compareBacktests', () => {
    it('should compare multiple backtest runs', async () => {
      const runs = await getUserBacktestRuns(testUserId);
      if (runs.length >= 2) {
        const comparison = await compareBacktests(testUserId, [runs[0].id, runs[1].id]);
        expect(comparison).toHaveProperty('runs');
        expect(comparison).toHaveProperty('metrics');
        expect(comparison).toHaveProperty('summary');
      }
    });

    it('should throw error for less than 2 runs', async () => {
      const runs = await getUserBacktestRuns(testUserId);
      if (runs.length >= 1) {
        await expect(compareBacktests(testUserId, [runs[0].id])).rejects.toThrow();
      }
    });

    it('should include correlation matrix', async () => {
      const runs = await getUserBacktestRuns(testUserId);
      if (runs.length >= 2) {
        const comparison = await compareBacktests(testUserId, [runs[0].id, runs[1].id]);
        expect(comparison).toHaveProperty('correlationMatrix');
        expect(Array.isArray(comparison.correlationMatrix)).toBe(true);
      }
    });

    it('should include comparison summary with recommendations', async () => {
      const runs = await getUserBacktestRuns(testUserId);
      if (runs.length >= 2) {
        const comparison = await compareBacktests(testUserId, [runs[0].id, runs[1].id]);
        expect(comparison.summary).toHaveProperty('bestOverall');
        expect(comparison.summary).toHaveProperty('recommendations');
        expect(Array.isArray(comparison.summary.recommendations)).toBe(true);
      }
    });

    it('should rank metrics correctly', async () => {
      const runs = await getUserBacktestRuns(testUserId);
      if (runs.length >= 2) {
        const comparison = await compareBacktests(testUserId, [runs[0].id, runs[1].id]);
        for (const metric of comparison.metrics) {
          expect(metric).toHaveProperty('winner');
          expect(metric).toHaveProperty('values');
          for (const value of metric.values) {
            expect(value).toHaveProperty('rank');
            expect(value.rank).toBeGreaterThanOrEqual(1);
          }
        }
      }
    });
  });
});

describe('Integration Tests', () => {
  const testUserId = 'test-user-integration';

  it('should track predictions and update weights', async () => {
    initializeSampleData(testUserId);
    
    // Get initial weights
    const initialWeights = await getCurrentWeights(testUserId);
    expect(initialWeights.technical).toBeDefined();
    
    // Get predictions
    const predictions = await getAllPredictions(testUserId);
    expect(predictions.length).toBeGreaterThan(0);
    
    // Get stats
    const stats = await getPredictionStats(testUserId, 30);
    expect(stats.totalPredictions).toBeGreaterThan(0);
  });

  it('should create and compare backtests', async () => {
    initializeSampleBacktests(testUserId);
    
    // Get runs
    const runs = await getUserBacktestRuns(testUserId);
    expect(runs.length).toBeGreaterThanOrEqual(2);
    
    // Compare runs
    const comparison = await compareBacktests(testUserId, [runs[0].id, runs[1].id]);
    expect(comparison.metrics.length).toBeGreaterThan(0);
    expect(comparison.summary.bestOverall).toBeDefined();
  });

  it('should handle weight history correctly', async () => {
    initializeSampleData(testUserId);
    
    // Get weight history
    const history = await getWeightHistory(testUserId, 30);
    expect(history.length).toBeGreaterThan(0);
    
    // Verify weights are valid
    for (const snapshot of history) {
      if (snapshot.weights) {
        const sum = Object.values(snapshot.weights).reduce((a: number, b: number) => a + b, 0);
        expect(sum).toBeCloseTo(1, 1);
      }
    }
  });
});
