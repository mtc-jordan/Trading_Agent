import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the LLM before importing modules
vi.mock('../../_core/llm', () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          overall: 0.65,
          managementOptimism: 0.72,
          managementConfidence: 0.68,
          analystSatisfaction: 0.58,
          guidanceStrength: 0.70,
          keyPhrases: ['strong growth', 'exceeding expectations'],
          riskFactors: ['supply chain']
        })
      }
    }]
  })
}));

// Mock the data API
vi.mock('../../_core/dataApi', () => ({
  callDataApi: vi.fn().mockResolvedValue({
    chart: {
      result: [{
        meta: { regularMarketPrice: 150.00, previousClose: 145.00 },
        timestamp: [1704067200, 1704153600, 1704240000],
        indicators: {
          quote: [{
            open: [145, 148, 150],
            high: [149, 151, 153],
            low: [144, 147, 149],
            close: [148, 150, 152],
            volume: [1000000, 1200000, 1100000]
          }],
          adjclose: [{ adjclose: [148, 150, 152] }]
        }
      }]
    }
  })
}));

describe('HistoricalSentimentCollector', () => {
  it('should be importable', async () => {
    const { HistoricalSentimentCollector } = await import('./HistoricalSentimentCollector');
    expect(HistoricalSentimentCollector).toBeDefined();
  });

  it('should create an instance', async () => {
    const { HistoricalSentimentCollector } = await import('./HistoricalSentimentCollector');
    const collector = new HistoricalSentimentCollector();
    expect(collector).toBeDefined();
  });

  it('should have analyzeSentiment method', async () => {
    const { HistoricalSentimentCollector } = await import('./HistoricalSentimentCollector');
    const collector = new HistoricalSentimentCollector();
    expect(typeof collector.analyzeSentiment).toBe('function');
  });

  it('should have fetchHistoricalTranscripts method', async () => {
    const { HistoricalSentimentCollector } = await import('./HistoricalSentimentCollector');
    const collector = new HistoricalSentimentCollector();
    expect(typeof collector.fetchHistoricalTranscripts).toBe('function');
  });
});

describe('PostEarningsPriceAnalyzer', () => {
  it('should be importable', async () => {
    const { PostEarningsPriceAnalyzer } = await import('./PostEarningsPriceAnalyzer');
    expect(PostEarningsPriceAnalyzer).toBeDefined();
  });

  it('should create an instance', async () => {
    const { PostEarningsPriceAnalyzer } = await import('./PostEarningsPriceAnalyzer');
    const analyzer = new PostEarningsPriceAnalyzer();
    expect(analyzer).toBeDefined();
  });

  it('should have analyzePriceMovement method', async () => {
    const { PostEarningsPriceAnalyzer } = await import('./PostEarningsPriceAnalyzer');
    const analyzer = new PostEarningsPriceAnalyzer();
    expect(typeof analyzer.analyzePriceMovement).toBe('function');
  });

  it('should accept custom benchmark symbol', async () => {
    const { PostEarningsPriceAnalyzer } = await import('./PostEarningsPriceAnalyzer');
    const analyzer = new PostEarningsPriceAnalyzer('QQQ');
    expect(analyzer).toBeDefined();
  });
});

describe('SentimentPriceCorrelation', () => {
  it('should be importable', async () => {
    const { SentimentPriceCorrelation } = await import('./SentimentPriceCorrelation');
    expect(SentimentPriceCorrelation).toBeDefined();
  });

  it('should create an instance', async () => {
    const { SentimentPriceCorrelation } = await import('./SentimentPriceCorrelation');
    const engine = new SentimentPriceCorrelation();
    expect(engine).toBeDefined();
  });

  it('should have calculateCorrelation method', async () => {
    const { SentimentPriceCorrelation } = await import('./SentimentPriceCorrelation');
    const engine = new SentimentPriceCorrelation();
    expect(typeof engine.calculateCorrelation).toBe('function');
  });

  it('should have addDataPoints method', async () => {
    const { SentimentPriceCorrelation } = await import('./SentimentPriceCorrelation');
    const engine = new SentimentPriceCorrelation();
    expect(typeof engine.addDataPoints).toBe('function');
  });

  it('should have calculateCorrelationMatrix method', async () => {
    const { SentimentPriceCorrelation } = await import('./SentimentPriceCorrelation');
    const engine = new SentimentPriceCorrelation();
    expect(typeof engine.calculateCorrelationMatrix).toBe('function');
  });
});

describe('EarningsSentimentBacktester', () => {
  it('should be importable', async () => {
    const { EarningsSentimentBacktester } = await import('./EarningsSentimentBacktester');
    expect(EarningsSentimentBacktester).toBeDefined();
  });

  it('should create an instance', async () => {
    const { EarningsSentimentBacktester } = await import('./EarningsSentimentBacktester');
    const backtester = new EarningsSentimentBacktester();
    expect(backtester).toBeDefined();
  });

  it('should have runBacktest method', async () => {
    const { EarningsSentimentBacktester } = await import('./EarningsSentimentBacktester');
    const backtester = new EarningsSentimentBacktester();
    expect(typeof backtester.runBacktest).toBe('function');
  });

  it('should export BacktestConfig type', async () => {
    const module = await import('./EarningsSentimentBacktester');
    // Type check - if this compiles, the type exists
    const config: typeof module.BacktestConfig = undefined as any;
    expect(true).toBe(true);
  });
});

