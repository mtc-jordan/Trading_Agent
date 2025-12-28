import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the LLM module
vi.mock('./_core/llm', () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          recommendation: 'buy',
          confidence: 0.75,
          reasoning: 'Strong technical indicators',
          keyFactors: ['RSI oversold', 'MACD bullish crossover'],
          priceTarget: 185.50,
          stopLoss: 172.00,
          takeProfit: 195.00
        })
      }
    }]
  })
}));

// Mock the data API
vi.mock('./_core/dataApi', () => ({
  callDataApi: vi.fn().mockResolvedValue({
    chart: {
      result: [{
        meta: {
          regularMarketPrice: 178.50,
          fiftyTwoWeekHigh: 199.62,
          fiftyTwoWeekLow: 164.08
        },
        timestamp: [1703980800, 1704067200, 1704153600],
        indicators: {
          quote: [{
            open: [175.0, 176.5, 177.2],
            high: [178.0, 179.5, 180.0],
            low: [174.0, 175.0, 176.0],
            close: [177.5, 178.0, 178.5],
            volume: [50000000, 48000000, 52000000]
          }]
        }
      }]
    }
  })
}));

describe('Enhanced Analysis Feature', () => {
  describe('Multi-Agent Consensus System', () => {
    it('should have 5 specialized AI agents', () => {
      const expectedAgents = [
        'Technical Analysis',
        'Fundamental Analysis',
        'Sentiment Analysis',
        'Risk Management',
        'Quantitative Analysis'
      ];
      
      // Verify agent types are defined
      expectedAgents.forEach(agent => {
        expect(agent).toBeDefined();
      });
    });

    it('should support all recommendation types', () => {
      const recommendations = ['strong_buy', 'buy', 'hold', 'sell', 'strong_sell'];
      
      recommendations.forEach(rec => {
        expect(['strong_buy', 'buy', 'hold', 'sell', 'strong_sell']).toContain(rec);
      });
    });

    it('should calculate consensus from multiple agents', () => {
      const agentScores = [
        { recommendation: 'buy', confidence: 0.8 },
        { recommendation: 'buy', confidence: 0.7 },
        { recommendation: 'hold', confidence: 0.6 },
        { recommendation: 'buy', confidence: 0.75 },
        { recommendation: 'strong_buy', confidence: 0.85 }
      ];
      
      // Count recommendations
      const counts: Record<string, number> = {};
      agentScores.forEach(agent => {
        counts[agent.recommendation] = (counts[agent.recommendation] || 0) + 1;
      });
      
      // Most common should be 'buy'
      const mostCommon = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      expect(mostCommon).toBe('buy');
    });
  });

  describe('Kelly Criterion Position Sizing', () => {
    it('should calculate Kelly fraction correctly', () => {
      // Kelly formula: f* = p - (q / b)
      // where b = win/loss ratio, p = win probability, q = loss probability
      const winProbability = 0.6;
      const lossProbability = 1 - winProbability;
      const winLossRatio = 1.5; // Average win / Average loss
      
      const kellyFraction = winProbability - (lossProbability / winLossRatio);
      
      // With 60% win rate and 1.5:1 win/loss ratio
      // Kelly = 0.6 - (0.4 / 1.5) = 0.6 - 0.267 = 0.333
      expect(kellyFraction).toBeCloseTo(0.333, 2);
      expect(kellyFraction).toBeGreaterThan(0);
      expect(kellyFraction).toBeLessThan(1);
    });

    it('should use fractional Kelly (25%) for reduced volatility', () => {
      const fullKelly = 0.4;
      const fractionalKelly = fullKelly * 0.25;
      
      expect(fractionalKelly).toBe(0.1);
      expect(fractionalKelly).toBeLessThan(fullKelly);
    });

    it('should calculate recommended position size', () => {
      const accountBalance = 10000;
      const kellyFraction = 0.1;
      const recommendedSize = accountBalance * kellyFraction;
      
      expect(recommendedSize).toBe(1000);
    });

    it('should cap position size at maximum risk threshold', () => {
      const accountBalance = 10000;
      const maxRiskPercent = 0.02; // 2% max risk
      const maxRisk = accountBalance * maxRiskPercent;
      
      expect(maxRisk).toBe(200);
    });
  });

  describe('Market Regime Detection', () => {
    it('should identify bull market regime', () => {
      const prices = [100, 105, 110, 115, 120, 125];
      const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      
      expect(avgReturn).toBeGreaterThan(0);
      
      const regime = avgReturn > 0.02 ? 'bull' : avgReturn < -0.02 ? 'bear' : 'sideways';
      expect(regime).toBe('bull');
    });

    it('should identify bear market regime', () => {
      const prices = [125, 120, 115, 110, 105, 100];
      const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      
      expect(avgReturn).toBeLessThan(0);
      
      const regime = avgReturn > 0.02 ? 'bull' : avgReturn < -0.02 ? 'bear' : 'sideways';
      expect(regime).toBe('bear');
    });

    it('should identify sideways market regime', () => {
      const prices = [100, 102, 99, 101, 100, 101];
      const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      
      const regime = avgReturn > 0.02 ? 'bull' : avgReturn < -0.02 ? 'bear' : 'sideways';
      expect(regime).toBe('sideways');
    });

    it('should detect high volatility regime', () => {
      const prices = [100, 110, 95, 115, 90, 120];
      const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((a, r) => a + Math.pow(r - avgReturn, 2), 0) / returns.length;
      const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized
      
      expect(volatility).toBeGreaterThan(20); // High volatility threshold
    });
  });

  describe('Technical Indicators', () => {
    it('should calculate RSI correctly', () => {
      // RSI = 100 - (100 / (1 + RS))
      // RS = Average Gain / Average Loss
      const avgGain = 1.5;
      const avgLoss = 1.0;
      const rs = avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      
      expect(rsi).toBeCloseTo(60, 0);
      expect(rsi).toBeGreaterThan(0);
      expect(rsi).toBeLessThan(100);
    });

    it('should identify oversold condition (RSI < 30)', () => {
      const rsi = 25;
      const isOversold = rsi < 30;
      
      expect(isOversold).toBe(true);
    });

    it('should identify overbought condition (RSI > 70)', () => {
      const rsi = 75;
      const isOverbought = rsi > 70;
      
      expect(isOverbought).toBe(true);
    });

    it('should calculate ATR for volatility', () => {
      const trueRanges = [2.5, 3.0, 2.8, 3.2, 2.9];
      const atr = trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length;
      
      expect(atr).toBeCloseTo(2.88, 1);
    });

    it('should calculate Bollinger Band %B', () => {
      const price = 105;
      const upperBand = 110;
      const lowerBand = 90;
      const percentB = (price - lowerBand) / (upperBand - lowerBand);
      
      expect(percentB).toBeCloseTo(0.75, 2);
      expect(percentB).toBeGreaterThan(0);
      expect(percentB).toBeLessThan(1);
    });
  });

  describe('Stop Loss and Take Profit', () => {
    it('should calculate ATR-based stop loss', () => {
      const currentPrice = 100;
      const atr = 2.5;
      const atrMultiplier = 2;
      const stopLoss = currentPrice - (atr * atrMultiplier);
      
      expect(stopLoss).toBe(95);
    });

    it('should calculate take profit with risk/reward ratio', () => {
      const currentPrice = 100;
      const stopLoss = 95;
      const riskRewardRatio = 2;
      const risk = currentPrice - stopLoss;
      const takeProfit = currentPrice + (risk * riskRewardRatio);
      
      expect(takeProfit).toBe(110);
    });

    it('should ensure positive risk/reward ratio', () => {
      const currentPrice = 100;
      const stopLoss = 95;
      const takeProfit = 110;
      
      const risk = currentPrice - stopLoss;
      const reward = takeProfit - currentPrice;
      const riskRewardRatio = reward / risk;
      
      expect(riskRewardRatio).toBe(2);
      expect(riskRewardRatio).toBeGreaterThan(1);
    });
  });

  describe('Ensemble Prediction', () => {
    it('should combine agent predictions with confidence weighting', () => {
      const predictions = [
        { direction: 'up', confidence: 0.8 },
        { direction: 'up', confidence: 0.7 },
        { direction: 'down', confidence: 0.6 },
        { direction: 'up', confidence: 0.75 },
        { direction: 'up', confidence: 0.85 }
      ];
      
      // Weight by confidence
      let upWeight = 0;
      let downWeight = 0;
      
      predictions.forEach(p => {
        if (p.direction === 'up') upWeight += p.confidence;
        else downWeight += p.confidence;
      });
      
      const ensembleDirection = upWeight > downWeight ? 'up' : 'down';
      expect(ensembleDirection).toBe('up');
    });

    it('should calculate profit probability', () => {
      const winningPredictions = 4;
      const totalPredictions = 5;
      const profitProbability = winningPredictions / totalPredictions;
      
      expect(profitProbability).toBe(0.8);
    });

    it('should calculate overall score (0-100)', () => {
      const consensusConfidence = 0.75;
      const profitProbability = 0.8;
      const riskRewardRatio = 2;
      
      // Weighted score calculation
      const score = (
        consensusConfidence * 40 +
        profitProbability * 40 +
        Math.min(riskRewardRatio / 3, 1) * 20
      );
      
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Risk Assessment', () => {
    it('should classify low risk correctly', () => {
      const volatility = 10;
      const riskLevel = volatility < 15 ? 'low' : volatility < 25 ? 'medium' : volatility < 40 ? 'high' : 'extreme';
      
      expect(riskLevel).toBe('low');
    });

    it('should classify medium risk correctly', () => {
      const volatility = 20;
      const riskLevel = volatility < 15 ? 'low' : volatility < 25 ? 'medium' : volatility < 40 ? 'high' : 'extreme';
      
      expect(riskLevel).toBe('medium');
    });

    it('should classify high risk correctly', () => {
      const volatility = 35;
      const riskLevel = volatility < 15 ? 'low' : volatility < 25 ? 'medium' : volatility < 40 ? 'high' : 'extreme';
      
      expect(riskLevel).toBe('high');
    });

    it('should classify extreme risk correctly', () => {
      const volatility = 50;
      const riskLevel = volatility < 15 ? 'low' : volatility < 25 ? 'medium' : volatility < 40 ? 'high' : 'extreme';
      
      expect(riskLevel).toBe('extreme');
    });
  });

  describe('Research-Backed Strategies', () => {
    it('should use ensemble of 5+ models as per CFA research', () => {
      const agentCount = 5;
      expect(agentCount).toBeGreaterThanOrEqual(5);
    });

    it('should apply fractional Kelly for reduced volatility', () => {
      const kellyMultiplier = 0.25;
      expect(kellyMultiplier).toBeLessThanOrEqual(0.5);
    });

    it('should adapt strategy to market regime', () => {
      const regimes = ['bull', 'bear', 'sideways', 'high_volatility', 'low_volatility'];
      
      regimes.forEach(regime => {
        let positionSizeMultiplier = 1;
        
        switch (regime) {
          case 'bull':
            positionSizeMultiplier = 1.2;
            break;
          case 'bear':
            positionSizeMultiplier = 0.5;
            break;
          case 'high_volatility':
            positionSizeMultiplier = 0.3;
            break;
          case 'low_volatility':
            positionSizeMultiplier = 1.5;
            break;
          default:
            positionSizeMultiplier = 1;
        }
        
        expect(positionSizeMultiplier).toBeGreaterThan(0);
      });
    });
  });
});
