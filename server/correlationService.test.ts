import { describe, it, expect, beforeEach } from 'vitest';
import {
  pearsonCorrelation,
  getCorrelationStrength,
  calculateAssetCorrelation,
  calculateCorrelationMatrix,
  updatePriceHistory,
  getPriceHistory,
  clearPriceHistoryCache,
  seedDemoCorrelationData,
  getCorrelationColor,
  generateSimulatedPriceHistory,
  type AssetPriceHistory,
  type TimePeriod,
} from './services/correlationService';

describe('Correlation Service', () => {
  beforeEach(() => {
    clearPriceHistoryCache();
  });

  describe('pearsonCorrelation', () => {
    it('should return 1 for perfectly correlated arrays', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10];
      const result = pearsonCorrelation(x, y);
      expect(result).toBeCloseTo(1, 5);
    });

    it('should return -1 for perfectly inversely correlated arrays', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [10, 8, 6, 4, 2];
      const result = pearsonCorrelation(x, y);
      expect(result).toBeCloseTo(-1, 5);
    });

    it('should return 0 for uncorrelated arrays', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [5, 5, 5, 5, 5]; // No variance
      const result = pearsonCorrelation(x, y);
      expect(result).toBe(0);
    });

    it('should return 0 for arrays with different lengths', () => {
      const x = [1, 2, 3];
      const y = [1, 2, 3, 4, 5];
      const result = pearsonCorrelation(x, y);
      expect(result).toBe(0);
    });

    it('should return 0 for arrays with less than 2 elements', () => {
      const x = [1];
      const y = [2];
      const result = pearsonCorrelation(x, y);
      expect(result).toBe(0);
    });

    it('should handle moderate positive correlation', () => {
      const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const y = [2, 3, 2, 5, 6, 5, 8, 9, 8, 11];
      const result = pearsonCorrelation(x, y);
      expect(result).toBeGreaterThan(0.8);
      expect(result).toBeLessThan(1);
    });
  });

  describe('getCorrelationStrength', () => {
    it('should return strong_positive for correlation >= 0.7', () => {
      expect(getCorrelationStrength(0.7)).toBe('strong_positive');
      expect(getCorrelationStrength(0.85)).toBe('strong_positive');
      expect(getCorrelationStrength(1)).toBe('strong_positive');
    });

    it('should return moderate_positive for correlation 0.4-0.7', () => {
      expect(getCorrelationStrength(0.4)).toBe('moderate_positive');
      expect(getCorrelationStrength(0.55)).toBe('moderate_positive');
      expect(getCorrelationStrength(0.69)).toBe('moderate_positive');
    });

    it('should return weak_positive for correlation 0.1-0.4', () => {
      expect(getCorrelationStrength(0.1)).toBe('weak_positive');
      expect(getCorrelationStrength(0.25)).toBe('weak_positive');
      expect(getCorrelationStrength(0.39)).toBe('weak_positive');
    });

    it('should return neutral for correlation -0.1 to 0.1', () => {
      expect(getCorrelationStrength(0)).toBe('neutral');
      expect(getCorrelationStrength(0.05)).toBe('neutral');
      expect(getCorrelationStrength(-0.05)).toBe('neutral');
    });

    it('should return weak_negative for correlation -0.4 to -0.1', () => {
      expect(getCorrelationStrength(-0.15)).toBe('weak_negative');
      expect(getCorrelationStrength(-0.3)).toBe('weak_negative');
    });

    it('should return moderate_negative for correlation -0.7 to -0.4', () => {
      expect(getCorrelationStrength(-0.45)).toBe('moderate_negative');
      expect(getCorrelationStrength(-0.6)).toBe('moderate_negative');
    });

    it('should return strong_negative for correlation <= -0.7', () => {
      expect(getCorrelationStrength(-0.7)).toBe('strong_negative');
      expect(getCorrelationStrength(-0.85)).toBe('strong_negative');
      expect(getCorrelationStrength(-1)).toBe('strong_negative');
    });
  });

  describe('getCorrelationColor', () => {
    it('should return green for strong positive correlation', () => {
      expect(getCorrelationColor(0.8)).toBe('#22c55e');
    });

    it('should return light green for moderate positive', () => {
      expect(getCorrelationColor(0.5)).toBe('#86efac');
    });

    it('should return gray for neutral', () => {
      expect(getCorrelationColor(0)).toBe('#f5f5f5');
    });

    it('should return red for strong negative correlation', () => {
      expect(getCorrelationColor(-0.8)).toBe('#dc2626');
    });
  });

  describe('Price History Cache', () => {
    it('should store and retrieve price history', () => {
      updatePriceHistory('AAPL', 'stock', 150, Date.now());
      updatePriceHistory('AAPL', 'stock', 151, Date.now() + 1000);
      
      const history = getPriceHistory('AAPL', 'stock');
      expect(history).not.toBeNull();
      expect(history?.symbol).toBe('AAPL');
      expect(history?.assetType).toBe('stock');
      expect(history?.prices.length).toBe(2);
    });

    it('should return null for non-existent asset', () => {
      const history = getPriceHistory('UNKNOWN', 'stock');
      expect(history).toBeNull();
    });

    it('should clear cache', () => {
      updatePriceHistory('AAPL', 'stock', 150, Date.now());
      clearPriceHistoryCache();
      const history = getPriceHistory('AAPL', 'stock');
      expect(history).toBeNull();
    });
  });

  describe('generateSimulatedPriceHistory', () => {
    it('should generate price history with correct structure', () => {
      const history = generateSimulatedPriceHistory('BTC', 'crypto', 40000, 0.03);
      
      expect(history.symbol).toBe('BTC');
      expect(history.assetType).toBe('crypto');
      expect(history.prices.length).toBeGreaterThan(0);
      expect(history.prices[0]).toHaveProperty('timestamp');
      expect(history.prices[0]).toHaveProperty('price');
    });

    it('should generate prices around base price', () => {
      const basePrice = 100;
      const history = generateSimulatedPriceHistory('TEST', 'stock', basePrice, 0.01);
      
      const avgPrice = history.prices.reduce((sum, p) => sum + p.price, 0) / history.prices.length;
      // Average should be within 50% of base price
      expect(avgPrice).toBeGreaterThan(basePrice * 0.5);
      expect(avgPrice).toBeLessThan(basePrice * 1.5);
    });
  });

  describe('calculateAssetCorrelation', () => {
    it('should calculate correlation between two assets', () => {
      const asset1 = generateSimulatedPriceHistory('AAPL', 'stock', 150, 0.01);
      const asset2 = generateSimulatedPriceHistory('MSFT', 'stock', 300, 0.01);
      
      const result = calculateAssetCorrelation(asset1, asset2, '7d');
      
      expect(result.asset1).toBe('AAPL');
      expect(result.asset2).toBe('MSFT');
      expect(result.correlation).toBeGreaterThanOrEqual(-1);
      expect(result.correlation).toBeLessThanOrEqual(1);
      expect(result.strength).toBeDefined();
      expect(result.sampleSize).toBeGreaterThan(0);
    });

    it('should return correlation rounded to 3 decimal places', () => {
      const asset1 = generateSimulatedPriceHistory('A', 'stock', 100, 0.01);
      const asset2 = generateSimulatedPriceHistory('B', 'stock', 100, 0.01);
      
      const result = calculateAssetCorrelation(asset1, asset2, '7d');
      const decimalPlaces = (result.correlation.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(3);
    });
  });

  describe('calculateCorrelationMatrix', () => {
    it('should calculate full correlation matrix', () => {
      const assets = [
        generateSimulatedPriceHistory('AAPL', 'stock', 150, 0.01),
        generateSimulatedPriceHistory('MSFT', 'stock', 300, 0.01),
        generateSimulatedPriceHistory('GOOGL', 'stock', 140, 0.01),
      ];
      
      const matrix = calculateCorrelationMatrix(assets, '7d');
      
      expect(matrix.assets).toEqual(['AAPL', 'MSFT', 'GOOGL']);
      expect(matrix.correlations.length).toBe(3);
      expect(matrix.correlations[0].length).toBe(3);
      expect(matrix.period).toBe('7d');
      expect(matrix.calculatedAt).toBeGreaterThan(0);
    });

    it('should have 1s on diagonal (self-correlation)', () => {
      const assets = [
        generateSimulatedPriceHistory('A', 'stock', 100, 0.01),
        generateSimulatedPriceHistory('B', 'stock', 100, 0.01),
      ];
      
      const matrix = calculateCorrelationMatrix(assets, '7d');
      
      expect(matrix.correlations[0][0]).toBe(1);
      expect(matrix.correlations[1][1]).toBe(1);
    });

    it('should be symmetric', () => {
      const assets = [
        generateSimulatedPriceHistory('A', 'stock', 100, 0.01),
        generateSimulatedPriceHistory('B', 'stock', 100, 0.01),
        generateSimulatedPriceHistory('C', 'stock', 100, 0.01),
      ];
      
      const matrix = calculateCorrelationMatrix(assets, '7d');
      
      expect(matrix.correlations[0][1]).toBe(matrix.correlations[1][0]);
      expect(matrix.correlations[0][2]).toBe(matrix.correlations[2][0]);
      expect(matrix.correlations[1][2]).toBe(matrix.correlations[2][1]);
    });

    it('should calculate correct number of pairs', () => {
      const assets = [
        generateSimulatedPriceHistory('A', 'stock', 100, 0.01),
        generateSimulatedPriceHistory('B', 'stock', 100, 0.01),
        generateSimulatedPriceHistory('C', 'stock', 100, 0.01),
        generateSimulatedPriceHistory('D', 'stock', 100, 0.01),
      ];
      
      const matrix = calculateCorrelationMatrix(assets, '7d');
      
      // n*(n-1)/2 pairs for n assets
      expect(matrix.pairs.length).toBe(6); // 4*3/2 = 6
      expect(matrix.metadata.totalPairs).toBe(6);
    });

    it('should identify strongest positive and negative correlations', () => {
      const assets = [
        generateSimulatedPriceHistory('A', 'stock', 100, 0.01),
        generateSimulatedPriceHistory('B', 'stock', 100, 0.01),
      ];
      
      const matrix = calculateCorrelationMatrix(assets, '7d');
      
      expect(matrix.metadata.strongestPositive).not.toBeNull();
      expect(matrix.metadata.strongestNegative).not.toBeNull();
    });
  });

  describe('seedDemoCorrelationData', () => {
    it('should seed demo data for multiple asset types', () => {
      seedDemoCorrelationData();
      
      // Check stocks
      expect(getPriceHistory('AAPL', 'stock')).not.toBeNull();
      expect(getPriceHistory('MSFT', 'stock')).not.toBeNull();
      
      // Check crypto
      expect(getPriceHistory('BTC', 'crypto')).not.toBeNull();
      expect(getPriceHistory('ETH', 'crypto')).not.toBeNull();
      
      // Check forex
      expect(getPriceHistory('EUR/USD', 'forex')).not.toBeNull();
      
      // Check commodities
      expect(getPriceHistory('GOLD', 'commodity')).not.toBeNull();
    });
  });

  describe('Time Period Filtering', () => {
    it('should filter data based on time period', () => {
      const asset1 = generateSimulatedPriceHistory('A', 'stock', 100, 0.01);
      const asset2 = generateSimulatedPriceHistory('B', 'stock', 100, 0.01);
      
      const result24h = calculateAssetCorrelation(asset1, asset2, '24h');
      const result7d = calculateAssetCorrelation(asset1, asset2, '7d');
      const result30d = calculateAssetCorrelation(asset1, asset2, '30d');
      
      // 30d should have more samples than 7d, which should have more than 24h
      expect(result30d.sampleSize).toBeGreaterThanOrEqual(result7d.sampleSize);
      expect(result7d.sampleSize).toBeGreaterThanOrEqual(result24h.sampleSize);
    });
  });
});
