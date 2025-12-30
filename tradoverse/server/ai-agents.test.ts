/**
 * Tests for AI Agent System
 * 
 * Tests cover:
 * - Technical indicators calculations
 * - Agent orchestrator consensus mechanism
 * - Crypto-specific agent analysis
 * - Agentic trading bot functionality
 */

import { describe, it, expect, vi } from 'vitest';
import {
  calculateEMA,
  calculateSMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateATR,
  calculateStochastic,
  calculateOBV,
  calculateVWAP,
  detectCandlestickPatterns,
  calculateAllIndicators,
  type OHLCV,
} from './services/ai-agents/TechnicalIndicators';

import {
  AgenticTradingBot,
  createTradingBot,
  BotPresets,
  type BotConfiguration,
} from './services/ai-agents/AgenticTradingBot';

// Sample OHLCV data for testing
const sampleCandles: OHLCV[] = [
  { timestamp: 1, open: 100, high: 105, low: 98, close: 103, volume: 1000 },
  { timestamp: 2, open: 103, high: 108, low: 101, close: 106, volume: 1200 },
  { timestamp: 3, open: 106, high: 110, low: 104, close: 108, volume: 1100 },
  { timestamp: 4, open: 108, high: 112, low: 106, close: 110, volume: 1300 },
  { timestamp: 5, open: 110, high: 115, low: 108, close: 113, volume: 1400 },
  { timestamp: 6, open: 113, high: 118, low: 111, close: 116, volume: 1500 },
  { timestamp: 7, open: 116, high: 120, low: 114, close: 118, volume: 1600 },
  { timestamp: 8, open: 118, high: 122, low: 115, close: 120, volume: 1700 },
  { timestamp: 9, open: 120, high: 125, low: 118, close: 123, volume: 1800 },
  { timestamp: 10, open: 123, high: 128, low: 121, close: 126, volume: 1900 },
  { timestamp: 11, open: 126, high: 130, low: 124, close: 128, volume: 2000 },
  { timestamp: 12, open: 128, high: 132, low: 126, close: 130, volume: 2100 },
  { timestamp: 13, open: 130, high: 135, low: 128, close: 133, volume: 2200 },
  { timestamp: 14, open: 133, high: 138, low: 131, close: 136, volume: 2300 },
  { timestamp: 15, open: 136, high: 140, low: 134, close: 138, volume: 2400 },
  { timestamp: 16, open: 138, high: 142, low: 136, close: 140, volume: 2500 },
  { timestamp: 17, open: 140, high: 145, low: 138, close: 143, volume: 2600 },
  { timestamp: 18, open: 143, high: 148, low: 141, close: 146, volume: 2700 },
  { timestamp: 19, open: 146, high: 150, low: 144, close: 148, volume: 2800 },
  { timestamp: 20, open: 148, high: 152, low: 146, close: 150, volume: 2900 },
];

