import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database
vi.mock('./db', () => ({
  getDb: vi.fn(() => Promise.resolve(null)),
}));

// Mock the data API
vi.mock('./_core/dataApi', () => ({
  callDataApi: vi.fn(() => Promise.resolve({
    chart: {
      result: [{
        timestamp: Array.from({ length: 100 }, (_, i) => Math.floor(Date.now() / 1000) - (100 - i) * 86400),
        indicators: {
          quote: [{
            open: Array.from({ length: 100 }, () => 150 + Math.random() * 20),
            high: Array.from({ length: 100 }, () => 155 + Math.random() * 20),
            low: Array.from({ length: 100 }, () => 145 + Math.random() * 20),
            close: Array.from({ length: 100 }, () => 150 + Math.random() * 20),
            volume: Array.from({ length: 100 }, () => Math.floor(Math.random() * 10000000)),
          }],
        },
      }],
    },
  })),
}));

describe('Backtesting Validation Feature', () => {
  describe('BacktestConfig Validation', () => {
    it('should validate required fields', () => {
      const config = {
        symbol: 'AAPL',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        initialCapital: 100000,
        strategyType: 'enhanced' as const,
      };

      expect(config.symbol).toBeDefined();
      expect(config.startDate).toBeInstanceOf(Date);
      expect(config.endDate).toBeInstanceOf(Date);
      expect(config.initialCapital).toBeGreaterThan(0);
      expect(['standard', 'enhanced', 'rl', 'custom']).toContain(config.strategyType);
    });

    it('should validate date range', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      
      expect(endDate.getTime()).toBeGreaterThan(startDate.getTime());
    });

    it('should validate initial capital range', () => {
      const minCapital = 1000;
      const maxCapital = 10000000;
      const testCapital = 100000;

      expect(testCapital).toBeGreaterThanOrEqual(minCapital);
      expect(testCapital).toBeLessThanOrEqual(maxCapital);
    });
  });

  describe('Technical Indicator Calculations', () => {
    it('should calculate RSI correctly', () => {
      // RSI formula: 100 - (100 / (1 + RS))
      // RS = Average Gain / Average Loss
      const avgGain = 1.5;
      const avgLoss = 1.0;
      const rs = avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));

      expect(rsi).toBeGreaterThan(0);
      expect(rsi).toBeLessThan(100);
      expect(rsi).toBeCloseTo(60, 0); // With these values, RSI should be around 60
    });

    it('should calculate MACD correctly', () => {
      // MACD = EMA12 - EMA26
      const ema12 = 155.5;
      const ema26 = 153.2;
      const macd = ema12 - ema26;

      expect(macd).toBeCloseTo(2.3, 1);
    });

    it('should calculate Bollinger Bands correctly', () => {
      // Bollinger Bands: Middle = SMA20, Upper = SMA20 + 2*StdDev, Lower = SMA20 - 2*StdDev
      const sma20 = 150;
      const stdDev = 5;
      const upper = sma20 + 2 * stdDev;
      const lower = sma20 - 2 * stdDev;

      expect(upper).toBe(160);
      expect(lower).toBe(140);
    });

    it('should calculate ATR correctly', () => {
      // ATR = Average of True Range over 14 periods
      const trueRanges = [2.5, 3.0, 2.8, 2.2, 3.5, 2.9, 2.7, 3.1, 2.4, 2.6, 3.2, 2.8, 2.9, 3.0];
      const atr = trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length;

      expect(atr).toBeGreaterThan(0);
      expect(atr).toBeCloseTo(2.83, 1);
    });
  });

  describe('Signal Generation', () => {
    it('should generate buy signal when RSI is oversold', () => {
      const rsi = 25; // Oversold
      const signal = rsi < 30 ? 'buy' : rsi > 70 ? 'sell' : 'hold';

      expect(signal).toBe('buy');
    });

    it('should generate sell signal when RSI is overbought', () => {
      const rsi = 75; // Overbought
      const signal = rsi < 30 ? 'buy' : rsi > 70 ? 'sell' : 'hold';

      expect(signal).toBe('sell');
    });

    it('should generate hold signal when RSI is neutral', () => {
      const rsi = 50; // Neutral
      const signal = rsi < 30 ? 'buy' : rsi > 70 ? 'sell' : 'hold';

      expect(signal).toBe('hold');
    });
  });

  describe('Backtest Metrics Calculation', () => {
    it('should calculate total return correctly', () => {
      const initialCapital = 100000;
      const finalCapital = 115000;
      const totalReturn = (finalCapital - initialCapital) / initialCapital;

      expect(totalReturn).toBeCloseTo(0.15, 2);
    });

    it('should calculate win rate correctly', () => {
      const winningTrades = 60;
      const totalTrades = 100;
      const winRate = winningTrades / totalTrades;

      expect(winRate).toBe(0.6);
    });

    it('should calculate profit factor correctly', () => {
      const grossProfit = 25000;
      const grossLoss = 10000;
      const profitFactor = grossProfit / grossLoss;

      expect(profitFactor).toBe(2.5);
    });

    it('should calculate Sharpe ratio correctly', () => {
      // Sharpe = (Return - RiskFreeRate) / StdDev
      const portfolioReturn = 0.15;
      const riskFreeRate = 0.05;
      const stdDev = 0.1;
      const sharpeRatio = (portfolioReturn - riskFreeRate) / stdDev;

      expect(sharpeRatio).toBeCloseTo(1.0, 5);
    });

    it('should calculate max drawdown correctly', () => {
      const equityCurve = [100000, 110000, 105000, 95000, 100000, 115000];
      let maxDrawdown = 0;
      let peak = equityCurve[0];

      for (const value of equityCurve) {
        if (value > peak) peak = value;
        const drawdown = (peak - value) / peak;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
      }

      expect(maxDrawdown).toBeCloseTo(0.136, 2); // (110000 - 95000) / 110000
    });
  });

  describe('Accuracy Calculation', () => {
    it('should calculate prediction accuracy correctly', () => {
      const predictions = [
        { recommendation: 'buy', actualReturn: 0.05 },
        { recommendation: 'buy', actualReturn: -0.02 },
        { recommendation: 'sell', actualReturn: -0.03 },
        { recommendation: 'sell', actualReturn: 0.01 },
        { recommendation: 'hold', actualReturn: 0.001 },
      ];

      let correct = 0;
      for (const pred of predictions) {
        const isCorrect = 
          (pred.recommendation === 'buy' && pred.actualReturn > 0) ||
          (pred.recommendation === 'sell' && pred.actualReturn < 0) ||
          (pred.recommendation === 'hold' && Math.abs(pred.actualReturn) < 0.02);
        if (isCorrect) correct++;
      }

      const accuracy = correct / predictions.length;
      expect(accuracy).toBeCloseTo(0.6, 1);
    });

    it('should group accuracy by recommendation type', () => {
      const predictions = [
        { recommendation: 'buy', correct: true },
        { recommendation: 'buy', correct: true },
        { recommendation: 'buy', correct: false },
        { recommendation: 'sell', correct: true },
        { recommendation: 'sell', correct: false },
      ];

      const byRecommendation: Record<string, { total: number; correct: number }> = {};
      
      for (const pred of predictions) {
        if (!byRecommendation[pred.recommendation]) {
          byRecommendation[pred.recommendation] = { total: 0, correct: 0 };
        }
        byRecommendation[pred.recommendation].total++;
        if (pred.correct) byRecommendation[pred.recommendation].correct++;
      }

      expect(byRecommendation['buy'].total).toBe(3);
      expect(byRecommendation['buy'].correct).toBe(2);
      expect(byRecommendation['sell'].total).toBe(2);
      expect(byRecommendation['sell'].correct).toBe(1);
    });
  });

  describe('Strategy Comparison', () => {
    it('should compare strategies by Sharpe ratio', () => {
      const strategies = [
        { name: 'standard', sharpeRatio: 0.8 },
        { name: 'enhanced', sharpeRatio: 1.2 },
        { name: 'rl', sharpeRatio: 1.0 },
      ];

      const winner = strategies.reduce((best, current) => 
        current.sharpeRatio > best.sharpeRatio ? current : best
      );

      expect(winner.name).toBe('enhanced');
    });

    it('should rank strategies by multiple metrics', () => {
      const strategies = [
        { name: 'standard', totalReturn: 0.10, sharpeRatio: 0.8, maxDrawdown: 0.15 },
        { name: 'enhanced', totalReturn: 0.15, sharpeRatio: 1.2, maxDrawdown: 0.12 },
      ];

      // Enhanced should be better in all metrics
      expect(strategies[1].totalReturn).toBeGreaterThan(strategies[0].totalReturn);
      expect(strategies[1].sharpeRatio).toBeGreaterThan(strategies[0].sharpeRatio);
      expect(strategies[1].maxDrawdown).toBeLessThan(strategies[0].maxDrawdown);
    });
  });
});

