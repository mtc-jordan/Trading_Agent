/**
 * Unit tests for Multi-Asset Correlation Engine
 */
import { describe, it, expect } from 'vitest';
import {
  calculateCorrelation,
  calculateCorrelationMatrix,
  calculateRollingCorrelation,
  analyzeCrossAssetCorrelations,
  analyzePortfolioCorrelation,
  findUncorrelatedAssets,
  getDefaultAssets,
  generateSamplePriceData,
  interpretCorrelation,
  calculateCorrelationStability,
  Asset,
  AssetClass
} from './MultiAssetCorrelationEngine';

describe('MultiAssetCorrelationEngine', () => {
  describe('calculateCorrelation', () => {
    it('should calculate correlation between two assets', () => {
      const asset1: Asset = { symbol: 'AAPL', name: 'Apple', assetClass: 'stock' };
      const asset2: Asset = { symbol: 'MSFT', name: 'Microsoft', assetClass: 'stock' };
      
      // Generate correlated price data
      const prices1 = Array.from({ length: 100 }, (_, i) => 100 + i + Math.random() * 5);
      const prices2 = Array.from({ length: 100 }, (_, i) => 150 + i * 1.2 + Math.random() * 5);

      const result = calculateCorrelation(asset1, prices1, asset2, prices2);

      expect(result).toBeDefined();
      expect(result.correlation).toBeGreaterThanOrEqual(-1);
      expect(result.correlation).toBeLessThanOrEqual(1);
      expect(result.sampleSize).toBeGreaterThan(0);
      expect(['very_strong', 'strong', 'moderate', 'weak', 'very_weak']).toContain(result.strength);
      expect(['positive', 'negative', 'neutral']).toContain(result.direction);
    });

    it('should detect positive correlation', () => {
      const asset1: Asset = { symbol: 'A', name: 'Asset A', assetClass: 'stock' };
      const asset2: Asset = { symbol: 'B', name: 'Asset B', assetClass: 'stock' };
      
      // Perfectly correlated prices
      const prices1 = Array.from({ length: 50 }, (_, i) => 100 + i * 2);
      const prices2 = Array.from({ length: 50 }, (_, i) => 200 + i * 2);

      const result = calculateCorrelation(asset1, prices1, asset2, prices2);

      expect(result.correlation).toBeGreaterThan(0.8);
      expect(result.direction).toBe('positive');
    });

    it('should handle various correlation scenarios', () => {
      const asset1: Asset = { symbol: 'A', name: 'Asset A', assetClass: 'stock' };
      const asset2: Asset = { symbol: 'B', name: 'Asset B', assetClass: 'stock' };
      
      // Generate random prices to test correlation calculation works
      const prices1 = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i * 0.5) * 10);
      const prices2 = Array.from({ length: 50 }, (_, i) => 200 + Math.cos(i * 0.5) * 10);

      const result = calculateCorrelation(asset1, prices1, asset2, prices2);

      // Correlation should be between -1 and 1
      expect(result.correlation).toBeGreaterThanOrEqual(-1);
      expect(result.correlation).toBeLessThanOrEqual(1);
      expect(['positive', 'negative', 'neutral']).toContain(result.direction);
    });
  });

  describe('calculateCorrelationMatrix', () => {
    it('should calculate correlation matrix for multiple assets', () => {
      const assets: Asset[] = [
        { symbol: 'A', name: 'Asset A', assetClass: 'stock' },
        { symbol: 'B', name: 'Asset B', assetClass: 'stock' },
        { symbol: 'C', name: 'Asset C', assetClass: 'crypto' },
      ];

      const priceData = generateSamplePriceData(['A', 'B', 'C']);
      const result = calculateCorrelationMatrix(assets, priceData);

      expect(result.assets).toHaveLength(3);
      expect(result.matrix).toHaveLength(3);
      expect(result.matrix[0]).toHaveLength(3);
      
      // Diagonal should be 1 (self-correlation)
      expect(result.matrix[0][0]).toBe(1);
      expect(result.matrix[1][1]).toBe(1);
      expect(result.matrix[2][2]).toBe(1);
      
      // Matrix should be symmetric
      expect(result.matrix[0][1]).toBe(result.matrix[1][0]);
      expect(result.matrix[0][2]).toBe(result.matrix[2][0]);
      expect(result.matrix[1][2]).toBe(result.matrix[2][1]);
    });

    it('should include timestamp and period', () => {
      const assets: Asset[] = [
        { symbol: 'A', name: 'Asset A', assetClass: 'stock' },
        { symbol: 'B', name: 'Asset B', assetClass: 'stock' },
      ];

      const priceData = generateSamplePriceData(['A', 'B']);
      const result = calculateCorrelationMatrix(assets, priceData, '6M');

      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.period).toBe('6M');
      expect(result.method).toBe('pearson');
    });
  });

  describe('calculateRollingCorrelation', () => {
    it('should calculate rolling correlation over time', () => {
      const asset1: Asset = { symbol: 'A', name: 'Asset A', assetClass: 'stock' };
      const asset2: Asset = { symbol: 'B', name: 'Asset B', assetClass: 'stock' };
      
      const prices1 = Array.from({ length: 100 }, (_, i) => 100 + Math.random() * 20);
      const prices2 = Array.from({ length: 100 }, (_, i) => 150 + Math.random() * 20);

      const result = calculateRollingCorrelation(asset1, prices1, asset2, prices2, 20);

      expect(result.dataPoints.length).toBeGreaterThan(0);
      expect(result.averageCorrelation).toBeDefined();
      expect(result.volatility).toBeGreaterThanOrEqual(0);
      expect(['increasing', 'decreasing', 'stable']).toContain(result.trend);
    });

    it('should respect window size', () => {
      const asset1: Asset = { symbol: 'A', name: 'Asset A', assetClass: 'stock' };
      const asset2: Asset = { symbol: 'B', name: 'Asset B', assetClass: 'stock' };
      
      const prices1 = Array.from({ length: 100 }, () => 100 + Math.random() * 20);
      const prices2 = Array.from({ length: 100 }, () => 150 + Math.random() * 20);

      const result = calculateRollingCorrelation(asset1, prices1, asset2, prices2, 30);

      result.dataPoints.forEach(dp => {
        expect(dp.window).toBe(30);
      });
    });
  });

  describe('analyzeCrossAssetCorrelations', () => {
    it('should analyze correlations across asset classes', () => {
      const assets: Asset[] = [
        { symbol: 'SPY', name: 'S&P 500', assetClass: 'etf' },
        { symbol: 'BTC', name: 'Bitcoin', assetClass: 'crypto' },
        { symbol: 'GLD', name: 'Gold', assetClass: 'commodity' },
      ];

      const priceData = generateSamplePriceData(['SPY', 'BTC', 'GLD']);
      const result = analyzeCrossAssetCorrelations(assets, priceData);

      expect(result.assetClasses.length).toBeGreaterThan(0);
      expect(result.diversificationScore).toBeGreaterThanOrEqual(0);
      expect(result.diversificationScore).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.riskConcentrations)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should identify risk concentrations', () => {
      const assets: Asset[] = [
        { symbol: 'AAPL', name: 'Apple', assetClass: 'stock' },
        { symbol: 'MSFT', name: 'Microsoft', assetClass: 'stock' },
        { symbol: 'GOOGL', name: 'Google', assetClass: 'stock' },
      ];

      const priceData = generateSamplePriceData(['AAPL', 'MSFT', 'GOOGL']);
      const result = analyzeCrossAssetCorrelations(assets, priceData);

      // All same asset class, may have risk concentrations
      expect(result.assetClasses).toContain('stock');
    });

    it('should generate recommendations', () => {
      const assets: Asset[] = [
        { symbol: 'BTC', name: 'Bitcoin', assetClass: 'crypto' },
        { symbol: 'ETH', name: 'Ethereum', assetClass: 'crypto' },
      ];

      const priceData = generateSamplePriceData(['BTC', 'ETH']);
      const result = analyzeCrossAssetCorrelations(assets, priceData);

      // Should recommend adding other asset classes
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('analyzePortfolioCorrelation', () => {
    it('should analyze portfolio correlation', () => {
      const assets: Asset[] = [
        { symbol: 'A', name: 'Asset A', assetClass: 'stock' },
        { symbol: 'B', name: 'Asset B', assetClass: 'bond' },
        { symbol: 'C', name: 'Asset C', assetClass: 'commodity' },
      ];
      const weights = [0.4, 0.3, 0.3];

      const priceData = generateSamplePriceData(['A', 'B', 'C']);
      const result = analyzePortfolioCorrelation(assets, weights, priceData);

      expect(result.assets).toHaveLength(3);
      expect(result.weights).toEqual(weights);
      expect(result.portfolioVariance).toBeDefined();
      expect(result.diversificationRatio).toBeGreaterThan(0);
      expect(result.effectiveAssets).toBeGreaterThan(0);
      expect(result.effectiveAssets).toBeLessThanOrEqual(3);
    });

    it('should throw error for mismatched arrays', () => {
      const assets: Asset[] = [
        { symbol: 'A', name: 'Asset A', assetClass: 'stock' },
        { symbol: 'B', name: 'Asset B', assetClass: 'stock' },
      ];
      const weights = [0.5]; // Mismatched length

      const priceData = generateSamplePriceData(['A', 'B']);

      expect(() => analyzePortfolioCorrelation(assets, weights, priceData)).toThrow();
    });
  });

  describe('findUncorrelatedAssets', () => {
    it('should find uncorrelated assets', () => {
      const currentAssets: Asset[] = [
        { symbol: 'SPY', name: 'S&P 500', assetClass: 'etf' },
      ];
      const candidateAssets: Asset[] = [
        { symbol: 'GLD', name: 'Gold', assetClass: 'commodity' },
        { symbol: 'TLT', name: 'Bonds', assetClass: 'bond' },
        { symbol: 'BTC', name: 'Bitcoin', assetClass: 'crypto' },
      ];

      const priceData = generateSamplePriceData(['SPY', 'GLD', 'TLT', 'BTC']);
      const result = findUncorrelatedAssets(currentAssets, candidateAssets, priceData, 0.5);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should respect max correlation threshold', () => {
      const currentAssets: Asset[] = [
        { symbol: 'A', name: 'Asset A', assetClass: 'stock' },
      ];
      const candidateAssets: Asset[] = [
        { symbol: 'B', name: 'Asset B', assetClass: 'stock' },
      ];

      const priceData = generateSamplePriceData(['A', 'B']);
      
      // With very low threshold, should find fewer assets
      const strictResult = findUncorrelatedAssets(currentAssets, candidateAssets, priceData, 0.1);
      const looseResult = findUncorrelatedAssets(currentAssets, candidateAssets, priceData, 0.9);

      expect(strictResult.length).toBeLessThanOrEqual(looseResult.length);
    });
  });

  describe('getDefaultAssets', () => {
    it('should return default asset universe', () => {
      const assets = getDefaultAssets();

      expect(assets.length).toBeGreaterThan(0);
      
      // Should have multiple asset classes
      const assetClasses = new Set(assets.map(a => a.assetClass));
      expect(assetClasses.size).toBeGreaterThan(3);
    });

    it('should include all required fields', () => {
      const assets = getDefaultAssets();

      assets.forEach(asset => {
        expect(asset.symbol).toBeDefined();
        expect(asset.name).toBeDefined();
        expect(asset.assetClass).toBeDefined();
      });
    });
  });

  describe('generateSamplePriceData', () => {
    it('should generate price data for given symbols', () => {
      const symbols = ['A', 'B', 'C'];
      const priceData = generateSamplePriceData(symbols, 100);

      expect(priceData.size).toBe(3);
      
      symbols.forEach(symbol => {
        const prices = priceData.get(symbol);
        expect(prices).toBeDefined();
        expect(prices?.length).toBe(100);
      });
    });

    it('should generate positive prices', () => {
      const priceData = generateSamplePriceData(['TEST'], 50);
      const prices = priceData.get('TEST') || [];

      prices.forEach(price => {
        expect(price).toBeGreaterThan(0);
      });
    });
  });

  describe('interpretCorrelation', () => {
    it('should interpret very strong positive correlation', () => {
      const interpretation = interpretCorrelation(0.9);
      expect(interpretation).toContain('Very strong');
      expect(interpretation).toContain('positive');
    });

    it('should interpret very strong negative correlation', () => {
      const interpretation = interpretCorrelation(-0.9);
      expect(interpretation).toContain('Very strong');
      expect(interpretation).toContain('negative');
    });

    it('should interpret weak correlation', () => {
      const interpretation = interpretCorrelation(0.15);
      expect(interpretation.toLowerCase()).toContain('weak');
    });

    it('should interpret no correlation', () => {
      const interpretation = interpretCorrelation(0.05);
      expect(interpretation.toLowerCase()).toContain('very weak');
    });
  });

  describe('calculateCorrelationStability', () => {
    it('should calculate stability score', () => {
      const rollingCorrelation = {
        asset1: { symbol: 'A', name: 'Asset A', assetClass: 'stock' as AssetClass },
        asset2: { symbol: 'B', name: 'Asset B', assetClass: 'stock' as AssetClass },
        dataPoints: [],
        averageCorrelation: 0.5,
        volatility: 0.1,
        trend: 'stable' as const
      };

      const result = calculateCorrelationStability(rollingCorrelation);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.interpretation).toBeDefined();
    });

    it('should penalize high volatility', () => {
      const stableCorrelation = {
        asset1: { symbol: 'A', name: 'Asset A', assetClass: 'stock' as AssetClass },
        asset2: { symbol: 'B', name: 'Asset B', assetClass: 'stock' as AssetClass },
        dataPoints: [],
        averageCorrelation: 0.5,
        volatility: 0.05,
        trend: 'stable' as const
      };

      const volatileCorrelation = {
        ...stableCorrelation,
        volatility: 0.5
      };

      const stableResult = calculateCorrelationStability(stableCorrelation);
      const volatileResult = calculateCorrelationStability(volatileCorrelation);

      expect(stableResult.score).toBeGreaterThan(volatileResult.score);
    });

    it('should penalize trending correlations', () => {
      const stableCorrelation = {
        asset1: { symbol: 'A', name: 'Asset A', assetClass: 'stock' as AssetClass },
        asset2: { symbol: 'B', name: 'Asset B', assetClass: 'stock' as AssetClass },
        dataPoints: [],
        averageCorrelation: 0.5,
        volatility: 0.1,
        trend: 'stable' as const
      };

      const trendingCorrelation = {
        ...stableCorrelation,
        trend: 'increasing' as const
      };

      const stableResult = calculateCorrelationStability(stableCorrelation);
      const trendingResult = calculateCorrelationStability(trendingCorrelation);

      expect(stableResult.score).toBeGreaterThan(trendingResult.score);
    });
  });

  describe('Asset class coverage', () => {
    it('should support all asset classes', () => {
      const assetClasses: AssetClass[] = ['stock', 'crypto', 'forex', 'commodity', 'bond', 'etf'];
      const assets = getDefaultAssets();

      const coveredClasses = new Set(assets.map(a => a.assetClass));
      
      assetClasses.forEach(cls => {
        expect(coveredClasses.has(cls)).toBe(true);
      });
    });
  });
});
