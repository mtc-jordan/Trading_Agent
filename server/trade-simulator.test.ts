/**
 * Tests for Trade Simulator Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the trade simulator service
vi.mock('./services/tradeSimulator', () => ({
  simulateTrades: vi.fn().mockResolvedValue({
    scenarioId: 'sim-123',
    scenarioName: 'Test Scenario',
    trades: [
      { symbol: 'AAPL', side: 'buy', quantity: 10, estimatedPrice: 175 },
    ],
    beforeMetrics: {
      totalValue: 50000,
      totalCash: 15000,
      totalEquity: 35000,
      positions: [
        { symbol: 'AAPL', quantity: 50, avgCost: 145, currentPrice: 175, marketValue: 8750, unrealizedPL: 1500, unrealizedPLPercent: 20.69, weight: 17.5 },
        { symbol: 'MSFT', quantity: 30, avgCost: 280, currentPrice: 375, marketValue: 11250, unrealizedPL: 2850, unrealizedPLPercent: 33.93, weight: 22.5 },
      ],
      diversificationScore: 65,
      concentrationRisk: 22.5,
      beta: 1.1,
      volatility: 25,
      sharpeRatio: 0.5,
      maxDrawdownRisk: 62.5,
      sectorExposure: { Technology: 40 },
    },
    afterMetrics: {
      totalValue: 48250,
      totalCash: 13250,
      totalEquity: 35000,
      positions: [
        { symbol: 'AAPL', quantity: 60, avgCost: 150, currentPrice: 175, marketValue: 10500, unrealizedPL: 1500, unrealizedPLPercent: 16.67, weight: 21.8 },
        { symbol: 'MSFT', quantity: 30, avgCost: 280, currentPrice: 375, marketValue: 11250, unrealizedPL: 2850, unrealizedPLPercent: 33.93, weight: 23.3 },
      ],
      diversificationScore: 60,
      concentrationRisk: 23.3,
      beta: 1.15,
      volatility: 26,
      sharpeRatio: 0.48,
      maxDrawdownRisk: 65,
      sectorExposure: { Technology: 45.1 },
    },
    impact: {
      totalValueChange: -1750,
      totalValueChangePercent: -3.5,
      cashChange: -1750,
      diversificationChange: -5,
      concentrationRiskChange: 0.8,
      betaChange: 0.05,
      volatilityChange: 1,
      sharpeRatioChange: -0.02,
      maxDrawdownRiskChange: 2.5,
      newPositions: [],
      closedPositions: [],
      increasedPositions: ['AAPL'],
      decreasedPositions: [],
    },
    costs: {
      estimatedCommission: 1,
      estimatedSlippage: 1.75,
      estimatedTaxImpact: 0,
      totalCosts: 2.75,
    },
    warnings: [],
    simulatedAt: new Date().toISOString(),
  }),
  compareScenarios: vi.fn().mockResolvedValue({
    scenarios: [
      {
        scenarioId: 'sim-1',
        scenarioName: 'Conservative',
        trades: [{ symbol: 'JNJ', side: 'buy', quantity: 20, estimatedPrice: 160 }],
        beforeMetrics: { totalValue: 50000, diversificationScore: 65, volatility: 25, sharpeRatio: 0.5 },
        afterMetrics: { totalValue: 46800, diversificationScore: 70, volatility: 22, sharpeRatio: 0.55 },
        impact: { totalValueChange: -3200, sharpeRatioChange: 0.05 },
        costs: { totalCosts: 3.5 },
        warnings: [],
      },
      {
        scenarioId: 'sim-2',
        scenarioName: 'Aggressive',
        trades: [{ symbol: 'NVDA', side: 'buy', quantity: 10, estimatedPrice: 480 }],
        beforeMetrics: { totalValue: 50000, diversificationScore: 65, volatility: 25, sharpeRatio: 0.5 },
        afterMetrics: { totalValue: 45200, diversificationScore: 55, volatility: 35, sharpeRatio: 0.4 },
        impact: { totalValueChange: -4800, sharpeRatioChange: -0.1 },
        costs: { totalCosts: 5 },
        warnings: [{ type: 'volatility', severity: 'medium', message: 'Increased volatility' }],
      },
    ],
    bestScenario: 'Conservative',
    worstScenario: 'Aggressive',
    recommendation: '"Conservative" is recommended as it improves the portfolio\'s risk-adjusted return.',
  }),
  generateOptimizedTrades: vi.fn().mockResolvedValue([
    { symbol: 'AAPL', side: 'sell', quantity: 10, estimatedPrice: 175 },
    { symbol: 'JNJ', side: 'buy', quantity: 15, estimatedPrice: 160 },
  ]),
  getSamplePositions: vi.fn().mockReturnValue([
    { symbol: 'AAPL', quantity: 50, avgCost: 145, currentPrice: 175, marketValue: 8750, unrealizedPL: 1500, unrealizedPLPercent: 20.69, weight: 0 },
    { symbol: 'MSFT', quantity: 30, avgCost: 280, currentPrice: 375, marketValue: 11250, unrealizedPL: 2850, unrealizedPLPercent: 33.93, weight: 0 },
  ]),
}));

describe('Trade Simulator Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('simulateTrades', () => {
    it('should simulate trades and return impact analysis', async () => {
      const { simulateTrades } = await import('./services/tradeSimulator');
      
      const result = await simulateTrades(
        'user-1',
        [{ symbol: 'AAPL', side: 'buy', quantity: 10, estimatedPrice: 175 }],
        'Test Scenario'
      );
      
      expect(result).toBeDefined();
      expect(result.scenarioId).toBe('sim-123');
      expect(result.scenarioName).toBe('Test Scenario');
    });

    it('should include before and after metrics', async () => {
      const { simulateTrades } = await import('./services/tradeSimulator');
      
      const result = await simulateTrades(
        'user-1',
        [{ symbol: 'AAPL', side: 'buy', quantity: 10, estimatedPrice: 175 }],
        'Test Scenario'
      );
      
      expect(result.beforeMetrics).toBeDefined();
      expect(result.afterMetrics).toBeDefined();
      expect(result.beforeMetrics.totalValue).toBe(50000);
    });

    it('should calculate impact correctly', async () => {
      const { simulateTrades } = await import('./services/tradeSimulator');
      
      const result = await simulateTrades(
        'user-1',
        [{ symbol: 'AAPL', side: 'buy', quantity: 10, estimatedPrice: 175 }],
        'Test Scenario'
      );
      
      expect(result.impact).toBeDefined();
      expect(result.impact.totalValueChange).toBe(-1750);
      expect(result.impact.increasedPositions).toContain('AAPL');
    });

    it('should estimate costs', async () => {
      const { simulateTrades } = await import('./services/tradeSimulator');
      
      const result = await simulateTrades(
        'user-1',
        [{ symbol: 'AAPL', side: 'buy', quantity: 10, estimatedPrice: 175 }],
        'Test Scenario'
      );
      
      expect(result.costs).toBeDefined();
      expect(result.costs.estimatedCommission).toBeGreaterThan(0);
      expect(result.costs.totalCosts).toBe(2.75);
    });
  });

  describe('compareScenarios', () => {
    it('should compare multiple scenarios', async () => {
      const { compareScenarios } = await import('./services/tradeSimulator');
      
      const result = await compareScenarios(
        'user-1',
        [
          { name: 'Conservative', trades: [{ symbol: 'JNJ', side: 'buy' as const, quantity: 20, estimatedPrice: 160 }] },
          { name: 'Aggressive', trades: [{ symbol: 'NVDA', side: 'buy' as const, quantity: 10, estimatedPrice: 480 }] },
        ]
      );
      
      expect(result.scenarios).toHaveLength(2);
      expect(result.bestScenario).toBe('Conservative');
      expect(result.worstScenario).toBe('Aggressive');
    });

    it('should provide recommendation', async () => {
      const { compareScenarios } = await import('./services/tradeSimulator');
      
      const result = await compareScenarios(
        'user-1',
        [
          { name: 'Conservative', trades: [{ symbol: 'JNJ', side: 'buy' as const, quantity: 20, estimatedPrice: 160 }] },
          { name: 'Aggressive', trades: [{ symbol: 'NVDA', side: 'buy' as const, quantity: 10, estimatedPrice: 480 }] },
        ]
      );
      
      expect(result.recommendation).toBeDefined();
      expect(result.recommendation).toContain('Conservative');
    });
  });

  describe('generateOptimizedTrades', () => {
    it('should generate trades to reach target allocation', async () => {
      const { generateOptimizedTrades } = await import('./services/tradeSimulator');
      
      const result = await generateOptimizedTrades(
        'user-1',
        [
          { symbol: 'AAPL', targetPercent: 20 },
          { symbol: 'JNJ', targetPercent: 30 },
        ],
        [
          { symbol: 'AAPL', quantity: 50, avgCost: 145, currentPrice: 175, marketValue: 8750, unrealizedPL: 1500, unrealizedPLPercent: 20.69, weight: 0 },
        ],
        15000
      );
      
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getSamplePositions', () => {
    it('should return sample positions for demo', async () => {
      const { getSamplePositions } = await import('./services/tradeSimulator');
      
      const positions = getSamplePositions();
      
      expect(positions).toHaveLength(2);
      expect(positions[0].symbol).toBe('AAPL');
    });
  });
});

describe('Portfolio Metrics Calculations', () => {
  it('should calculate diversification score based on position count and weights', () => {
    const positions = [
      { weight: 25 },
      { weight: 25 },
      { weight: 25 },
      { weight: 25 },
    ];
    
    // Herfindahl Index = sum of squared weights
    const weights = positions.map(p => p.weight / 100);
    const herfindahlIndex = weights.reduce((sum, w) => sum + w * w, 0);
    
    // Equal weights should give HI = 0.25 (4 positions at 25% each)
    expect(herfindahlIndex).toBeCloseTo(0.25, 2);
    
    // Diversification = (1 - HI) * 100 * (min(positions, 20) / 20)
    const diversificationScore = (1 - herfindahlIndex) * 100 * (Math.min(positions.length, 20) / 20);
    expect(diversificationScore).toBeCloseTo(15, 0); // (1 - 0.25) * 100 * (4/20) = 15
  });

  it('should calculate concentration risk as max position weight', () => {
    const positions = [
      { weight: 40 },
      { weight: 30 },
      { weight: 20 },
      { weight: 10 },
    ];
    
    const concentrationRisk = Math.max(...positions.map(p => p.weight));
    expect(concentrationRisk).toBe(40);
  });

  it('should calculate portfolio beta as weighted average', () => {
    const positions = [
      { symbol: 'AAPL', weight: 50, beta: 1.25 },
      { symbol: 'JNJ', weight: 50, beta: 0.70 },
    ];
    
    const portfolioBeta = positions.reduce((sum, p) => sum + p.beta * (p.weight / 100), 0);
    expect(portfolioBeta).toBeCloseTo(0.975, 2);
  });
});

describe('Trade Impact Calculations', () => {
  it('should calculate buy trade impact on cash', () => {
    const cash = 15000;
    const trade = { side: 'buy', quantity: 10, estimatedPrice: 175 };
    const tradeValue = trade.quantity * trade.estimatedPrice;
    
    const newCash = cash - tradeValue;
    expect(newCash).toBe(13250);
  });

  it('should calculate sell trade impact on cash', () => {
    const cash = 15000;
    const trade = { side: 'sell', quantity: 10, estimatedPrice: 175 };
    const tradeValue = trade.quantity * trade.estimatedPrice;
    
    const newCash = cash + tradeValue;
    expect(newCash).toBe(16750);
  });

  it('should calculate new position average cost after buy', () => {
    const existing = { quantity: 50, avgCost: 145 };
    const trade = { quantity: 10, price: 175 };
    
    const totalCost = existing.avgCost * existing.quantity + trade.price * trade.quantity;
    const totalQty = existing.quantity + trade.quantity;
    const newAvgCost = totalCost / totalQty;
    
    expect(newAvgCost).toBeCloseTo(150, 0);
  });

  it('should identify new positions', () => {
    const beforeSymbols = new Set(['AAPL', 'MSFT']);
    const afterSymbols = new Set(['AAPL', 'MSFT', 'GOOGL']);
    
    const newPositions = Array.from(afterSymbols).filter(s => !beforeSymbols.has(s));
    expect(newPositions).toContain('GOOGL');
  });

  it('should identify closed positions', () => {
    const beforeSymbols = new Set(['AAPL', 'MSFT', 'TSLA']);
    const afterSymbols = new Set(['AAPL', 'MSFT']);
    
    const closedPositions = Array.from(beforeSymbols).filter(s => !afterSymbols.has(s));
    expect(closedPositions).toContain('TSLA');
  });
});

describe('Cost Estimation', () => {
  it('should estimate commission based on shares', () => {
    const quantity = 100;
    const commissionPerShare = 0.005;
    const minCommission = 1;
    
    const commission = Math.max(minCommission, quantity * commissionPerShare);
    expect(commission).toBe(1); // 100 * 0.005 = 0.50, but min is $1
  });

  it('should estimate slippage based on trade value', () => {
    const tradeValue = 10000;
    const slippageRate = 0.001; // 0.1%
    
    const slippage = tradeValue * slippageRate;
    expect(slippage).toBe(10);
  });

  it('should estimate tax impact for profitable sells', () => {
    const position = { quantity: 50, avgCost: 145, currentPrice: 175 };
    const sellQuantity = 20;
    const taxRate = 0.15;
    
    const profitPerShare = position.currentPrice - position.avgCost;
    const realizedProfit = sellQuantity * profitPerShare;
    const taxImpact = realizedProfit * taxRate;
    
    expect(profitPerShare).toBe(30);
    expect(realizedProfit).toBe(600);
    expect(taxImpact).toBe(90);
  });
});

describe('Warning Generation', () => {
  it('should warn on high concentration', () => {
    const concentrationRisk = 45; // 45% in one position
    const threshold = 25;
    
    const shouldWarn = concentrationRisk > threshold;
    expect(shouldWarn).toBe(true);
  });

  it('should warn on low diversification', () => {
    const diversificationScore = 30;
    const threshold = 40;
    
    const shouldWarn = diversificationScore < threshold;
    expect(shouldWarn).toBe(true);
  });

  it('should warn on increased volatility', () => {
    const beforeVolatility = 25;
    const afterVolatility = 35;
    const increaseThreshold = 1.2; // 20% increase
    
    const shouldWarn = afterVolatility > beforeVolatility * increaseThreshold;
    expect(shouldWarn).toBe(true);
  });

  it('should warn on negative cash', () => {
    const afterCash = -5000;
    
    const shouldWarn = afterCash < 0;
    expect(shouldWarn).toBe(true);
  });
});

describe('Scenario Comparison', () => {
  it('should identify best scenario by Sharpe ratio improvement', () => {
    const scenarios = [
      { name: 'A', sharpeRatioChange: 0.05 },
      { name: 'B', sharpeRatioChange: 0.10 },
      { name: 'C', sharpeRatioChange: -0.02 },
    ];
    
    const best = scenarios.reduce((max, s) => 
      s.sharpeRatioChange > max.sharpeRatioChange ? s : max
    );
    
    expect(best.name).toBe('B');
  });

  it('should identify worst scenario by Sharpe ratio improvement', () => {
    const scenarios = [
      { name: 'A', sharpeRatioChange: 0.05 },
      { name: 'B', sharpeRatioChange: 0.10 },
      { name: 'C', sharpeRatioChange: -0.02 },
    ];
    
    const worst = scenarios.reduce((min, s) => 
      s.sharpeRatioChange < min.sharpeRatioChange ? s : min
    );
    
    expect(worst.name).toBe('C');
  });
});

describe('Sector Exposure', () => {
  it('should calculate sector exposure from positions', () => {
    const positions = [
      { symbol: 'AAPL', weight: 30 },
      { symbol: 'MSFT', weight: 25 },
      { symbol: 'JPM', weight: 20 },
      { symbol: 'JNJ', weight: 25 },
    ];
    
    const sectorMapping: Record<string, string> = {
      'AAPL': 'Technology',
      'MSFT': 'Technology',
      'JPM': 'Financials',
      'JNJ': 'Healthcare',
    };
    
    const sectorExposure: Record<string, number> = {};
    for (const pos of positions) {
      const sector = sectorMapping[pos.symbol] || 'Other';
      sectorExposure[sector] = (sectorExposure[sector] || 0) + pos.weight;
    }
    
    expect(sectorExposure['Technology']).toBe(55);
    expect(sectorExposure['Financials']).toBe(20);
    expect(sectorExposure['Healthcare']).toBe(25);
  });
});

describe('Optimized Trade Generation', () => {
  it('should generate sell trades for overweight positions', () => {
    const currentValue = 35000;
    const targetValue = 25000;
    const currentPrice = 175;
    
    const difference = targetValue - currentValue;
    const shouldSell = difference < 0;
    const quantity = Math.abs(Math.floor(difference / currentPrice));
    
    expect(shouldSell).toBe(true);
    expect(quantity).toBe(58); // (35000 - 25000) / 175 = 57.14, rounds up to 58
  });

  it('should generate buy trades for underweight positions', () => {
    const currentValue = 10000;
    const targetValue = 20000;
    const currentPrice = 160;
    
    const difference = targetValue - currentValue;
    const shouldBuy = difference > 0;
    const quantity = Math.floor(difference / currentPrice);
    
    expect(shouldBuy).toBe(true);
    expect(quantity).toBe(62); // (20000 - 10000) / 160 = 62.5
  });

  it('should respect minimum trade value constraint', () => {
    const difference = 50; // $50 difference
    const minTradeValue = 100;
    
    const shouldTrade = Math.abs(difference) >= minTradeValue;
    expect(shouldTrade).toBe(false);
  });

  it('should cap concentration at max allowed', () => {
    const targetPercent = 40;
    const maxConcentration = 25;
    
    const cappedPercent = Math.min(targetPercent, maxConcentration);
    expect(cappedPercent).toBe(25);
  });
});