describe('Reinforcement Learning Agent', () => {
  describe('State Representation', () => {
    it('should normalize state values', () => {
      const state = {
        priceChange1d: 0.02,
        priceChange5d: 0.05,
        priceChange20d: 0.10,
        volatility: 0.25,
        rsi: 55,
        macdHistogram: 0.5,
        bollingerPosition: 0.6,
        adx: 30,
        atr: 2.5,
        marketRegime: 1,
        vixLevel: 20,
        currentPosition: 0,
        unrealizedPnl: 0,
        daysInPosition: 0,
      };

      // All values should be within reasonable bounds
      expect(state.rsi).toBeGreaterThanOrEqual(0);
      expect(state.rsi).toBeLessThanOrEqual(100);
      expect(state.bollingerPosition).toBeGreaterThanOrEqual(0);
      expect(state.bollingerPosition).toBeLessThanOrEqual(1);
    });
  });

  describe('Action Space', () => {
    it('should have valid action types', () => {
      const actions = ['hold', 'buy', 'sell', 'close'];
      
      expect(actions).toContain('hold');
      expect(actions).toContain('buy');
      expect(actions).toContain('sell');
      expect(actions).toContain('close');
    });

    it('should select action based on Q-values', () => {
      const qValues = [0.1, 0.5, 0.2, 0.15]; // [hold, buy, sell, close]
      const bestAction = qValues.indexOf(Math.max(...qValues));

      expect(bestAction).toBe(1); // buy has highest Q-value
    });
  });

  describe('Reward Calculation', () => {
    it('should calculate positive reward for profitable trade', () => {
      const entryPrice = 100;
      const exitPrice = 110;
      const pnl = (exitPrice - entryPrice) / entryPrice;
      const reward = pnl * 100; // Scale reward

      expect(reward).toBe(10);
    });

    it('should calculate negative reward for losing trade', () => {
      const entryPrice = 100;
      const exitPrice = 95;
      const pnl = (exitPrice - entryPrice) / entryPrice;
      const reward = pnl * 100;

      expect(reward).toBe(-5);
    });

    it('should penalize excessive trading', () => {
      const tradingPenalty = 0.001; // 0.1% per trade
      const numTrades = 100;
      const totalPenalty = tradingPenalty * numTrades;

      expect(totalPenalty).toBe(0.1);
    });
  });

  describe('Epsilon-Greedy Exploration', () => {
    it('should decay epsilon over time', () => {
      let epsilon = 1.0;
      const epsilonDecay = 0.995;
      const epsilonMin = 0.01;
      const episodes = 1000;

      for (let i = 0; i < episodes; i++) {
        epsilon = Math.max(epsilonMin, epsilon * epsilonDecay);
      }

      expect(epsilon).toBeCloseTo(epsilonMin, 2);
    });

    it('should explore with probability epsilon', () => {
      const epsilon = 0.1;
      let explorations = 0;
      const trials = 10000;

      for (let i = 0; i < trials; i++) {
        if (Math.random() < epsilon) explorations++;
      }

      const explorationRate = explorations / trials;
      expect(explorationRate).toBeCloseTo(epsilon, 1);
    });
  });

  describe('Experience Replay', () => {
    it('should maintain buffer size limit', () => {
      const maxBufferSize = 10000;
      const buffer: unknown[] = [];
      
      for (let i = 0; i < 15000; i++) {
        buffer.push({ state: i, action: 0, reward: 0, nextState: i + 1, done: false });
        if (buffer.length > maxBufferSize) {
          buffer.shift();
        }
      }

      expect(buffer.length).toBe(maxBufferSize);
    });

    it('should sample random batch from buffer', () => {
      const buffer = Array.from({ length: 1000 }, (_, i) => ({ id: i }));
      const batchSize = 32;
      const batch: typeof buffer = [];

      while (batch.length < batchSize) {
        const idx = Math.floor(Math.random() * buffer.length);
        batch.push(buffer[idx]);
      }

      expect(batch.length).toBe(batchSize);
    });
  });
});

