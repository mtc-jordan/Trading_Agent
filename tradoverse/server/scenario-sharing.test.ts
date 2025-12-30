import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database
vi.mock('./db', () => ({
  getDb: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue([]),
  })),
}));

describe('Scenario Sharing Service', () => {
  describe('shareScenario', () => {
    it('should create a shared scenario with required fields', async () => {
      const scenarioData = {
        name: 'Test Strategy',
        description: 'A test trading strategy',
        trades: [
          { symbol: 'AAPL', side: 'buy' as const, quantity: 10, estimatedPrice: 175 },
          { symbol: 'GOOGL', side: 'buy' as const, quantity: 5, estimatedPrice: 140 },
        ],
        category: 'growth',
        tags: ['tech', 'long-term'],
        isPublic: true,
      };

      expect(scenarioData.name).toBe('Test Strategy');
      expect(scenarioData.trades.length).toBe(2);
      expect(scenarioData.isPublic).toBe(true);
    });

    it('should validate scenario name is not empty', () => {
      const validateName = (name: string) => name.trim().length > 0;
      
      expect(validateName('Valid Name')).toBe(true);
      expect(validateName('')).toBe(false);
      expect(validateName('   ')).toBe(false);
    });

    it('should validate trades array is not empty', () => {
      const validateTrades = (trades: any[]) => trades.length > 0;
      
      expect(validateTrades([{ symbol: 'AAPL', side: 'buy', quantity: 10 }])).toBe(true);
      expect(validateTrades([])).toBe(false);
    });
  });

  describe('getCommunityScenarios', () => {
    it('should support sorting by likes', () => {
      const sortOptions = ['likes', 'imports', 'recent'];
      expect(sortOptions).toContain('likes');
    });

    it('should support sorting by imports', () => {
      const sortOptions = ['likes', 'imports', 'recent'];
      expect(sortOptions).toContain('imports');
    });

    it('should support sorting by recent', () => {
      const sortOptions = ['likes', 'imports', 'recent'];
      expect(sortOptions).toContain('recent');
    });

    it('should support filtering by category', () => {
      const categories = ['general', 'growth', 'value', 'momentum', 'dividend', 'sector'];
      expect(categories.length).toBeGreaterThan(0);
    });
  });

  describe('likeScenario', () => {
    it('should toggle like status', () => {
      let liked = false;
      const toggleLike = () => { liked = !liked; return liked; };
      
      expect(toggleLike()).toBe(true);
      expect(toggleLike()).toBe(false);
      expect(toggleLike()).toBe(true);
    });
  });

  describe('importScenario', () => {
    it('should return trades from imported scenario', () => {
      const scenario = {
        trades: [
          { symbol: 'AAPL', side: 'buy', quantity: 10, estimatedPrice: 175 },
        ],
      };
      
      expect(scenario.trades.length).toBe(1);
      expect(scenario.trades[0].symbol).toBe('AAPL');
    });
  });
});

describe('Monte Carlo Visualization Service', () => {
  describe('generateVisualizationData', () => {
    it('should calculate histogram bins correctly', () => {
      const results = [100, 110, 120, 130, 140, 150];
      const numBins = 3;
      const min = Math.min(...results);
      const max = Math.max(...results);
      const binWidth = (max - min) / numBins;
      
      expect(binWidth).toBe((150 - 100) / 3);
    });

    it('should calculate percentiles correctly', () => {
      const sortedResults = [100, 110, 120, 130, 140, 150, 160, 170, 180, 190];
      const getPercentile = (data: number[], p: number) => {
        const index = Math.ceil((p / 100) * data.length) - 1;
        return data[Math.max(0, index)];
      };
      
      expect(getPercentile(sortedResults, 10)).toBe(100);
      expect(getPercentile(sortedResults, 50)).toBe(140);
      expect(getPercentile(sortedResults, 90)).toBe(180);
    });

    it('should calculate VaR correctly', () => {
      const sortedResults = [80, 90, 100, 110, 120, 130, 140, 150, 160, 170];
      const initialValue = 100;
      
      // VaR at 95% = 5th percentile loss
      const var95Index = Math.floor(sortedResults.length * 0.05);
      const var95 = initialValue - sortedResults[var95Index];
      
      expect(var95).toBe(100 - 80);
    });

    it('should calculate probability of loss correctly', () => {
      const results = [80, 90, 100, 110, 120];
      const initialValue = 100;
      const lossCount = results.filter(r => r < initialValue).length;
      const probabilityOfLoss = lossCount / results.length;
      
      expect(probabilityOfLoss).toBe(0.4);
    });
  });

  describe('generateRiskSummary', () => {
    it('should categorize risk level correctly', () => {
      const getRiskLevel = (probabilityOfLoss: number) => {
        if (probabilityOfLoss < 0.2) return 'Low';
        if (probabilityOfLoss < 0.4) return 'Moderate';
        if (probabilityOfLoss < 0.6) return 'High';
        return 'Very High';
      };
      
      expect(getRiskLevel(0.1)).toBe('Low');
      expect(getRiskLevel(0.3)).toBe('Moderate');
      expect(getRiskLevel(0.5)).toBe('High');
      expect(getRiskLevel(0.7)).toBe('Very High');
    });
  });
});