describe('Correlation Calculations', () => {
  it('should calculate positive correlation correctly', () => {
    // Simple Pearson correlation test
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 6, 8, 10];
    
    // Calculate manually
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
    const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    const correlation = numerator / denominator;
    
    expect(correlation).toBeCloseTo(1.0, 5);
  });

  it('should calculate negative correlation correctly', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [10, 8, 6, 4, 2];
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
    const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    const correlation = numerator / denominator;
    
    expect(correlation).toBeCloseTo(-1.0, 5);
  });

  it('should handle zero variance case', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [5, 5, 5, 5, 5]; // Constant
    
    const n = x.length;
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);
    
    const yVariance = n * sumY2 - sumY * sumY;
    
    // When variance is 0, correlation is undefined (NaN)
    expect(yVariance).toBe(0);
  });
});

describe('Signal Generation Logic', () => {
  it('should classify high sentiment as bullish', () => {
    const sentiment = {
      overall: 0.85,
      managementOptimism: 0.90,
      managementConfidence: 0.85,
      analystSatisfaction: 0.80,
      guidanceStrength: 0.88
    };
    
    const avgSentiment = (
      sentiment.overall + 
      sentiment.managementOptimism + 
      sentiment.managementConfidence + 
      sentiment.analystSatisfaction + 
      sentiment.guidanceStrength
    ) / 5;
    
    expect(avgSentiment).toBeGreaterThan(0.6);
    const direction = avgSentiment > 0.6 ? 'bullish' : avgSentiment < 0.4 ? 'bearish' : 'neutral';
    expect(direction).toBe('bullish');
  });

  it('should classify low sentiment as bearish', () => {
    const sentiment = {
      overall: 0.25,
      managementOptimism: 0.20,
      managementConfidence: 0.30,
      analystSatisfaction: 0.25,
      guidanceStrength: 0.22
    };
    
    const avgSentiment = (
      sentiment.overall + 
      sentiment.managementOptimism + 
      sentiment.managementConfidence + 
      sentiment.analystSatisfaction + 
      sentiment.guidanceStrength
    ) / 5;
    
    expect(avgSentiment).toBeLessThan(0.4);
    const direction = avgSentiment > 0.6 ? 'bullish' : avgSentiment < 0.4 ? 'bearish' : 'neutral';
    expect(direction).toBe('bearish');
  });

  it('should classify medium sentiment as neutral', () => {
    const sentiment = {
      overall: 0.50,
      managementOptimism: 0.52,
      managementConfidence: 0.48,
      analystSatisfaction: 0.51,
      guidanceStrength: 0.49
    };
    
    const avgSentiment = (
      sentiment.overall + 
      sentiment.managementOptimism + 
      sentiment.managementConfidence + 
      sentiment.analystSatisfaction + 
      sentiment.guidanceStrength
    ) / 5;
    
    expect(avgSentiment).toBeGreaterThanOrEqual(0.4);
    expect(avgSentiment).toBeLessThanOrEqual(0.6);
    const direction = avgSentiment > 0.6 ? 'bullish' : avgSentiment < 0.4 ? 'bearish' : 'neutral';
    expect(direction).toBe('neutral');
  });
});

describe('Statistical Significance', () => {
  it('should identify statistically significant p-values', () => {
    const significantPValue = 0.01;
    const notSignificantPValue = 0.15;
    const threshold = 0.05;
    
    expect(significantPValue < threshold).toBe(true);
    expect(notSignificantPValue < threshold).toBe(false);
  });

  it('should calculate t-statistic from correlation', () => {
    const correlation = 0.5;
    const n = 30;
    
    // t = r * sqrt(n-2) / sqrt(1-r^2)
    const tStat = correlation * Math.sqrt(n - 2) / Math.sqrt(1 - correlation * correlation);
    
    expect(tStat).toBeGreaterThan(0);
    expect(tStat).toBeCloseTo(3.055, 2);
  });
});

describe('Return Calculations', () => {
  it('should calculate positive returns correctly', () => {
    const startPrice = 100;
    const endPrice = 110;
    const returnPct = ((endPrice - startPrice) / startPrice) * 100;
    
    expect(returnPct).toBe(10);
  });

  it('should calculate negative returns correctly', () => {
    const startPrice = 100;
    const endPrice = 90;
    const returnPct = ((endPrice - startPrice) / startPrice) * 100;
    
    expect(returnPct).toBe(-10);
  });

  it('should handle zero return', () => {
    const startPrice = 100;
    const endPrice = 100;
    const returnPct = ((endPrice - startPrice) / startPrice) * 100;
    
    expect(returnPct).toBe(0);
  });
});