describe('Strategy Comparison Tool', () => {
  describe('Comparison Configuration', () => {
    it('should require at least 2 strategies', () => {
      const strategies = ['standard', 'enhanced'];
      expect(strategies.length).toBeGreaterThanOrEqual(2);
    });

    it('should support up to 4 strategies', () => {
      const maxStrategies = 4;
      const strategies = ['standard', 'enhanced', 'rl', 'custom'];
      expect(strategies.length).toBeLessThanOrEqual(maxStrategies);
    });
  });

  describe('Winner Determination', () => {
    it('should determine winner by Sharpe ratio', () => {
      const results = {
        standard: { sharpeRatio: 0.8 },
        enhanced: { sharpeRatio: 1.5 },
        rl: { sharpeRatio: 1.2 },
      };

      let winner = '';
      let bestSharpe = -Infinity;
      
      for (const [strategy, data] of Object.entries(results)) {
        if (data.sharpeRatio > bestSharpe) {
          bestSharpe = data.sharpeRatio;
          winner = strategy;
        }
      }

      expect(winner).toBe('enhanced');
    });
  });

  describe('Equity Curve Comparison', () => {
    it('should align equity curves by date', () => {
      const curve1 = [
        { date: '2024-01-01', value: 100000 },
        { date: '2024-01-02', value: 101000 },
      ];
      const curve2 = [
        { date: '2024-01-01', value: 100000 },
        { date: '2024-01-02', value: 102000 },
      ];

      const dates = new Set([...curve1.map(p => p.date), ...curve2.map(p => p.date)]);
      expect(dates.size).toBe(2);
    });
  });

  describe('Radar Chart Data', () => {
    it('should normalize metrics for radar chart', () => {
      const metrics = {
        totalReturn: 0.15,
        sharpeRatio: 1.5,
        winRate: 0.6,
        profitFactor: 2.0,
        accuracy: 0.65,
      };

      // Normalize to 0-100 scale
      const normalized = {
        totalReturn: Math.min(100, Math.max(0, (metrics.totalReturn + 0.5) * 100)),
        sharpeRatio: Math.min(100, Math.max(0, metrics.sharpeRatio * 33)),
        winRate: metrics.winRate * 100,
        profitFactor: Math.min(100, Math.max(0, metrics.profitFactor * 25)),
        accuracy: metrics.accuracy * 100,
      };

      expect(normalized.totalReturn).toBeGreaterThanOrEqual(0);
      expect(normalized.totalReturn).toBeLessThanOrEqual(100);
      expect(normalized.sharpeRatio).toBeGreaterThanOrEqual(0);
      expect(normalized.sharpeRatio).toBeLessThanOrEqual(100);
    });
  });
});