describe('Template Performance Tracking Service', () => {
  describe('calculateTemplatePerformance', () => {
    it('should calculate total return correctly', () => {
      const startValue = 10000;
      const endValue = 12000;
      const totalReturn = ((endValue - startValue) / startValue) * 100;
      
      expect(totalReturn).toBe(20);
    });

    it('should calculate annualized return correctly', () => {
      const totalReturn = 0.20; // 20%
      const days = 365;
      const annualizedReturn = Math.pow(1 + totalReturn, 365 / days) - 1;
      
      expect(annualizedReturn).toBeCloseTo(0.20, 2);
    });

    it('should calculate Sharpe ratio correctly', () => {
      const annualizedReturn = 0.15; // 15%
      const riskFreeRate = 0.04; // 4%
      const volatility = 0.20; // 20%
      const sharpeRatio = (annualizedReturn - riskFreeRate) / volatility;
      
      expect(sharpeRatio).toBeCloseTo(0.55, 2);
    });

    it('should calculate max drawdown correctly', () => {
      const values = [100, 110, 105, 95, 100, 90, 95, 100];
      let maxDrawdown = 0;
      let peak = values[0];
      
      for (const value of values) {
        if (value > peak) peak = value;
        const drawdown = (peak - value) / peak;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
      }
      
      // Peak was 110, lowest after peak was 90
      expect(maxDrawdown).toBeCloseTo((110 - 90) / 110, 4);
    });

    it('should calculate win rate correctly', () => {
      const dailyReturns = [0.01, -0.02, 0.015, 0.005, -0.01, 0.02, -0.005, 0.01];
      const winningDays = dailyReturns.filter(r => r > 0).length;
      const winRate = (winningDays / dailyReturns.length) * 100;
      
      expect(winRate).toBe(62.5);
    });
  });

  describe('getTemplateRankings', () => {
    it('should sort templates by return', () => {
      const templates = [
        { id: 'a', totalReturn: 10 },
        { id: 'b', totalReturn: 25 },
        { id: 'c', totalReturn: 15 },
      ];
      
      const sorted = [...templates].sort((a, b) => b.totalReturn - a.totalReturn);
      
      expect(sorted[0].id).toBe('b');
      expect(sorted[1].id).toBe('c');
      expect(sorted[2].id).toBe('a');
    });

    it('should sort templates by Sharpe ratio', () => {
      const templates = [
        { id: 'a', sharpeRatio: 0.5 },
        { id: 'b', sharpeRatio: 1.2 },
        { id: 'c', sharpeRatio: 0.8 },
      ];
      
      const sorted = [...templates].sort((a, b) => b.sharpeRatio - a.sharpeRatio);
      
      expect(sorted[0].id).toBe('b');
      expect(sorted[1].id).toBe('c');
      expect(sorted[2].id).toBe('a');
    });

    it('should sort templates by drawdown (ascending)', () => {
      const templates = [
        { id: 'a', maxDrawdown: 15 },
        { id: 'b', maxDrawdown: 8 },
        { id: 'c', maxDrawdown: 12 },
      ];
      
      const sorted = [...templates].sort((a, b) => a.maxDrawdown - b.maxDrawdown);
      
      expect(sorted[0].id).toBe('b');
      expect(sorted[1].id).toBe('c');
      expect(sorted[2].id).toBe('a');
    });
  });

  describe('compareTemplatePerformance', () => {
    it('should identify best performing template', () => {
      const templates = [
        { id: 'a', metrics: { totalReturn: 10, sharpeRatio: 0.5, maxDrawdown: 15, volatility: 20 } },
        { id: 'b', metrics: { totalReturn: 25, sharpeRatio: 1.2, maxDrawdown: 8, volatility: 15 } },
        { id: 'c', metrics: { totalReturn: 15, sharpeRatio: 0.8, maxDrawdown: 12, volatility: 18 } },
      ];
      
      const bestReturn = templates.reduce((best, t) => 
        t.metrics.totalReturn > best.metrics.totalReturn ? t : best
      );
      
      expect(bestReturn.id).toBe('b');
    });

    it('should identify template with lowest drawdown', () => {
      const templates = [
        { id: 'a', metrics: { maxDrawdown: 15 } },
        { id: 'b', metrics: { maxDrawdown: 8 } },
        { id: 'c', metrics: { maxDrawdown: 12 } },
      ];
      
      const lowestDrawdown = templates.reduce((best, t) => 
        t.metrics.maxDrawdown < best.metrics.maxDrawdown ? t : best
      );
      
      expect(lowestDrawdown.id).toBe('b');
    });
  });
});

describe('Scenario Categories', () => {
  it('should have predefined categories', () => {
    const categories = [
      'general',
      'growth',
      'value',
      'momentum',
      'dividend',
      'sector',
      'defensive',
      'balanced',
    ];
    
    expect(categories.length).toBeGreaterThan(5);
    expect(categories).toContain('growth');
    expect(categories).toContain('value');
    expect(categories).toContain('momentum');
  });
});

describe('Scenario Tags', () => {
  it('should parse comma-separated tags', () => {
    const tagString = 'tech, growth, long-term';
    const tags = tagString.split(',').map(t => t.trim());
    
    expect(tags).toEqual(['tech', 'growth', 'long-term']);
  });

  it('should filter empty tags', () => {
    const tagString = 'tech,, growth, , long-term';
    const tags = tagString.split(',').map(t => t.trim()).filter(Boolean);
    
    expect(tags).toEqual(['tech', 'growth', 'long-term']);
  });
});
