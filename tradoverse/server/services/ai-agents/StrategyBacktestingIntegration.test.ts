/**
 * Strategy Backtesting Integration Tests
 */

import { describe, it, expect } from 'vitest';
import {
  runBacktest,
  compareBacktestResults,
  getBacktestSummary,
  runParameterSweep,
} from './StrategyBacktestingIntegration';
import type { GeneratedStrategy } from './AutomatedStrategyGeneration';

// Mock strategy for testing
const mockStrategy: GeneratedStrategy = {
  id: 'test-strategy-1',
  name: 'Test Momentum Strategy',
  description: 'A test strategy for backtesting',
  type: 'momentum',
  riskProfile: {
    userId: 'test-user',
    riskTolerance: 'moderate',
    investmentHorizon: 'medium_term',
    maxDrawdownTolerance: 20,
    targetReturn: 15,
    diversificationPreference: 'moderate',
    volatilityTolerance: 'medium',
    createdAt: Date.now(),
  },
  entryRules: [
    {
      id: 'entry-1',
      name: 'RSI Oversold',
      description: 'Enter when RSI is oversold',
      indicator: 'RSI',
      condition: 'below',
      value: 30,
      weight: 1,
    },
  ],
  exitRules: [
    {
      id: 'exit-1',
      name: 'RSI Overbought',
      description: 'Exit when RSI is overbought',
      indicator: 'RSI',
      condition: 'above',
      value: 70,
      weight: 1,
    },
  ],
  indicators: [
    {
      name: 'RSI',
      type: 'momentum',
      parameters: { period: 14 },
      description: 'Relative Strength Index',
    },
  ],
  riskManagement: {
    stopLoss: { type: 'percentage', value: 5 },
    takeProfit: { type: 'percentage', value: 10 },
    trailingStop: { enabled: true, value: 3 },
    maxPositionSize: 10,
    maxDailyLoss: 5,
    maxOpenPositions: 3,
  },
  positionSizing: {
    method: 'percent_of_capital',
    baseSize: 5,
    maxSize: 10,
    scalingFactor: 1,
  },
  timeframes: ['1d'],
  markets: ['stocks'],
  expectedMetrics: {
    winRate: 55,
    avgWin: 8,
    avgLoss: 4,
    sharpeRatio: 1.2,
    maxDrawdown: 15,
    profitFactor: 1.5,
  },
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const mockBacktestConfig = {
  strategyId: 'test-strategy-1',
  symbol: 'AAPL',
  startDate: Date.now() - 365 * 24 * 60 * 60 * 1000, // 1 year ago
  endDate: Date.now(),
  initialCapital: 100000,
  commission: 0.001,
  slippage: 0.001,
  useMarginTrading: false,
  maxLeverage: 1,
};

describe('StrategyBacktestingIntegration', () => {
  describe('runBacktest', () => {
    it('should run a backtest and return results', () => {
      const result = runBacktest(mockStrategy, mockBacktestConfig);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.strategyId).toBe(mockStrategy.id);
      expect(result.strategyName).toBe(mockStrategy.name);
      expect(result.config.symbol).toBe(mockBacktestConfig.symbol);
    });

    it('should calculate metrics correctly', () => {
      const result = runBacktest(mockStrategy, mockBacktestConfig);
      
      expect(result.metrics).toBeDefined();
      expect(typeof result.metrics.totalReturn).toBe('number');
      expect(typeof result.metrics.totalReturnPercent).toBe('number');
      expect(typeof result.metrics.sharpeRatio).toBe('number');
      expect(typeof result.metrics.maxDrawdown).toBe('number');
      expect(typeof result.metrics.winRate).toBe('number');
    });

    it('should generate equity curve', () => {
      const result = runBacktest(mockStrategy, mockBacktestConfig);
      
      expect(result.equityCurve).toBeDefined();
      expect(Array.isArray(result.equityCurve)).toBe(true);
      expect(result.equityCurve.length).toBeGreaterThan(0);
      
      // Check equity curve point structure
      const point = result.equityCurve[0];
      expect(point.timestamp).toBeDefined();
      expect(point.equity).toBeDefined();
      expect(point.drawdown).toBeDefined();
    });

    it('should record trades', () => {
      const result = runBacktest(mockStrategy, mockBacktestConfig);
      
      expect(result.trades).toBeDefined();
      expect(Array.isArray(result.trades)).toBe(true);
      
      // If there are trades, check structure
      if (result.trades.length > 0) {
        const trade = result.trades[0];
        expect(trade.id).toBeDefined();
        expect(trade.entryTime).toBeDefined();
        expect(trade.entryPrice).toBeDefined();
        expect(trade.side).toBeDefined();
      }
    });

    it('should handle different initial capital amounts', () => {
      const smallCapital = runBacktest(mockStrategy, { ...mockBacktestConfig, initialCapital: 10000 });
      const largeCapital = runBacktest(mockStrategy, { ...mockBacktestConfig, initialCapital: 1000000 });
      
      expect(smallCapital.config.initialCapital).toBe(10000);
      expect(largeCapital.config.initialCapital).toBe(1000000);
    });

    it('should include execution duration', () => {
      const result = runBacktest(mockStrategy, mockBacktestConfig);
      
      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('compareBacktestResults', () => {
    it('should compare multiple backtest results', () => {
      const result1 = runBacktest(mockStrategy, mockBacktestConfig);
      const result2 = runBacktest(
        { ...mockStrategy, id: 'test-2', name: 'Test Strategy 2' },
        mockBacktestConfig
      );
      
      const comparison = compareBacktestResults([result1, result2]);
      
      expect(comparison).toBeDefined();
      expect(comparison.comparison).toBeDefined();
      expect(Array.isArray(comparison.comparison)).toBe(true);
      expect(comparison.comparison.length).toBe(2);
    });

    it('should identify best performers', () => {
      const result1 = runBacktest(mockStrategy, mockBacktestConfig);
      const result2 = runBacktest(
        { ...mockStrategy, id: 'test-2', name: 'Test Strategy 2' },
        mockBacktestConfig
      );
      
      const comparison = compareBacktestResults([result1, result2]);
      
      expect(comparison.bestOverall).toBeDefined();
      expect(comparison.bestRiskAdjusted).toBeDefined();
      expect(comparison.bestWinRate).toBeDefined();
    });

    it('should calculate scores for each result', () => {
      const result1 = runBacktest(mockStrategy, mockBacktestConfig);
      
      const comparison = compareBacktestResults([result1]);
      
      expect(comparison.comparison[0].score).toBeDefined();
      expect(typeof comparison.comparison[0].score).toBe('number');
    });

    it('should sort by score descending', () => {
      const result1 = runBacktest(mockStrategy, mockBacktestConfig);
      const result2 = runBacktest(
        { ...mockStrategy, id: 'test-2', name: 'Test Strategy 2' },
        mockBacktestConfig
      );
      const result3 = runBacktest(
        { ...mockStrategy, id: 'test-3', name: 'Test Strategy 3' },
        mockBacktestConfig
      );
      
      const comparison = compareBacktestResults([result1, result2, result3]);
      
      for (let i = 1; i < comparison.comparison.length; i++) {
        expect(comparison.comparison[i - 1].score).toBeGreaterThanOrEqual(comparison.comparison[i].score);
      }
    });
  });

  describe('getBacktestSummary', () => {
    it('should generate a summary of backtest results', () => {
      const result = runBacktest(mockStrategy, mockBacktestConfig);
      const summary = getBacktestSummary(result);
      
      expect(summary).toBeDefined();
      expect(summary.overview).toBeDefined();
      expect(summary.performance).toBeDefined();
      expect(summary.risk).toBeDefined();
    });

    it('should format values as strings', () => {
      const result = runBacktest(mockStrategy, mockBacktestConfig);
      const summary = getBacktestSummary(result);
      
      expect(typeof summary.overview.totalReturn).toBe('string');
      expect(typeof summary.overview.annualizedReturn).toBe('string');
      expect(typeof summary.overview.maxDrawdown).toBe('string');
    });

    it('should include trade statistics', () => {
      const result = runBacktest(mockStrategy, mockBacktestConfig);
      const summary = getBacktestSummary(result);
      
      expect(summary.performance.totalTrades).toBeDefined();
      expect(summary.overview.winRate).toBeDefined();
      expect(summary.overview.profitFactor).toBeDefined();
    });
  });

  describe('runParameterSweep', () => {
    it('should run parameter sweep with different values', () => {
      const parameterRanges = {
        stopLossRange: [3, 5, 7],
        takeProfitRange: [8, 10, 12],
      };
      
      const results = runParameterSweep(mockStrategy, mockBacktestConfig, parameterRanges);
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      // Should have 3 * 3 = 9 combinations (with default positionSize)
      expect(results.length).toBe(9);
    });

    it('should return BacktestResult array', () => {
      const parameterRanges = {
        stopLossRange: [5],
        takeProfitRange: [10],
      };
      
      const results = runParameterSweep(mockStrategy, mockBacktestConfig, parameterRanges);
      
      expect(results.length).toBe(1);
      expect(results[0].id).toBeDefined();
      expect(results[0].metrics).toBeDefined();
    });

    it('should include backtest metrics for each combination', () => {
      const parameterRanges = {
        stopLossRange: [5, 7],
      };
      
      const results = runParameterSweep(mockStrategy, mockBacktestConfig, parameterRanges);
      
      results.forEach(result => {
        expect(result.metrics).toBeDefined();
        expect(result.metrics.totalReturn).toBeDefined();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum data requirement', () => {
      // Test with sufficient time period
      const result = runBacktest(mockStrategy, mockBacktestConfig);
      
      expect(result).toBeDefined();
      expect(result.metrics).toBeDefined();
      // Trades array should exist even if empty
      expect(Array.isArray(result.trades)).toBe(true);
    });

    it('should handle single result comparison', () => {
      const result = runBacktest(mockStrategy, mockBacktestConfig);
      const comparison = compareBacktestResults([result]);
      
      expect(comparison.comparison.length).toBe(1);
      expect(comparison.bestOverall).toBe(result.id);
    });

    it('should handle zero commission', () => {
      const noCommissionConfig = { ...mockBacktestConfig, commission: 0 };
      const result = runBacktest(mockStrategy, noCommissionConfig);
      
      expect(result).toBeDefined();
      expect(result.config.commission).toBe(0);
    });
  });
});
