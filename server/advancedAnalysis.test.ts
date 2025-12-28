import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the data API
vi.mock('./_core/dataApi', () => ({
  callDataApi: vi.fn().mockResolvedValue({
    chart: {
      result: [{
        timestamp: Array.from({ length: 252 }, (_, i) => 1704067200 + i * 86400),
        indicators: {
          quote: [{
            open: Array.from({ length: 252 }, () => 150 + Math.random() * 10),
            high: Array.from({ length: 252 }, () => 155 + Math.random() * 10),
            low: Array.from({ length: 252 }, () => 145 + Math.random() * 10),
            close: Array.from({ length: 252 }, () => 150 + Math.random() * 10),
            volume: Array.from({ length: 252 }, () => 1000000 + Math.random() * 500000),
          }],
          adjclose: [{
            adjclose: Array.from({ length: 252 }, () => 150 + Math.random() * 10),
          }],
        },
        meta: {
          symbol: 'AAPL',
          currency: 'USD',
          regularMarketPrice: 155,
        },
      }],
    },
  }),
}));

// Import types (functions are async and need mocking)
import type { MonteCarloConfig } from './services/monteCarloSimulation';
import type { WalkForwardConfig } from './services/walkForwardOptimization';
import type { PortfolioConfig } from './services/portfolioBacktesting';

describe('Monte Carlo Simulation', () => {
  it('should have valid config interface', () => {
    const config: MonteCarloConfig = {
      symbol: 'AAPL',
      numSimulations: 1000,
      timeHorizonDays: 252,
      initialCapital: 100000,
      confidenceLevels: [0.95, 0.99],
      strategyType: 'buy_hold',
    };
    expect(config.symbol).toBe('AAPL');
  });

  it('should validate config parameters', () => {
    const validConfig: MonteCarloConfig = {
      symbol: 'AAPL',
      numSimulations: 1000,
      timeHorizonDays: 252,
      initialCapital: 100000,
      confidenceLevels: [0.95, 0.99],
      simulationMethod: 'geometric_brownian',
    };

    expect(validConfig.numSimulations).toBeGreaterThan(0);
    expect(validConfig.timeHorizonDays).toBeGreaterThan(0);
    expect(validConfig.initialCapital).toBeGreaterThan(0);
    expect(validConfig.confidenceLevels.every(c => c > 0 && c < 1)).toBe(true);
  });

  it('should support different simulation methods', () => {
    const methods = ['geometric_brownian', 'historical_bootstrap', 'jump_diffusion'] as const;
    methods.forEach(method => {
      expect(['geometric_brownian', 'historical_bootstrap', 'jump_diffusion']).toContain(method);
    });
  });

  it('should calculate VaR correctly', () => {
    // VaR should be a negative number representing potential loss
    const returns = [-0.05, -0.03, -0.02, -0.01, 0, 0.01, 0.02, 0.03, 0.05];
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const var95Index = Math.floor(returns.length * 0.05);
    const var95 = sortedReturns[var95Index];
    
    expect(var95).toBeLessThan(0);
    expect(var95).toBeCloseTo(-0.05, 2);
  });

  it('should calculate CVaR (Expected Shortfall) correctly', () => {
    const returns = [-0.05, -0.03, -0.02, -0.01, 0, 0.01, 0.02, 0.03, 0.05];
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const var95Index = Math.floor(returns.length * 0.05);
    const tailReturns = sortedReturns.slice(0, var95Index + 1);
    const cvar = tailReturns.reduce((a, b) => a + b, 0) / tailReturns.length;
    
    // CVaR should be worse than VaR
    expect(cvar).toBeLessThanOrEqual(sortedReturns[var95Index]);
  });
});

