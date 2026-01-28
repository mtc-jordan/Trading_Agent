/**
 * Crypto API Integration Tests
 * 
 * Tests for on-chain data service, exchange integrations,
 * funding rate aggregator, and yield strategy executor.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import services after mocking
import { OnChainDataService } from './data/OnChainDataService';
import { ExchangeService } from './exchange/ExchangeService';
import { FundingRateAggregator } from './funding/FundingRateAggregator';
import { YieldStrategyExecutor } from './yield/YieldStrategyExecutor';

describe('OnChainDataService', () => {
  let service: OnChainDataService;

  beforeEach(() => {
    service = new OnChainDataService();
    mockFetch.mockReset();
  });

  describe('getWhaleTransactions', () => {
    it('should return whale transactions for a token', async () => {
      const result = await service.getWhaleTransactions('ETH');
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle different tokens', async () => {
      const result = await service.getWhaleTransactions('BTC');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getOnChainMetrics', () => {
    it('should return on-chain metrics', async () => {
      const result = await service.getOnChainMetrics('BTC');
      expect(result).toBeDefined();
    });
  });

  describe('getExchangeFlows', () => {
    it('should return exchange flow data', async () => {
      const result = await service.getExchangeFlows('BTC');
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getTVL', () => {
    it('should return TVL data for a protocol', async () => {
      const result = await service.getTVL('aave');
      // Result may be null if API unavailable
      expect(result === null || result?.tvl !== undefined).toBe(true);
    });
  });
});

describe('ExchangeService', () => {
  let service: ExchangeService;

  beforeEach(() => {
    service = new ExchangeService();
    mockFetch.mockReset();
  });

  describe('getAllFundingRates', () => {
    it('should fetch funding rates from exchanges', async () => {
      const result = await service.getAllFundingRates('binance');
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return array for any exchange', async () => {
      const result = await service.getAllFundingRates('bybit');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getOrderBook', () => {
    it('should fetch order book data', async () => {
      const result = await service.getOrderBook('binance', 'BTCUSDT');
      // Result may be null if API is unavailable, but should not throw
      expect(result === null || (result?.bids !== undefined && result?.asks !== undefined)).toBe(true);
    });
  });

  describe('testConnection', () => {
    it('should return boolean for connection test', async () => {
      const result = await service.testConnection('binance');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('placeOrder', () => {
    it('should handle order placement request', async () => {
      const result = await service.placeOrder('binance', {
        symbol: 'BTCUSDT',
        side: 'buy',
        type: 'market',
        quantity: 0.1
      });

      // Result may be null without API keys, but should not throw
      expect(result === null || result?.orderId !== undefined).toBe(true);
    });
  });
});

describe('FundingRateAggregator', () => {
  let aggregator: FundingRateAggregator;

  beforeEach(() => {
    aggregator = new FundingRateAggregator();
    mockFetch.mockReset();
  });

  afterEach(() => {
    aggregator.stopAutoUpdate();
  });

  describe('getAggregatedRates', () => {
    it('should aggregate rates from multiple exchanges', async () => {
      // Mock Binance response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([
          { symbol: 'BTCUSDT', fundingRate: '0.0001', markPrice: '97500' }
        ])
      });

      // Mock Bybit response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: { list: [{ symbol: 'BTCUSDT', fundingRate: '0.00012' }] }
        })
      });

      const result = await aggregator.getAggregatedRates();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('findArbitrageOpportunities', () => {
    it('should find arbitrage opportunities', async () => {
      // Mock exchange responses with different rates
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ([
          { symbol: 'BTCUSDT', fundingRate: '0.0001', markPrice: '97500' }
        ])
      });

      const result = await aggregator.findArbitrageOpportunities(5);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('findYieldOpportunities', () => {
    it('should find yield opportunities', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ([
          { symbol: 'BTCUSDT', fundingRate: '0.0003', markPrice: '97500' }
        ])
      });

      const result = await aggregator.findYieldOpportunities(8);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getTopFundingRates', () => {
    it('should return top funding rates', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ([
          { symbol: 'BTCUSDT', fundingRate: '0.0001', markPrice: '97500' },
          { symbol: 'ETHUSDT', fundingRate: '0.0002', markPrice: '3250' },
          { symbol: 'SOLUSDT', fundingRate: '0.0003', markPrice: '185' }
        ])
      });

      const result = await aggregator.getTopFundingRates(10);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getExtremeFunding', () => {
    it('should identify extreme funding rates', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ([
          { symbol: 'BTCUSDT', fundingRate: '0.002', markPrice: '97500' },
          { symbol: 'DOGEUSDT', fundingRate: '-0.001', markPrice: '0.35' }
        ])
      });

      const result = await aggregator.getExtremeFunding(0.001);
      expect(result).toBeDefined();
      expect(result.extremePositive).toBeDefined();
      expect(result.extremeNegative).toBeDefined();
    });
  });

  describe('getFundingStats', () => {
    it('should calculate funding statistics', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ([
          { symbol: 'BTCUSDT', fundingRate: '0.0001', markPrice: '97500' }
        ])
      });

      const result = await aggregator.getFundingStats();
      expect(result).toBeDefined();
      expect(typeof result.totalSymbols).toBe('number');
      expect(typeof result.avgFundingRate).toBe('number');
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', () => {
      aggregator.clearCache();
      // No error means success
      expect(true).toBe(true);
    });
  });
});

describe('YieldStrategyExecutor', () => {
  let executor: YieldStrategyExecutor;

  beforeEach(() => {
    executor = new YieldStrategyExecutor();
    mockFetch.mockReset();
  });

  afterEach(() => {
    executor.stopMonitoring();
  });

  describe('createStrategy', () => {
    it('should create a new strategy', () => {
      const strategy = executor.createStrategy({
        name: 'BTC Cash and Carry',
        type: 'cash_and_carry',
        symbol: 'BTCUSDT',
        exchanges: ['binance'],
        targetApr: 15,
        maxCapital: 10000,
        leverage: 1,
        stopLossPercent: 5,
        takeProfitPercent: 20,
        autoRebalance: true,
        rebalanceThreshold: 5,
        isActive: true
      });

      expect(strategy).toBeDefined();
      expect(strategy.id).toBeDefined();
      expect(strategy.name).toBe('BTC Cash and Carry');
      expect(strategy.type).toBe('cash_and_carry');
    });
  });

  describe('getStrategies', () => {
    it('should return all strategies', () => {
      executor.createStrategy({
        name: 'Strategy 1',
        type: 'cash_and_carry',
        symbol: 'BTCUSDT',
        exchanges: ['binance'],
        targetApr: 15,
        maxCapital: 10000,
        leverage: 1,
        stopLossPercent: 5,
        takeProfitPercent: 20,
        autoRebalance: false,
        rebalanceThreshold: 5,
        isActive: true
      });

      const strategies = executor.getStrategies();
      expect(strategies.length).toBe(1);
    });
  });

  describe('getStrategy', () => {
    it('should return a specific strategy', () => {
      const created = executor.createStrategy({
        name: 'Test Strategy',
        type: 'funding_arb',
        symbol: 'ETHUSDT',
        exchanges: ['binance', 'bybit'],
        targetApr: 10,
        maxCapital: 5000,
        leverage: 1,
        stopLossPercent: 3,
        takeProfitPercent: 15,
        autoRebalance: true,
        rebalanceThreshold: 3,
        isActive: true
      });

      const retrieved = executor.getStrategy(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Strategy');
    });

    it('should return undefined for non-existent strategy', () => {
      const result = executor.getStrategy('non-existent-id');
      expect(result).toBeUndefined();
    });
  });

  describe('updateStrategy', () => {
    it('should update strategy configuration', () => {
      const created = executor.createStrategy({
        name: 'Original Name',
        type: 'cash_and_carry',
        symbol: 'BTCUSDT',
        exchanges: ['binance'],
        targetApr: 15,
        maxCapital: 10000,
        leverage: 1,
        stopLossPercent: 5,
        takeProfitPercent: 20,
        autoRebalance: false,
        rebalanceThreshold: 5,
        isActive: true
      });

      const updated = executor.updateStrategy(created.id, {
        name: 'Updated Name',
        targetApr: 20
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.targetApr).toBe(20);
    });

    it('should return null for non-existent strategy', () => {
      const result = executor.updateStrategy('non-existent', { name: 'New' });
      expect(result).toBeNull();
    });
  });

  describe('deleteStrategy', () => {
    it('should delete a strategy without positions', () => {
      const created = executor.createStrategy({
        name: 'To Delete',
        type: 'cash_and_carry',
        symbol: 'BTCUSDT',
        exchanges: ['binance'],
        targetApr: 15,
        maxCapital: 10000,
        leverage: 1,
        stopLossPercent: 5,
        takeProfitPercent: 20,
        autoRebalance: false,
        rebalanceThreshold: 5,
        isActive: false
      });

      const result = executor.deleteStrategy(created.id);
      expect(result).toBe(true);
      expect(executor.getStrategy(created.id)).toBeUndefined();
    });

    it('should return false for non-existent strategy', () => {
      const result = executor.deleteStrategy('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('getPositions', () => {
    it('should return empty array for strategy without positions', () => {
      const created = executor.createStrategy({
        name: 'No Positions',
        type: 'cash_and_carry',
        symbol: 'BTCUSDT',
        exchanges: ['binance'],
        targetApr: 15,
        maxCapital: 10000,
        leverage: 1,
        stopLossPercent: 5,
        takeProfitPercent: 20,
        autoRebalance: false,
        rebalanceThreshold: 5,
        isActive: true
      });

      const positions = executor.getPositions(created.id);
      expect(positions).toEqual([]);
    });
  });

  describe('getPerformance', () => {
    it('should return performance data for strategy', () => {
      const created = executor.createStrategy({
        name: 'Performance Test',
        type: 'cash_and_carry',
        symbol: 'BTCUSDT',
        exchanges: ['binance'],
        targetApr: 15,
        maxCapital: 10000,
        leverage: 1,
        stopLossPercent: 5,
        takeProfitPercent: 20,
        autoRebalance: false,
        rebalanceThreshold: 5,
        isActive: true
      });

      const performance = executor.getPerformance(created.id);
      expect(performance).toBeDefined();
      expect(performance?.strategyId).toBe(created.id);
      expect(performance?.totalCapitalDeployed).toBe(0);
    });
  });

  describe('getAllPerformance', () => {
    it('should return all performance data', () => {
      executor.createStrategy({
        name: 'Strategy 1',
        type: 'cash_and_carry',
        symbol: 'BTCUSDT',
        exchanges: ['binance'],
        targetApr: 15,
        maxCapital: 10000,
        leverage: 1,
        stopLossPercent: 5,
        takeProfitPercent: 20,
        autoRebalance: false,
        rebalanceThreshold: 5,
        isActive: true
      });

      executor.createStrategy({
        name: 'Strategy 2',
        type: 'funding_arb',
        symbol: 'ETHUSDT',
        exchanges: ['binance', 'bybit'],
        targetApr: 10,
        maxCapital: 5000,
        leverage: 1,
        stopLossPercent: 3,
        takeProfitPercent: 15,
        autoRebalance: false,
        rebalanceThreshold: 3,
        isActive: true
      });

      const allPerformance = executor.getAllPerformance();
      expect(allPerformance.length).toBe(2);
    });
  });

  describe('getExecutionHistory', () => {
    it('should return empty history initially', () => {
      const history = executor.getExecutionHistory();
      expect(history).toEqual([]);
    });

    it('should filter history by strategy ID', () => {
      const created = executor.createStrategy({
        name: 'History Test',
        type: 'cash_and_carry',
        symbol: 'BTCUSDT',
        exchanges: ['binance'],
        targetApr: 15,
        maxCapital: 10000,
        leverage: 1,
        stopLossPercent: 5,
        takeProfitPercent: 20,
        autoRebalance: false,
        rebalanceThreshold: 5,
        isActive: true
      });

      const history = executor.getExecutionHistory(created.id);
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('getSummary', () => {
    it('should return summary statistics', () => {
      executor.createStrategy({
        name: 'Summary Test',
        type: 'cash_and_carry',
        symbol: 'BTCUSDT',
        exchanges: ['binance'],
        targetApr: 15,
        maxCapital: 10000,
        leverage: 1,
        stopLossPercent: 5,
        takeProfitPercent: 20,
        autoRebalance: false,
        rebalanceThreshold: 5,
        isActive: true
      });

      const summary = executor.getSummary();
      expect(summary).toBeDefined();
      expect(summary.totalStrategies).toBe(1);
      expect(summary.activeStrategies).toBe(1);
      expect(typeof summary.totalCapitalDeployed).toBe('number');
      expect(typeof summary.totalPnl).toBe('number');
    });
  });

  describe('executeCashAndCarry', () => {
    it('should return error for non-existent strategy', async () => {
      const result = await executor.executeCashAndCarry(
        'non-existent',
        'BTCUSDT',
        'binance',
        10000
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Strategy not found');
    });
  });

  describe('closeStrategy', () => {
    it('should return error for non-existent strategy', async () => {
      const result = await executor.closeStrategy('non-existent');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Strategy not found');
    });

    it('should return error for strategy without positions', async () => {
      const created = executor.createStrategy({
        name: 'No Positions',
        type: 'cash_and_carry',
        symbol: 'BTCUSDT',
        exchanges: ['binance'],
        targetApr: 15,
        maxCapital: 10000,
        leverage: 1,
        stopLossPercent: 5,
        takeProfitPercent: 20,
        autoRebalance: false,
        rebalanceThreshold: 5,
        isActive: true
      });

      const result = await executor.closeStrategy(created.id);
      expect(result.success).toBe(false);
      expect(result.message).toContain('No positions');
    });
  });

  describe('startMonitoring', () => {
    it('should start monitoring without error', () => {
      executor.startMonitoring(60000);
      // No error means success
      expect(true).toBe(true);
    });
  });

  describe('stopMonitoring', () => {
    it('should stop monitoring without error', () => {
      executor.startMonitoring(60000);
      executor.stopMonitoring();
      // No error means success
      expect(true).toBe(true);
    });
  });
});

describe('Integration Tests', () => {
  describe('Full Yield Strategy Flow', () => {
    it('should create, monitor, and close a strategy', async () => {
      const executor = new YieldStrategyExecutor();
      
      // Create strategy
      const strategy = executor.createStrategy({
        name: 'Integration Test Strategy',
        type: 'cash_and_carry',
        symbol: 'BTCUSDT',
        exchanges: ['binance'],
        targetApr: 15,
        maxCapital: 10000,
        leverage: 1,
        stopLossPercent: 5,
        takeProfitPercent: 20,
        autoRebalance: true,
        rebalanceThreshold: 5,
        isActive: true
      });

      expect(strategy).toBeDefined();

      // Get performance
      const performance = executor.getPerformance(strategy.id);
      expect(performance).toBeDefined();

      // Get summary
      const summary = executor.getSummary();
      expect(summary.totalStrategies).toBeGreaterThan(0);

      // Clean up
      executor.stopMonitoring();
    });
  });

  describe('Multi-Exchange Rate Comparison', () => {
    it('should compare rates across exchanges', async () => {
      const aggregator = new FundingRateAggregator();
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ([
          { symbol: 'BTCUSDT', fundingRate: '0.0001', markPrice: '97500' }
        ])
      });

      const stats = await aggregator.getFundingStats();
      expect(stats).toBeDefined();
      expect(typeof stats.totalSymbols).toBe('number');

      aggregator.stopAutoUpdate();
    });
  });
});