describe('Technical Indicators', () => {
  describe('calculateSMA', () => {
    it('should calculate simple moving average correctly', () => {
      const closes = [10, 20, 30, 40, 50];
      const sma = calculateSMA(closes, 3);
      
      expect(sma).toHaveLength(3);
      expect(sma[0]).toBe(20); // (10+20+30)/3
      expect(sma[1]).toBe(30); // (20+30+40)/3
      expect(sma[2]).toBe(40); // (30+40+50)/3
    });

    it('should return empty array if data length is less than period', () => {
      const closes = [10, 20];
      const sma = calculateSMA(closes, 5);
      
      expect(sma).toHaveLength(0);
    });
  });

  describe('calculateEMA', () => {
    it('should calculate exponential moving average', () => {
      const closes = sampleCandles.map(c => c.close);
      const ema = calculateEMA(closes, 5);
      
      expect(ema.length).toBeGreaterThan(0);
      expect(ema[0]).toBeCloseTo(108, 0); // First EMA is SMA
    });

    it('should return empty array for insufficient data', () => {
      const closes = [100, 101, 102];
      const ema = calculateEMA(closes, 5);
      
      expect(ema).toHaveLength(0);
    });
  });

  describe('calculateRSI', () => {
    it('should calculate RSI values between 0 and 100', () => {
      const closes = sampleCandles.map(c => c.close);
      const rsi = calculateRSI(closes, 14);
      
      expect(rsi.length).toBeGreaterThan(0);
      rsi.forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      });
    });

    it('should show high RSI for uptrending data', () => {
      const closes = sampleCandles.map(c => c.close);
      const rsi = calculateRSI(closes, 14);
      
      // Uptrending data should have RSI > 50
      if (rsi.length > 0) {
        expect(rsi[rsi.length - 1]).toBeGreaterThan(50);
      }
    });
  });

  describe('calculateMACD', () => {
    it('should calculate MACD, signal, and histogram', () => {
      const closes = sampleCandles.map(c => c.close);
      const macd = calculateMACD(closes, 12, 26, 9);
      
      expect(macd).toHaveProperty('macd');
      expect(macd).toHaveProperty('signal');
      expect(macd).toHaveProperty('histogram');
    });
  });

  describe('calculateBollingerBands', () => {
    it('should calculate upper, middle, and lower bands', () => {
      const closes = sampleCandles.map(c => c.close);
      const bb = calculateBollingerBands(closes, 10, 2);
      
      expect(bb).toHaveProperty('upper');
      expect(bb).toHaveProperty('middle');
      expect(bb).toHaveProperty('lower');
      
      // Upper should be above middle, middle above lower
      if (bb.upper.length > 0) {
        expect(bb.upper[0]).toBeGreaterThan(bb.middle[0]);
        expect(bb.middle[0]).toBeGreaterThan(bb.lower[0]);
      }
    });
  });

  describe('calculateATR', () => {
    it('should calculate Average True Range', () => {
      const atr = calculateATR(sampleCandles, 14);
      
      expect(atr.length).toBeGreaterThan(0);
      atr.forEach(value => {
        expect(value).toBeGreaterThan(0);
      });
    });
  });

  describe('calculateStochastic', () => {
    it('should calculate %K and %D values between 0 and 100', () => {
      const stoch = calculateStochastic(sampleCandles, 14, 3);
      
      expect(stoch).toHaveProperty('k');
      expect(stoch).toHaveProperty('d');
      
      stoch.k.forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('calculateOBV', () => {
    it('should calculate On-Balance Volume', () => {
      const obv = calculateOBV(sampleCandles);
      
      expect(obv.length).toBe(sampleCandles.length);
      expect(obv[0]).toBe(0); // First OBV is 0
    });

    it('should increase OBV on up days', () => {
      const obv = calculateOBV(sampleCandles);
      
      // Since our sample data is uptrending, OBV should generally increase
      expect(obv[obv.length - 1]).toBeGreaterThan(obv[0]);
    });
  });

  describe('calculateVWAP', () => {
    it('should calculate Volume Weighted Average Price', () => {
      const vwap = calculateVWAP(sampleCandles);
      
      expect(vwap.length).toBe(sampleCandles.length);
      vwap.forEach(value => {
        expect(value).toBeGreaterThan(0);
      });
    });
  });

  describe('detectCandlestickPatterns', () => {
    it('should detect candlestick patterns', () => {
      const patterns = detectCandlestickPatterns(sampleCandles);
      
      expect(Array.isArray(patterns)).toBe(true);
      patterns.forEach(pattern => {
        expect(pattern).toHaveProperty('name');
        expect(pattern).toHaveProperty('type');
        expect(pattern).toHaveProperty('reliability');
        expect(pattern).toHaveProperty('index');
        expect(['bullish', 'bearish', 'neutral']).toContain(pattern.type);
      });
    });
  });

  describe('calculateAllIndicators', () => {
    it('should calculate all indicators at once', () => {
      const indicators = calculateAllIndicators(sampleCandles);
      
      expect(indicators).toHaveProperty('ema');
      expect(indicators).toHaveProperty('rsi');
      expect(indicators).toHaveProperty('macd');
      expect(indicators).toHaveProperty('bollinger');
      expect(indicators).toHaveProperty('atr');
      expect(indicators).toHaveProperty('stochastic');
      expect(indicators).toHaveProperty('williamsR');
      expect(indicators).toHaveProperty('cci');
      expect(indicators).toHaveProperty('adx');
      expect(indicators).toHaveProperty('obv');
      expect(indicators).toHaveProperty('vwap');
      expect(indicators).toHaveProperty('parabolicSar');
      expect(indicators).toHaveProperty('patterns');
    });
  });
});

describe('Agentic Trading Bot', () => {
  const testConfig: BotConfiguration = {
    name: 'Test Bot',
    userId: 'user123',
    assetType: 'stock',
    symbols: ['AAPL', 'GOOGL'],
    riskTolerance: 'moderate',
    maxDrawdown: 0.15,
    maxPositionSize: 0.10,
    enableAutoTrade: false,
    minConfidenceThreshold: 70,
    consensusRequirement: 'majority',
  };

  describe('createTradingBot', () => {
    it('should create a new trading bot with config', () => {
      const bot = createTradingBot(testConfig);
      
      expect(bot).toBeInstanceOf(AgenticTradingBot);
      expect(bot.getConfig()).toEqual(testConfig);
    });
  });

  describe('Bot State', () => {
    it('should initialize with default state', () => {
      const bot = createTradingBot(testConfig);
      const state = bot.getState();
      
      expect(state.isRunning).toBe(false);
      expect(state.totalSignals).toBe(0);
      expect(state.successfulTrades).toBe(0);
      expect(state.failedTrades).toBe(0);
    });

    it('should start and stop correctly', () => {
      const bot = createTradingBot(testConfig);
      
      bot.start();
      expect(bot.getState().isRunning).toBe(true);
      
      bot.stop();
      expect(bot.getState().isRunning).toBe(false);
    });
  });

  describe('Bot Configuration', () => {
    it('should update configuration', () => {
      const bot = createTradingBot(testConfig);
      
      bot.updateConfig({ maxDrawdown: 0.20 });
      
      expect(bot.getConfig().maxDrawdown).toBe(0.20);
      expect(bot.getConfig().name).toBe('Test Bot'); // Other fields unchanged
    });
  });

  describe('Bot Statistics', () => {
    it('should calculate statistics correctly', () => {
      const bot = createTradingBot(testConfig);
      const stats = bot.getStatistics();
      
      expect(stats).toHaveProperty('winRate');
      expect(stats).toHaveProperty('totalTrades');
      expect(stats).toHaveProperty('agentPerformance');
      expect(stats).toHaveProperty('bestAgent');
      expect(stats).toHaveProperty('worstAgent');
    });

    it('should have initial win rate of 0', () => {
      const bot = createTradingBot(testConfig);
      const stats = bot.getStatistics();
      
      expect(stats.winRate).toBe(0);
      expect(stats.totalTrades).toBe(0);
    });
  });

  describe('Recent Signals', () => {
    it('should return empty array initially', () => {
      const bot = createTradingBot(testConfig);
      const signals = bot.getRecentSignals();
      
      expect(signals).toEqual([]);
    });
  });
});

describe('Bot Presets', () => {
  it('should have conservative preset', () => {
    expect(BotPresets.conservative).toBeDefined();
    expect(BotPresets.conservative.riskTolerance).toBe('conservative');
    expect(BotPresets.conservative.maxDrawdown).toBe(0.10);
    expect(BotPresets.conservative.consensusRequirement).toBe('supermajority');
  });

  it('should have moderate preset', () => {
    expect(BotPresets.moderate).toBeDefined();
    expect(BotPresets.moderate.riskTolerance).toBe('moderate');
    expect(BotPresets.moderate.maxDrawdown).toBe(0.15);
    expect(BotPresets.moderate.consensusRequirement).toBe('majority');
  });

  it('should have aggressive preset', () => {
    expect(BotPresets.aggressive).toBeDefined();
    expect(BotPresets.aggressive.riskTolerance).toBe('aggressive');
    expect(BotPresets.aggressive.maxDrawdown).toBe(0.25);
    expect(BotPresets.aggressive.consensusRequirement).toBe('majority');
  });
});

describe('Agent Accuracy Updates', () => {
  const accuracyTestConfig: BotConfiguration = {
    name: 'Accuracy Test Bot',
    userId: 'user123',
    assetType: 'stock',
    symbols: ['AAPL'],
    riskTolerance: 'moderate',
    maxDrawdown: 0.15,
    maxPositionSize: 0.10,
    enableAutoTrade: false,
    minConfidenceThreshold: 70,
    consensusRequirement: 'majority',
  };

  it('should update agent accuracy based on trade outcome', () => {
    const bot = createTradingBot(accuracyTestConfig);
    
    // Create a mock signal
    const mockSignal = {
      id: 'test_signal',
      symbol: 'AAPL',
      assetType: 'stock' as const,
      action: 'buy' as const,
      quantity: 10,
      price: 150,
      confidence: 75,
      urgency: 'normal' as const,
      reasoning: 'Test signal',
      agentVotes: [
        { agentName: 'technical', signal: 'buy' as const, confidence: 80, weight: 0.65, reasoning: 'Bullish' },
        { agentName: 'fundamental', signal: 'buy' as const, confidence: 70, weight: 0.60, reasoning: 'Good value' },
      ],
      consensusDetails: {
        method: 'weighted_voting' as const,
        totalVotes: 2,
        buyVotes: 2,
        sellVotes: 0,
        holdVotes: 0,
        riskApproved: true,
      },
      timestamp: Date.now(),
      status: 'executed' as const,
    };

    const initialState = bot.getState();
    const initialTechnicalAccuracy = initialState.agentAccuracies['technical'];

    bot.updateAgentAccuracy(mockSignal, true);

    const updatedState = bot.getState();
    expect(updatedState.successfulTrades).toBe(1);
    // Accuracy should be updated (EMA-style)
    expect(updatedState.agentAccuracies['technical']).not.toBe(initialTechnicalAccuracy);
  });
});