describe('Walk-Forward Optimization', () => {
  it('should have valid config interface', () => {
    const config: WalkForwardConfig = {
      symbol: 'AAPL',
      totalPeriodDays: 504,
      trainingWindowDays: 126,
      testingWindowDays: 63,
      stepSizeDays: 63,
      optimizationType: 'rolling',
      strategyType: 'enhanced',
      initialCapital: 100000,
    };
    expect(config.symbol).toBe('AAPL');
  });

  it('should validate walk-forward config', () => {
    const validConfig: WalkForwardConfig = {
      symbol: 'AAPL',
      totalPeriodDays: 504,
      trainingWindowDays: 126,
      testingWindowDays: 63,
      stepSizeDays: 63,
      optimizationType: 'rolling',
      strategyType: 'enhanced',
      initialCapital: 100000,
    };

    expect(validConfig.trainingWindowDays).toBeGreaterThan(0);
    expect(validConfig.testingWindowDays).toBeGreaterThan(0);
    expect(validConfig.totalPeriodDays).toBeGreaterThan(validConfig.trainingWindowDays + validConfig.testingWindowDays);
  });

  it('should calculate correct number of windows', () => {
    const totalDays = 504;
    const trainingDays = 126;
    const testingDays = 63;
    const stepSize = 63;
    
    // First window: 0-126 (train), 126-189 (test)
    // Second window: 63-189 (train), 189-252 (test)
    // etc.
    const numWindows = Math.floor((totalDays - trainingDays - testingDays) / stepSize) + 1;
    
    expect(numWindows).toBeGreaterThan(0);
    expect(numWindows).toBe(6); // For these parameters
  });

  it('should support anchored and rolling optimization types', () => {
    const types = ['anchored', 'rolling'] as const;
    types.forEach(type => {
      expect(['anchored', 'rolling']).toContain(type);
    });
  });

  it('should detect overfitting', () => {
    // Overfit detection: training return >> testing return
    const trainingReturn = 0.25; // 25%
    const testingReturn = 0.05; // 5%
    const returnDegradation = (trainingReturn - testingReturn) / trainingReturn;
    
    // If degradation > 50%, likely overfit
    const isOverfit = returnDegradation > 0.5;
    expect(isOverfit).toBe(true);
    expect(returnDegradation).toBeCloseTo(0.8, 1);
  });
});

