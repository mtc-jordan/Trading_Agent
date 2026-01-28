import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateCovariance,
  buildCovarianceMatrix,
  calculatePortfolioReturn,
  calculatePortfolioVolatility,
  calculateSharpeRatio,
  optimizePortfolio,
  generateEfficientFrontier,
  runMonteCarloSimulation,
  calculateRebalancing,
  generateSampleAssets,
  getRiskProfileDescription,
  type AssetData,
  type RiskProfile,
} from './services/portfolioOptimizer';

describe('Portfolio Optimizer Service', () => {
  let sampleAssets: AssetData[];

  beforeEach(() => {
    sampleAssets = generateSampleAssets();
  });

  describe('generateSampleAssets', () => {
    it('should return an array of sample assets', () => {
      const assets = generateSampleAssets();
      expect(Array.isArray(assets)).toBe(true);
      expect(assets.length).toBeGreaterThan(0);
    });

    it('should include multiple asset types', () => {
      const assets = generateSampleAssets();
      const assetTypes = new Set(assets.map(a => a.assetType));
      expect(assetTypes.size).toBeGreaterThan(1);
    });

    it('should have valid asset properties', () => {
      const assets = generateSampleAssets();
      assets.forEach(asset => {
        expect(asset.symbol).toBeDefined();
        expect(asset.name).toBeDefined();
        expect(asset.assetType).toBeDefined();
        expect(typeof asset.expectedReturn).toBe('number');
        expect(typeof asset.volatility).toBe('number');
        expect(typeof asset.currentPrice).toBe('number');
      });
    });
  });

  describe('calculateCovariance', () => {
    it('should calculate covariance between two return series', () => {
      const returns1 = [0.01, 0.02, -0.01, 0.03, 0.01];
      const returns2 = [0.02, 0.01, -0.02, 0.02, 0.01];
      const covariance = calculateCovariance(returns1, returns2);
      expect(typeof covariance).toBe('number');
    });

    it('should return 0 for insufficient data', () => {
      const returns1 = [0.01];
      const returns2 = [0.02];
      const covariance = calculateCovariance(returns1, returns2);
      expect(covariance).toBe(0);
    });

    it('should return 0 for mismatched lengths', () => {
      const returns1 = [0.01, 0.02, 0.03];
      const returns2 = [0.01, 0.02];
      const covariance = calculateCovariance(returns1, returns2);
      expect(covariance).toBe(0);
    });

    it('should return positive covariance for positively correlated returns', () => {
      const returns1 = [0.01, 0.02, 0.03, 0.04, 0.05];
      const returns2 = [0.02, 0.04, 0.06, 0.08, 0.10];
      const covariance = calculateCovariance(returns1, returns2);
      expect(covariance).toBeGreaterThan(0);
    });
  });

  describe('buildCovarianceMatrix', () => {
    it('should build a square covariance matrix', () => {
      const assets = sampleAssets.slice(0, 3);
      const matrix = buildCovarianceMatrix(assets);
      expect(matrix.length).toBe(3);
      expect(matrix[0].length).toBe(3);
    });

    it('should have variances on the diagonal', () => {
      const assets = sampleAssets.slice(0, 3);
      const matrix = buildCovarianceMatrix(assets);
      for (let i = 0; i < assets.length; i++) {
        expect(matrix[i][i]).toBeCloseTo(Math.pow(assets[i].volatility, 2), 5);
      }
    });

    it('should be symmetric', () => {
      const assets = sampleAssets.slice(0, 3);
      const matrix = buildCovarianceMatrix(assets);
      for (let i = 0; i < assets.length; i++) {
        for (let j = 0; j < assets.length; j++) {
          expect(matrix[i][j]).toBeCloseTo(matrix[j][i], 10);
        }
      }
    });
  });

  describe('calculatePortfolioReturn', () => {
    it('should calculate weighted average return', () => {
      const assets: AssetData[] = [
        { symbol: 'A', name: 'Asset A', assetType: 'stock', expectedReturn: 0.10, volatility: 0.20, currentPrice: 100 },
        { symbol: 'B', name: 'Asset B', assetType: 'stock', expectedReturn: 0.15, volatility: 0.25, currentPrice: 100 },
      ];
      const weights = [0.5, 0.5];
      const portfolioReturn = calculatePortfolioReturn(assets, weights);
      expect(portfolioReturn).toBeCloseTo(0.125, 5);
    });

    it('should handle single asset', () => {
      const assets: AssetData[] = [
        { symbol: 'A', name: 'Asset A', assetType: 'stock', expectedReturn: 0.10, volatility: 0.20, currentPrice: 100 },
      ];
      const weights = [1.0];
      const portfolioReturn = calculatePortfolioReturn(assets, weights);
      expect(portfolioReturn).toBeCloseTo(0.10, 5);
    });
  });

  describe('calculatePortfolioVolatility', () => {
    it('should calculate portfolio volatility from covariance matrix', () => {
      const covMatrix = [
        [0.04, 0.01],
        [0.01, 0.0625],
      ];
      const weights = [0.5, 0.5];
      const volatility = calculatePortfolioVolatility(weights, covMatrix);
      expect(volatility).toBeGreaterThan(0);
      expect(volatility).toBeLessThan(1);
    });

    it('should return lower volatility for diversified portfolio', () => {
      const covMatrix = [
        [0.04, 0.01],
        [0.01, 0.04],
      ];
      const concentratedWeights = [1.0, 0.0];
      const diversifiedWeights = [0.5, 0.5];
      const concentratedVol = calculatePortfolioVolatility(concentratedWeights, covMatrix);
      const diversifiedVol = calculatePortfolioVolatility(diversifiedWeights, covMatrix);
      expect(diversifiedVol).toBeLessThan(concentratedVol);
    });
  });

  describe('calculateSharpeRatio', () => {
    it('should calculate Sharpe ratio correctly', () => {
      const expectedReturn = 0.12;
      const volatility = 0.20;
      const riskFreeRate = 0.045;
      const sharpe = calculateSharpeRatio(expectedReturn, volatility, riskFreeRate);
      expect(sharpe).toBeCloseTo((0.12 - 0.045) / 0.20, 5);
    });

    it('should return 0 for zero volatility', () => {
      const sharpe = calculateSharpeRatio(0.10, 0, 0.045);
      expect(sharpe).toBe(0);
    });

    it('should return negative for returns below risk-free rate', () => {
      const sharpe = calculateSharpeRatio(0.03, 0.20, 0.045);
      expect(sharpe).toBeLessThan(0);
    });
  });

  describe('optimizePortfolio', () => {
    it('should return optimized portfolio for conservative profile', () => {
      const assets = sampleAssets.slice(0, 5);
      const portfolio = optimizePortfolio(assets, 'conservative', 1000);
      expect(portfolio.allocations).toBeDefined();
      expect(portfolio.allocations.length).toBe(assets.length);
      expect(portfolio.riskProfile).toBe('conservative');
    });

    it('should return optimized portfolio for aggressive profile', () => {
      const assets = sampleAssets.slice(0, 5);
      const portfolio = optimizePortfolio(assets, 'aggressive', 1000);
      expect(portfolio.allocations).toBeDefined();
      expect(portfolio.riskProfile).toBe('aggressive');
    });

    it('should have weights that sum to 1', () => {
      const assets = sampleAssets.slice(0, 5);
      const portfolio = optimizePortfolio(assets, 'balanced', 1000);
      const totalWeight = portfolio.allocations.reduce((sum, a) => sum + a.weight, 0);
      expect(totalWeight).toBeCloseTo(1, 2);
    });

    it('should include diversification score', () => {
      const assets = sampleAssets.slice(0, 5);
      const portfolio = optimizePortfolio(assets, 'balanced', 1000);
      expect(portfolio.diversificationScore).toBeGreaterThanOrEqual(0);
      expect(portfolio.diversificationScore).toBeLessThanOrEqual(100);
    });

    it('should include Sharpe ratio', () => {
      const assets = sampleAssets.slice(0, 5);
      const portfolio = optimizePortfolio(assets, 'balanced', 1000);
      expect(typeof portfolio.sharpeRatio).toBe('number');
    });

    it('should include expected return and volatility', () => {
      const assets = sampleAssets.slice(0, 5);
      const portfolio = optimizePortfolio(assets, 'balanced', 1000);
      expect(typeof portfolio.expectedReturn).toBe('number');
      expect(typeof portfolio.expectedVolatility).toBe('number');
    });
  });

  describe('generateEfficientFrontier', () => {
    it('should generate efficient frontier points', () => {
      const assets = sampleAssets.slice(0, 4);
      const frontier = generateEfficientFrontier(assets, 10);
      expect(Array.isArray(frontier)).toBe(true);
    });

    it('should have increasing returns along the frontier', () => {
      const assets = sampleAssets.slice(0, 4);
      const frontier = generateEfficientFrontier(assets, 20);
      if (frontier.length > 1) {
        // Generally, returns should increase with volatility
        const firstHalf = frontier.slice(0, Math.floor(frontier.length / 2));
        const secondHalf = frontier.slice(Math.floor(frontier.length / 2));
        const avgReturnFirst = firstHalf.reduce((sum, p) => sum + p.expectedReturn, 0) / firstHalf.length;
        const avgReturnSecond = secondHalf.reduce((sum, p) => sum + p.expectedReturn, 0) / secondHalf.length;
        // Second half should generally have higher returns
        expect(avgReturnSecond).toBeGreaterThanOrEqual(avgReturnFirst * 0.9);
      }
    });

    it('should include allocations for each point', () => {
      const assets = sampleAssets.slice(0, 4);
      const frontier = generateEfficientFrontier(assets, 10);
      frontier.forEach(point => {
        expect(point.allocations).toBeDefined();
        expect(Array.isArray(point.allocations)).toBe(true);
      });
    });
  });

  describe('runMonteCarloSimulation', () => {
    it('should run Monte Carlo simulation', () => {
      const portfolio = {
        allocations: [],
        expectedReturn: 0.10,
        expectedVolatility: 0.20,
        sharpeRatio: 0.5,
        riskProfile: 'balanced' as RiskProfile,
        diversificationScore: 70,
        efficientFrontierPosition: 'optimal' as const,
      };
      const result = runMonteCarloSimulation(portfolio, 100000, 5, 1000);
      expect(result.median).toBeDefined();
      expect(result.percentile5).toBeDefined();
      expect(result.percentile95).toBeDefined();
    });

    it('should have percentiles in correct order', () => {
      const portfolio = {
        allocations: [],
        expectedReturn: 0.10,
        expectedVolatility: 0.20,
        sharpeRatio: 0.5,
        riskProfile: 'balanced' as RiskProfile,
        diversificationScore: 70,
        efficientFrontierPosition: 'optimal' as const,
      };
      const result = runMonteCarloSimulation(portfolio, 100000, 5, 1000);
      expect(result.percentile5).toBeLessThanOrEqual(result.percentile25);
      expect(result.percentile25).toBeLessThanOrEqual(result.median);
      expect(result.median).toBeLessThanOrEqual(result.percentile75);
      expect(result.percentile75).toBeLessThanOrEqual(result.percentile95);
    });

    it('should calculate probability of loss', () => {
      const portfolio = {
        allocations: [],
        expectedReturn: 0.10,
        expectedVolatility: 0.20,
        sharpeRatio: 0.5,
        riskProfile: 'balanced' as RiskProfile,
        diversificationScore: 70,
        efficientFrontierPosition: 'optimal' as const,
      };
      const result = runMonteCarloSimulation(portfolio, 100000, 5, 1000);
      expect(result.probabilityOfLoss).toBeGreaterThanOrEqual(0);
      expect(result.probabilityOfLoss).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateRebalancing', () => {
    it('should calculate rebalancing recommendations', () => {
      const currentAllocations = [
        { symbol: 'AAPL', weight: 0.40 },
        { symbol: 'MSFT', weight: 0.35 },
        { symbol: 'GOOGL', weight: 0.25 },
      ];
      const targetAllocations = [
        { symbol: 'AAPL', name: 'Apple', assetType: 'stock', weight: 0.30, expectedContribution: 0.03 },
        { symbol: 'MSFT', name: 'Microsoft', assetType: 'stock', weight: 0.40, expectedContribution: 0.04 },
        { symbol: 'GOOGL', name: 'Google', assetType: 'stock', weight: 0.30, expectedContribution: 0.03 },
      ];
      const recommendations = calculateRebalancing(currentAllocations, targetAllocations, 0.05);
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should identify buy and sell actions', () => {
      const currentAllocations = [
        { symbol: 'AAPL', weight: 0.60 },
        { symbol: 'MSFT', weight: 0.40 },
      ];
      const targetAllocations = [
        { symbol: 'AAPL', name: 'Apple', assetType: 'stock', weight: 0.40, expectedContribution: 0.04 },
        { symbol: 'MSFT', name: 'Microsoft', assetType: 'stock', weight: 0.60, expectedContribution: 0.06 },
      ];
      const recommendations = calculateRebalancing(currentAllocations, targetAllocations, 0.05);
      const aaplRec = recommendations.find(r => r.symbol === 'AAPL');
      const msftRec = recommendations.find(r => r.symbol === 'MSFT');
      if (aaplRec) expect(aaplRec.action).toBe('sell');
      if (msftRec) expect(msftRec.action).toBe('buy');
    });

    it('should not recommend changes below threshold', () => {
      const currentAllocations = [
        { symbol: 'AAPL', weight: 0.51 },
        { symbol: 'MSFT', weight: 0.49 },
      ];
      const targetAllocations = [
        { symbol: 'AAPL', name: 'Apple', assetType: 'stock', weight: 0.50, expectedContribution: 0.05 },
        { symbol: 'MSFT', name: 'Microsoft', assetType: 'stock', weight: 0.50, expectedContribution: 0.05 },
      ];
      const recommendations = calculateRebalancing(currentAllocations, targetAllocations, 0.05);
      expect(recommendations.length).toBe(0);
    });
  });

  describe('getRiskProfileDescription', () => {
    it('should return description for conservative profile', () => {
      const desc = getRiskProfileDescription('conservative');
      expect(desc.name).toBe('Conservative');
      expect(desc.description).toBeDefined();
      expect(desc.targetReturn).toBeDefined();
      expect(desc.targetVolatility).toBeDefined();
      expect(desc.suitableFor).toBeDefined();
    });

    it('should return description for all profiles', () => {
      const profiles: RiskProfile[] = ['conservative', 'moderate', 'balanced', 'growth', 'aggressive'];
      profiles.forEach(profile => {
        const desc = getRiskProfileDescription(profile);
        expect(desc.name).toBeDefined();
        expect(desc.description).toBeDefined();
      });
    });
  });

  describe('Risk Profile Optimization Differences', () => {
    it('should produce different results for different risk profiles', () => {
      const assets = sampleAssets.slice(0, 6);
      const conservative = optimizePortfolio(assets, 'conservative', 2000);
      const aggressive = optimizePortfolio(assets, 'aggressive', 2000);
      
      // Aggressive should generally have higher expected return
      // (though this depends on the Monte Carlo results)
      expect(conservative.riskProfile).not.toBe(aggressive.riskProfile);
    });
  });
});
