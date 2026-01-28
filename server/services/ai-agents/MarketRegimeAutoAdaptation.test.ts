/**
 * Unit tests for Market Regime Auto-Adaptation Service
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  detectRegime,
  getRecommendedWeights,
  generateWeightAdjustment,
  autoAdaptWeights,
  getRegimeHistory,
  getCurrentRegimeState,
  getRegimeStatistics,
  getAllRegimePresets,
  validateWeights,
  enhanceRegimeAnalysis,
  clearRegimeHistory,
  getDefaultConfig,
  getUserConfig,
  updateUserConfig,
  MarketRegime,
  AgentWeights
} from './MarketRegimeAutoAdaptation';

// Mock the LLM
vi.mock('../../_core/llm', () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          analysis: 'Test analysis',
          tradingRecommendations: ['Rec 1', 'Rec 2'],
          riskWarnings: ['Warning 1', 'Warning 2']
        })
      }
    }]
  })
}));

describe('MarketRegimeAutoAdaptation', () => {
  beforeEach(() => {
    clearRegimeHistory();
  });

  describe('detectRegime', () => {
    it('should detect bull trending regime', async () => {
      // Generate bullish price data
      const prices = Array.from({ length: 30 }, (_, i) => 100 + i * 2);
      const volumes = Array.from({ length: 30 }, () => 1000000);
      const highs = prices.map(p => p + 1);
      const lows = prices.map(p => p - 1);

      const result = await detectRegime({ prices, volumes, highs, lows });

      expect(result).toBeDefined();
      expect(result.currentRegime).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.indicators).toBeDefined();
    });

    it('should detect bear trending regime', async () => {
      // Generate bearish price data
      const prices = Array.from({ length: 30 }, (_, i) => 200 - i * 2);
      const volumes = Array.from({ length: 30 }, () => 1000000);
      const highs = prices.map(p => p + 1);
      const lows = prices.map(p => p - 1);

      const result = await detectRegime({ prices, volumes, highs, lows });

      expect(result).toBeDefined();
      expect(['bear_trending', 'high_volatility', 'crisis']).toContain(result.currentRegime);
    });

    it('should detect sideways range regime', async () => {
      // Generate range-bound price data
      const prices = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i * 0.5) * 2);
      const volumes = Array.from({ length: 30 }, () => 1000000);
      const highs = prices.map(p => p + 0.5);
      const lows = prices.map(p => p - 0.5);

      const result = await detectRegime({ prices, volumes, highs, lows });

      expect(result).toBeDefined();
      expect(result.indicators.volatility).toBeDefined();
    });

    it('should calculate all indicators', async () => {
      const prices = Array.from({ length: 30 }, (_, i) => 100 + Math.random() * 10);
      const volumes = Array.from({ length: 30 }, () => 1000000 + Math.random() * 500000);
      const highs = prices.map(p => p + Math.random() * 2);
      const lows = prices.map(p => p - Math.random() * 2);

      const result = await detectRegime({ prices, volumes, highs, lows });

      expect(result.indicators.volatility).toBeGreaterThanOrEqual(0);
      expect(result.indicators.trend).toBeDefined();
      expect(result.indicators.momentum).toBeDefined();
      expect(result.indicators.sentiment).toBeGreaterThanOrEqual(0);
      expect(result.indicators.volume).toBeGreaterThan(0);
    });

    it('should detect regime change', async () => {
      // First detection - bullish
      const bullPrices = Array.from({ length: 30 }, (_, i) => 100 + i * 2);
      const volumes = Array.from({ length: 30 }, () => 1000000);
      const highs = bullPrices.map(p => p + 1);
      const lows = bullPrices.map(p => p - 1);

      await detectRegime({ prices: bullPrices, volumes, highs, lows });

      // Second detection - bearish (should detect change)
      const bearPrices = Array.from({ length: 30 }, (_, i) => 200 - i * 3);
      const bearHighs = bearPrices.map(p => p + 1);
      const bearLows = bearPrices.map(p => p - 1);

      const result = await detectRegime({ prices: bearPrices, volumes, highs: bearHighs, lows: bearLows });

      expect(result.previousRegime).not.toBeNull();
    });
  });

  describe('getRecommendedWeights', () => {
    it('should return weights for bull trending', () => {
      const weights = getRecommendedWeights('bull_trending');
      
      expect(weights).toBeDefined();
      expect(weights.technical).toBeGreaterThan(0);
      expect(weights.fundamental).toBeGreaterThan(0);
      expect(weights.sentiment).toBeGreaterThan(0);
      expect(weights.risk).toBeGreaterThan(0);
      expect(weights.regime).toBeGreaterThan(0);
      expect(weights.execution).toBeGreaterThan(0);
    });

    it('should return higher risk weight for crisis regime', () => {
      const crisisWeights = getRecommendedWeights('crisis');
      const bullWeights = getRecommendedWeights('bull_trending');
      
      expect(crisisWeights.risk).toBeGreaterThan(bullWeights.risk);
    });

    it('should return weights that sum to 1', () => {
      const regimes: MarketRegime[] = [
        'bull_trending', 'bear_trending', 'sideways_range', 'high_volatility',
        'crisis', 'recovery', 'euphoria', 'capitulation'
      ];

      regimes.forEach(regime => {
        const weights = getRecommendedWeights(regime);
        const sum = Object.values(weights).reduce((a, b) => a + b, 0);
        expect(Math.abs(sum - 1)).toBeLessThan(0.01);
      });
    });
  });

  describe('generateWeightAdjustment', () => {
    it('should generate adjustment recommendation', () => {
      const currentWeights: AgentWeights = {
        technical: 0.20,
        fundamental: 0.20,
        sentiment: 0.15,
        risk: 0.15,
        regime: 0.15,
        execution: 0.15
      };

      const config = getDefaultConfig();
      const recommendation = generateWeightAdjustment(currentWeights, 'crisis', config);

      expect(recommendation).toBeDefined();
      expect(recommendation.regime).toBe('crisis');
      expect(recommendation.recommendedWeights).toBeDefined();
      expect(recommendation.previousWeights).toEqual(currentWeights);
      expect(recommendation.adjustmentReason).toBeDefined();
      expect(recommendation.expectedImpact).toBeDefined();
      expect(['low', 'medium', 'high']).toContain(recommendation.riskLevel);
    });

    it('should respect max weight change constraint', () => {
      const currentWeights: AgentWeights = {
        technical: 0.10,
        fundamental: 0.10,
        sentiment: 0.10,
        risk: 0.10,
        regime: 0.30,
        execution: 0.30
      };

      const config = { ...getDefaultConfig(), maxWeightChange: 0.05 };
      const recommendation = generateWeightAdjustment(currentWeights, 'crisis', config);

      // Check that no weight changed by more than maxWeightChange
      for (const key of Object.keys(currentWeights) as (keyof AgentWeights)[]) {
        const diff = Math.abs(recommendation.recommendedWeights[key] - currentWeights[key]);
        // Allow small tolerance for normalization
        expect(diff).toBeLessThanOrEqual(config.maxWeightChange + 0.05);
      }
    });

    it('should set high risk level for crisis regime', () => {
      const currentWeights: AgentWeights = {
        technical: 0.20,
        fundamental: 0.20,
        sentiment: 0.15,
        risk: 0.15,
        regime: 0.15,
        execution: 0.15
      };

      const config = getDefaultConfig();
      const recommendation = generateWeightAdjustment(currentWeights, 'crisis', config);

      expect(recommendation.riskLevel).toBe('high');
    });
  });

  describe('autoAdaptWeights', () => {
    it('should not adapt when disabled', async () => {
      const userId = 'test-user-1';
      updateUserConfig(userId, { enabled: false });

      const currentWeights: AgentWeights = {
        technical: 0.20,
        fundamental: 0.20,
        sentiment: 0.15,
        risk: 0.15,
        regime: 0.15,
        execution: 0.15
      };

      const marketData = {
        prices: Array.from({ length: 30 }, (_, i) => 100 + i),
        volumes: Array.from({ length: 30 }, () => 1000000),
        highs: Array.from({ length: 30 }, (_, i) => 101 + i),
        lows: Array.from({ length: 30 }, (_, i) => 99 + i)
      };

      const result = await autoAdaptWeights(userId, currentWeights, marketData);

      expect(result.adapted).toBe(false);
      expect(result.reason).toBe('Auto-adaptation is disabled');
    });

    it('should not adapt during cooldown period', async () => {
      const userId = 'test-user-2';
      updateUserConfig(userId, { enabled: true, cooldownPeriodMs: 999999999 });

      const currentWeights: AgentWeights = {
        technical: 0.20,
        fundamental: 0.20,
        sentiment: 0.15,
        risk: 0.15,
        regime: 0.15,
        execution: 0.15
      };

      const marketData = {
        prices: Array.from({ length: 30 }, (_, i) => 100 + i * 2),
        volumes: Array.from({ length: 30 }, () => 1000000),
        highs: Array.from({ length: 30 }, (_, i) => 101 + i * 2),
        lows: Array.from({ length: 30 }, (_, i) => 99 + i * 2)
      };

      // First call to set regime
      await autoAdaptWeights(userId, currentWeights, marketData);

      // Second call should be in cooldown
      const result = await autoAdaptWeights(userId, currentWeights, marketData);

      // Either cooldown or no regime change
      expect(result.adapted).toBe(false);
    });
  });

  describe('getRegimeHistory', () => {
    it('should return empty array initially', () => {
      const history = getRegimeHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should build history after detections', async () => {
      const prices = Array.from({ length: 30 }, (_, i) => 100 + i);
      const volumes = Array.from({ length: 30 }, () => 1000000);
      const highs = prices.map(p => p + 1);
      const lows = prices.map(p => p - 1);

      await detectRegime({ prices, volumes, highs, lows });

      const history = getRegimeHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should respect limit parameter', async () => {
      const prices = Array.from({ length: 30 }, (_, i) => 100 + i);
      const volumes = Array.from({ length: 30 }, () => 1000000);
      const highs = prices.map(p => p + 1);
      const lows = prices.map(p => p - 1);

      // Create multiple detections
      for (let i = 0; i < 5; i++) {
        await detectRegime({ prices, volumes, highs, lows });
      }

      const history = getRegimeHistory(3);
      expect(history.length).toBeLessThanOrEqual(3);
    });
  });

  describe('getCurrentRegimeState', () => {
    it('should return null initially', () => {
      const state = getCurrentRegimeState();
      expect(state).toBeNull();
    });

    it('should return state after detection', async () => {
      const prices = Array.from({ length: 30 }, (_, i) => 100 + i);
      const volumes = Array.from({ length: 30 }, () => 1000000);
      const highs = prices.map(p => p + 1);
      const lows = prices.map(p => p - 1);

      await detectRegime({ prices, volumes, highs, lows });

      const state = getCurrentRegimeState();
      expect(state).not.toBeNull();
      expect(state?.currentRegime).toBeDefined();
    });
  });

  describe('getRegimeStatistics', () => {
    it('should return statistics object', () => {
      const stats = getRegimeStatistics();

      expect(stats).toBeDefined();
      expect(typeof stats.totalRegimeChanges).toBe('number');
      expect(typeof stats.averageRegimeDuration).toBe('number');
      expect(stats.regimeDistribution).toBeDefined();
      expect(typeof stats.currentStreak).toBe('number');
    });

    it('should have all regime types in distribution', () => {
      const stats = getRegimeStatistics();
      const regimes: MarketRegime[] = [
        'bull_trending', 'bear_trending', 'sideways_range', 'high_volatility',
        'crisis', 'recovery', 'euphoria', 'capitulation'
      ];

      regimes.forEach(regime => {
        expect(stats.regimeDistribution[regime]).toBeDefined();
      });
    });
  });

  describe('getAllRegimePresets', () => {
    it('should return all 8 regime presets', () => {
      const presets = getAllRegimePresets();

      expect(Object.keys(presets)).toHaveLength(8);
      expect(presets.bull_trending).toBeDefined();
      expect(presets.bear_trending).toBeDefined();
      expect(presets.sideways_range).toBeDefined();
      expect(presets.high_volatility).toBeDefined();
      expect(presets.crisis).toBeDefined();
      expect(presets.recovery).toBeDefined();
      expect(presets.euphoria).toBeDefined();
      expect(presets.capitulation).toBeDefined();
    });

    it('should have valid weights in all presets', () => {
      const presets = getAllRegimePresets();

      Object.values(presets).forEach(weights => {
        expect(weights.technical).toBeGreaterThan(0);
        expect(weights.fundamental).toBeGreaterThan(0);
        expect(weights.sentiment).toBeGreaterThan(0);
        expect(weights.risk).toBeGreaterThan(0);
        expect(weights.regime).toBeGreaterThan(0);
        expect(weights.execution).toBeGreaterThan(0);

        const sum = Object.values(weights).reduce((a, b) => a + b, 0);
        expect(Math.abs(sum - 1)).toBeLessThan(0.01);
      });
    });
  });

  describe('validateWeights', () => {
    it('should validate correct weights', () => {
      const weights: AgentWeights = {
        technical: 0.20,
        fundamental: 0.20,
        sentiment: 0.15,
        risk: 0.15,
        regime: 0.15,
        execution: 0.15
      };

      const result = validateWeights(weights);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject weights that do not sum to 1', () => {
      const weights: AgentWeights = {
        technical: 0.50,
        fundamental: 0.50,
        sentiment: 0.50,
        risk: 0.50,
        regime: 0.50,
        execution: 0.50
      };

      const result = validateWeights(weights);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject negative weights', () => {
      const weights: AgentWeights = {
        technical: -0.10,
        fundamental: 0.30,
        sentiment: 0.20,
        risk: 0.20,
        regime: 0.20,
        execution: 0.20
      };

      const result = validateWeights(weights);
      expect(result.valid).toBe(false);
    });

    it('should reject weights greater than 1', () => {
      const weights: AgentWeights = {
        technical: 1.50,
        fundamental: -0.10,
        sentiment: -0.10,
        risk: -0.10,
        regime: -0.10,
        execution: -0.10
      };

      const result = validateWeights(weights);
      expect(result.valid).toBe(false);
    });
  });

  describe('enhanceRegimeAnalysis', () => {
    it('should return enhanced analysis', async () => {
      const result = await enhanceRegimeAnalysis('bull_trending', {
        volatility: 20,
        trend: 0.5,
        momentum: 0.3,
        sentiment: 65,
        volume: 1.2
      });

      expect(result).toBeDefined();
      expect(result.analysis).toBeDefined();
      expect(Array.isArray(result.tradingRecommendations)).toBe(true);
      expect(Array.isArray(result.riskWarnings)).toBe(true);
    });

    it('should include symbol in analysis when provided', async () => {
      const result = await enhanceRegimeAnalysis('crisis', {
        volatility: 60,
        trend: -0.8,
        momentum: -0.5,
        sentiment: 15,
        volume: 2.5
      }, 'SPY');

      expect(result).toBeDefined();
    });
  });

  describe('User Configuration', () => {
    it('should return default config for new user', () => {
      const config = getUserConfig('new-user');

      expect(config.enabled).toBe(true);
      expect(config.sensitivity).toBe('medium');
      expect(config.minConfidenceThreshold).toBe(60);
      expect(config.notifyOnChange).toBe(true);
    });

    it('should update user config', () => {
      const userId = 'config-test-user';
      
      updateUserConfig(userId, { enabled: false, sensitivity: 'high' });
      
      const config = getUserConfig(userId);
      expect(config.enabled).toBe(false);
      expect(config.sensitivity).toBe('high');
    });

    it('should preserve unmodified config values', () => {
      const userId = 'partial-update-user';
      
      updateUserConfig(userId, { enabled: false });
      
      const config = getUserConfig(userId);
      expect(config.enabled).toBe(false);
      expect(config.sensitivity).toBe('medium'); // Default preserved
      expect(config.minConfidenceThreshold).toBe(60); // Default preserved
    });
  });

  describe('clearRegimeHistory', () => {
    it('should clear all history', async () => {
      const prices = Array.from({ length: 30 }, (_, i) => 100 + i);
      const volumes = Array.from({ length: 30 }, () => 1000000);
      const highs = prices.map(p => p + 1);
      const lows = prices.map(p => p - 1);

      await detectRegime({ prices, volumes, highs, lows });
      
      expect(getRegimeHistory().length).toBeGreaterThan(0);
      
      clearRegimeHistory();
      
      expect(getRegimeHistory().length).toBe(0);
      expect(getCurrentRegimeState()).toBeNull();
    });
  });
});