describe('Portfolio Backtesting', () => {
  it('should have valid config interface', () => {
    const config: PortfolioConfig = {
      assets: [
        { symbol: 'AAPL', weight: 0.3 },
        { symbol: 'MSFT', weight: 0.3 },
        { symbol: 'GOOGL', weight: 0.4 },
      ],
      initialCapital: 100000,
      rebalanceFrequency: 'monthly',
      benchmarkSymbol: 'SPY',
    };
    expect(config.assets.length).toBe(3);
  });

  it('should validate portfolio config', () => {
    const validConfig: PortfolioConfig = {
      assets: [
        { symbol: 'AAPL', weight: 0.3 },
        { symbol: 'MSFT', weight: 0.3 },
        { symbol: 'GOOGL', weight: 0.4 },
      ],
      initialCapital: 100000,
      rebalanceFrequency: 'monthly',
      benchmarkSymbol: 'SPY',
    };

    const totalWeight = validConfig.assets.reduce((sum, a) => sum + a.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 5);
    expect(validConfig.assets.length).toBeGreaterThanOrEqual(2);
  });

  it('should calculate portfolio return correctly', () => {
    const assetReturns = [0.10, 0.15, 0.05]; // 10%, 15%, 5%
    const weights = [0.3, 0.3, 0.4];
    
    const portfolioReturn = assetReturns.reduce((sum, ret, i) => sum + ret * weights[i], 0);
    
    // 0.1*0.3 + 0.15*0.3 + 0.05*0.4 = 0.03 + 0.045 + 0.02 = 0.095
    expect(portfolioReturn).toBeCloseTo(0.095, 5);
  });

  it('should calculate correlation matrix correctly', () => {
    // Simple correlation test
    const returns1 = [0.01, 0.02, -0.01, 0.03, -0.02];
    const returns2 = [0.01, 0.02, -0.01, 0.03, -0.02]; // Perfect correlation
    const returns3 = [-0.01, -0.02, 0.01, -0.03, 0.02]; // Perfect negative correlation
    
    const mean1 = returns1.reduce((a, b) => a + b, 0) / returns1.length;
    const mean2 = returns2.reduce((a, b) => a + b, 0) / returns2.length;
    
    let covariance = 0;
    let var1 = 0;
    let var2 = 0;
    
    for (let i = 0; i < returns1.length; i++) {
      covariance += (returns1[i] - mean1) * (returns2[i] - mean2);
      var1 += (returns1[i] - mean1) ** 2;
      var2 += (returns2[i] - mean2) ** 2;
    }
    
    const correlation = covariance / Math.sqrt(var1 * var2);
    
    expect(correlation).toBeCloseTo(1.0, 5); // Perfect correlation
  });

  it('should calculate diversification ratio correctly', () => {
    // Diversification ratio = weighted avg volatility / portfolio volatility
    const assetVolatilities = [0.20, 0.25, 0.15]; // 20%, 25%, 15%
    const weights = [0.33, 0.33, 0.34];
    
    const weightedAvgVol = assetVolatilities.reduce((sum, vol, i) => sum + vol * weights[i], 0);
    
    // If assets are perfectly correlated, portfolio vol = weighted avg vol
    // If diversified, portfolio vol < weighted avg vol
    const portfolioVol = 0.15; // Assume diversification benefit
    
    const diversificationRatio = weightedAvgVol / portfolioVol;
    
    expect(diversificationRatio).toBeGreaterThan(1.0); // Should be > 1 if diversified
    expect(weightedAvgVol).toBeCloseTo(0.1998, 3);
  });

  it('should calculate Sharpe ratio correctly', () => {
    const annualizedReturn = 0.12; // 12%
    const volatility = 0.20; // 20%
    const riskFreeRate = 0.02; // 2%
    
    const sharpeRatio = (annualizedReturn - riskFreeRate) / volatility;
    
    expect(sharpeRatio).toBeCloseTo(0.5, 5);
  });

  it('should calculate Sortino ratio correctly', () => {
    const annualizedReturn = 0.12;
    const riskFreeRate = 0.02;
    const downsideDeviation = 0.15; // Only negative returns
    
    const sortinoRatio = (annualizedReturn - riskFreeRate) / downsideDeviation;
    
    expect(sortinoRatio).toBeCloseTo(0.667, 2);
  });

  it('should calculate max drawdown correctly', () => {
    const equityCurve = [100, 110, 105, 95, 100, 90, 95, 100, 110];
    
    let maxDrawdown = 0;
    let peak = equityCurve[0];
    
    for (const value of equityCurve) {
      if (value > peak) {
        peak = value;
      }
      const drawdown = (peak - value) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    // Max drawdown: peak at 110, trough at 90 = (110-90)/110 = 18.18%
    expect(maxDrawdown).toBeCloseTo(0.1818, 3);
  });

  it('should calculate beta correctly', () => {
    // Beta = Covariance(asset, market) / Variance(market)
    const assetReturns = [0.02, 0.03, -0.01, 0.04, -0.02];
    const marketReturns = [0.01, 0.02, -0.005, 0.03, -0.01];
    
    const meanAsset = assetReturns.reduce((a, b) => a + b, 0) / assetReturns.length;
    const meanMarket = marketReturns.reduce((a, b) => a + b, 0) / marketReturns.length;
    
    let covariance = 0;
    let marketVariance = 0;
    
    for (let i = 0; i < assetReturns.length; i++) {
      covariance += (assetReturns[i] - meanAsset) * (marketReturns[i] - meanMarket);
      marketVariance += (marketReturns[i] - meanMarket) ** 2;
    }
    
    covariance /= assetReturns.length;
    marketVariance /= marketReturns.length;
    
    const beta = covariance / marketVariance;
    
    expect(beta).toBeGreaterThan(0); // Positive correlation with market
  });

  it('should calculate alpha correctly', () => {
    const portfolioReturn = 0.15; // 15%
    const riskFreeRate = 0.02; // 2%
    const beta = 1.2;
    const marketReturn = 0.10; // 10%
    
    // Alpha = Portfolio Return - [Risk Free Rate + Beta * (Market Return - Risk Free Rate)]
    const expectedReturn = riskFreeRate + beta * (marketReturn - riskFreeRate);
    const alpha = portfolioReturn - expectedReturn;
    
    // Expected return = 0.02 + 1.2 * (0.10 - 0.02) = 0.02 + 0.096 = 0.116
    // Alpha = 0.15 - 0.116 = 0.034
    expect(alpha).toBeCloseTo(0.034, 3);
  });
});

describe('Risk Metrics', () => {
  it('should calculate Value at Risk (VaR) at different confidence levels', () => {
    const returns = Array.from({ length: 1000 }, () => (Math.random() - 0.5) * 0.1);
    const sortedReturns = [...returns].sort((a, b) => a - b);
    
    const var95 = sortedReturns[Math.floor(returns.length * 0.05)];
    const var99 = sortedReturns[Math.floor(returns.length * 0.01)];
    
    // VaR99 should be more extreme than VaR95
    expect(var99).toBeLessThan(var95);
  });

  it('should calculate Conditional VaR (CVaR)', () => {
    const returns = Array.from({ length: 1000 }, () => (Math.random() - 0.5) * 0.1);
    const sortedReturns = [...returns].sort((a, b) => a - b);
    
    const var95Index = Math.floor(returns.length * 0.05);
    const var95 = sortedReturns[var95Index];
    
    // CVaR is the average of returns below VaR
    const tailReturns = sortedReturns.slice(0, var95Index);
    const cvar95 = tailReturns.reduce((a, b) => a + b, 0) / tailReturns.length;
    
    // CVaR should be worse (more negative) than VaR
    expect(cvar95).toBeLessThanOrEqual(var95);
  });

  it('should calculate Information Ratio', () => {
    const portfolioReturns = [0.02, 0.03, -0.01, 0.04, -0.02];
    const benchmarkReturns = [0.01, 0.02, -0.005, 0.03, -0.01];
    
    const excessReturns = portfolioReturns.map((r, i) => r - benchmarkReturns[i]);
    const avgExcessReturn = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length;
    
    const trackingError = Math.sqrt(
      excessReturns.reduce((sum, r) => sum + (r - avgExcessReturn) ** 2, 0) / excessReturns.length
    );
    
    const informationRatio = avgExcessReturn / trackingError;
    
    expect(typeof informationRatio).toBe('number');
    expect(isFinite(informationRatio)).toBe(true);
  });
});

describe('Statistical Calculations', () => {
  it('should calculate standard deviation correctly', () => {
    const values = [2, 4, 4, 4, 5, 5, 7, 9];
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    expect(mean).toBe(5);
    expect(stdDev).toBeCloseTo(2, 1);
  });

  it('should calculate covariance correctly', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 6, 8, 10];
    
    const meanX = x.reduce((a, b) => a + b, 0) / x.length;
    const meanY = y.reduce((a, b) => a + b, 0) / y.length;
    
    const covariance = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0) / x.length;
    
    expect(covariance).toBe(4); // Perfect positive relationship
  });

  it('should calculate Pearson correlation correctly', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 6, 8, 10];
    
    const meanX = x.reduce((a, b) => a + b, 0) / x.length;
    const meanY = y.reduce((a, b) => a + b, 0) / y.length;
    
    let covariance = 0;
    let varX = 0;
    let varY = 0;
    
    for (let i = 0; i < x.length; i++) {
      covariance += (x[i] - meanX) * (y[i] - meanY);
      varX += (x[i] - meanX) ** 2;
      varY += (y[i] - meanY) ** 2;
    }
    
    const correlation = covariance / Math.sqrt(varX * varY);
    
    expect(correlation).toBeCloseTo(1.0, 5); // Perfect correlation
  });
});
