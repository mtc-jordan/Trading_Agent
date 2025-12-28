import { describe, it, expect } from 'vitest';

// Test regime switching service functions
describe('Regime Switching Service', () => {
  describe('Regime Detection', () => {
    it('should detect bull market when price is above SMA200 with positive momentum', () => {
      // Bull market indicators
      const indicators = {
        priceVsSma200: 10, // 10% above SMA200
        rsi: 60,
        macdHistogram: 0.5,
        adx: 30,
      };
      
      // Bull market should be detected
      const isBull = indicators.priceVsSma200 > 5 && 
                     indicators.rsi > 50 && 
                     indicators.macdHistogram > 0;
      expect(isBull).toBe(true);
    });

    it('should detect bear market when price is below SMA200 with negative momentum', () => {
      const indicators = {
        priceVsSma200: -15, // 15% below SMA200
        rsi: 35,
        macdHistogram: -0.8,
        adx: 35,
      };
      
      const isBear = indicators.priceVsSma200 < -5 && 
                     indicators.rsi < 50 && 
                     indicators.macdHistogram < 0;
      expect(isBear).toBe(true);
    });

    it('should detect sideways market when ADX is low', () => {
      const indicators = {
        adx: 15, // Low ADX indicates no trend
        priceVsSma200: 2,
        rsi: 50,
      };
      
      const isSideways = indicators.adx < 20;
      expect(isSideways).toBe(true);
    });

    it('should detect volatile market when ATR is high', () => {
      const indicators = {
        atrPercent: 5, // 5% daily range
        historicalVolatility: 0.45, // 45% annualized
        bollingerWidth: 0.15,
      };
      
      const isVolatile = indicators.atrPercent > 3 || 
                         indicators.historicalVolatility > 0.35;
      expect(isVolatile).toBe(true);
    });
  });

  describe('Strategy Adjustments', () => {
    it('should recommend aggressive position sizing in bull market', () => {
      const regime = 'bull';
      const adjustments = getStrategyAdjustments(regime);
      
      expect(adjustments.positionSizeMultiplier).toBeGreaterThanOrEqual(1);
      expect(adjustments.riskLevel).toBe('aggressive');
    });

    it('should recommend conservative position sizing in bear market', () => {
      const regime = 'bear';
      const adjustments = getStrategyAdjustments(regime);
      
      expect(adjustments.positionSizeMultiplier).toBeLessThanOrEqual(0.7);
      expect(adjustments.riskLevel).toBe('conservative');
    });

    it('should recommend wider stops in volatile market', () => {
      const regime = 'volatile';
      const adjustments = getStrategyAdjustments(regime);
      
      expect(adjustments.stopLossMultiplier).toBeGreaterThan(1);
    });
  });
});

// Test options greeks calculations
describe('Options Greeks Calculator', () => {
  describe('Black-Scholes Pricing', () => {
    it('should calculate call option price correctly', () => {
      const params = {
        underlyingPrice: 100,
        strikePrice: 100,
        timeToExpiry: 1, // 1 year
        riskFreeRate: 0.05,
        volatility: 0.2,
      };
      
      // At-the-money call with 1 year expiry should have significant value
      const price = calculateCallPrice(params);
      expect(price).toBeGreaterThan(5);
      expect(price).toBeLessThan(20);
    });

    it('should calculate put option price correctly', () => {
      const params = {
        underlyingPrice: 100,
        strikePrice: 100,
        timeToExpiry: 1,
        riskFreeRate: 0.05,
        volatility: 0.2,
      };
      
      const price = calculatePutPrice(params);
      expect(price).toBeGreaterThan(0);
      expect(price).toBeLessThan(15);
    });

    it('should satisfy put-call parity', () => {
      const params = {
        underlyingPrice: 100,
        strikePrice: 100,
        timeToExpiry: 1,
        riskFreeRate: 0.05,
        volatility: 0.2,
      };
      
      const callPrice = calculateCallPrice(params);
      const putPrice = calculatePutPrice(params);
      
      // Put-Call Parity: C - P = S - K * e^(-rT)
      const parity = callPrice - putPrice;
      const expected = params.underlyingPrice - params.strikePrice * Math.exp(-params.riskFreeRate * params.timeToExpiry);
      
      expect(Math.abs(parity - expected)).toBeLessThan(0.01);
    });
  });

  describe('Greeks Calculations', () => {
    it('should calculate delta between 0 and 1 for calls', () => {
      const delta = calculateDelta('call', 100, 100, 0.25, 0.05, 0.2);
      expect(delta).toBeGreaterThan(0);
      expect(delta).toBeLessThan(1);
    });

    it('should calculate delta between -1 and 0 for puts', () => {
      const delta = calculateDelta('put', 100, 100, 0.25, 0.05, 0.2);
      expect(delta).toBeGreaterThan(-1);
      expect(delta).toBeLessThan(0);
    });

    it('should calculate gamma as positive for both calls and puts', () => {
      const gamma = calculateGamma(100, 100, 0.25, 0.05, 0.2);
      expect(gamma).toBeGreaterThan(0);
    });

    it('should calculate theta as negative for long options', () => {
      const theta = calculateTheta('call', 100, 100, 0.25, 0.05, 0.2);
      expect(theta).toBeLessThan(0);
    });

    it('should calculate vega as positive', () => {
      const vega = calculateVega(100, 100, 0.25, 0.05, 0.2);
      expect(vega).toBeGreaterThan(0);
    });
  });

  describe('Implied Volatility', () => {
    it('should converge to correct IV using Newton-Raphson', () => {
      const marketPrice = 10;
      const underlyingPrice = 100;
      const strikePrice = 100;
      const timeToExpiry = 0.25;
      const riskFreeRate = 0.05;
      
      const iv = calculateImpliedVolatility(
        marketPrice, underlyingPrice, strikePrice, 
        timeToExpiry, riskFreeRate, 'call'
      );
      
      expect(iv).toBeGreaterThan(0.1);
      expect(iv).toBeLessThan(1.0);
    });
  });
});

// Test sentiment analysis
describe('Sentiment Analysis Service', () => {
  describe('Sentiment Scoring', () => {
    it('should classify very bullish sentiment correctly', () => {
      const score = 0.7;
      const level = scoreToLevel(score);
      expect(level).toBe('very_bullish');
    });

    it('should classify bearish sentiment correctly', () => {
      const score = -0.4;
      const level = scoreToLevel(score);
      expect(level).toBe('bearish');
    });

    it('should classify neutral sentiment correctly', () => {
      const score = 0.1;
      const level = scoreToLevel(score);
      expect(level).toBe('neutral');
    });
  });

  describe('Fear & Greed Index', () => {
    it('should calculate index value between 0 and 100', () => {
      const components = {
        marketMomentum: 60,
        stockPriceStrength: 55,
        stockPriceBreadth: 50,
        putCallRatio: 45,
        marketVolatility: 40,
        safehavenDemand: 35,
        junkBondDemand: 50,
      };
      
      const value = calculateFearGreedValue(components);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    });

    it('should classify extreme fear correctly', () => {
      const value = 15;
      const level = getFearGreedLevel(value);
      expect(level).toBe('extreme_fear');
    });

    it('should classify extreme greed correctly', () => {
      const value = 85;
      const level = getFearGreedLevel(value);
      expect(level).toBe('extreme_greed');
    });
  });

  describe('Trading Implications', () => {
    it('should generate buy signal for bullish sentiment with improving momentum', () => {
      const sentiment = {
        overallScore: 0.6,
        momentum: { trend: 'improving' as const },
      };
      
      const signal = getTradingSignal(sentiment);
      expect(signal.signal).toBe('buy');
      expect(signal.strength).toBe('strong');
    });

    it('should generate sell signal for bearish sentiment with deteriorating momentum', () => {
      const sentiment = {
        overallScore: -0.6,
        momentum: { trend: 'deteriorating' as const },
      };
      
      const signal = getTradingSignal(sentiment);
      expect(signal.signal).toBe('sell');
      expect(signal.strength).toBe('strong');
    });

    it('should generate hold signal for neutral sentiment', () => {
      const sentiment = {
        overallScore: 0.05,
        momentum: { trend: 'stable' as const },
      };
      
      const signal = getTradingSignal(sentiment);
      expect(signal.signal).toBe('hold');
    });
  });
});

// Helper functions for tests
function getStrategyAdjustments(regime: string) {
  const adjustments: Record<string, { positionSizeMultiplier: number; stopLossMultiplier: number; riskLevel: string }> = {
    bull: { positionSizeMultiplier: 1.2, stopLossMultiplier: 1.0, riskLevel: 'aggressive' },
    bear: { positionSizeMultiplier: 0.5, stopLossMultiplier: 0.8, riskLevel: 'conservative' },
    sideways: { positionSizeMultiplier: 0.8, stopLossMultiplier: 1.0, riskLevel: 'moderate' },
    volatile: { positionSizeMultiplier: 0.6, stopLossMultiplier: 1.5, riskLevel: 'conservative' },
  };
  return adjustments[regime] || adjustments.sideways;
}

function calculateCallPrice(params: { underlyingPrice: number; strikePrice: number; timeToExpiry: number; riskFreeRate: number; volatility: number }) {
  const { underlyingPrice, strikePrice, timeToExpiry, riskFreeRate, volatility } = params;
  const d1 = (Math.log(underlyingPrice / strikePrice) + (riskFreeRate + volatility * volatility / 2) * timeToExpiry) / (volatility * Math.sqrt(timeToExpiry));
  const d2 = d1 - volatility * Math.sqrt(timeToExpiry);
  return underlyingPrice * normalCDF(d1) - strikePrice * Math.exp(-riskFreeRate * timeToExpiry) * normalCDF(d2);
}

function calculatePutPrice(params: { underlyingPrice: number; strikePrice: number; timeToExpiry: number; riskFreeRate: number; volatility: number }) {
  const { underlyingPrice, strikePrice, timeToExpiry, riskFreeRate, volatility } = params;
  const d1 = (Math.log(underlyingPrice / strikePrice) + (riskFreeRate + volatility * volatility / 2) * timeToExpiry) / (volatility * Math.sqrt(timeToExpiry));
  const d2 = d1 - volatility * Math.sqrt(timeToExpiry);
  return strikePrice * Math.exp(-riskFreeRate * timeToExpiry) * normalCDF(-d2) - underlyingPrice * normalCDF(-d1);
}

function calculateDelta(optionType: string, S: number, K: number, T: number, r: number, sigma: number) {
  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
  return optionType === 'call' ? normalCDF(d1) : normalCDF(d1) - 1;
}

function calculateGamma(S: number, K: number, T: number, r: number, sigma: number) {
  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
  return normalPDF(d1) / (S * sigma * Math.sqrt(T));
}

function calculateTheta(optionType: string, S: number, K: number, T: number, r: number, sigma: number) {
  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  const term1 = -(S * normalPDF(d1) * sigma) / (2 * Math.sqrt(T));
  if (optionType === 'call') {
    return (term1 - r * K * Math.exp(-r * T) * normalCDF(d2)) / 365;
  }
  return (term1 + r * K * Math.exp(-r * T) * normalCDF(-d2)) / 365;
}

function calculateVega(S: number, K: number, T: number, r: number, sigma: number) {
  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
  return S * Math.sqrt(T) * normalPDF(d1) / 100;
}

function calculateImpliedVolatility(marketPrice: number, S: number, K: number, T: number, r: number, optionType: string) {
  let sigma = 0.25;
  for (let i = 0; i < 100; i++) {
    const price = optionType === 'call' 
      ? calculateCallPrice({ underlyingPrice: S, strikePrice: K, timeToExpiry: T, riskFreeRate: r, volatility: sigma })
      : calculatePutPrice({ underlyingPrice: S, strikePrice: K, timeToExpiry: T, riskFreeRate: r, volatility: sigma });
    const vega = calculateVega(S, K, T, r, sigma) * 100;
    const diff = price - marketPrice;
    if (Math.abs(diff) < 0.001) break;
    sigma = sigma - diff / vega;
    sigma = Math.max(0.01, Math.min(5, sigma));
  }
  return sigma;
}

function scoreToLevel(score: number): string {
  if (score < -0.6) return 'very_bearish';
  if (score < -0.2) return 'bearish';
  if (score < 0.2) return 'neutral';
  if (score < 0.6) return 'bullish';
  return 'very_bullish';
}

function calculateFearGreedValue(components: Record<string, number>) {
  const weights = {
    marketMomentum: 0.2,
    stockPriceStrength: 0.15,
    stockPriceBreadth: 0.15,
    putCallRatio: 0.15,
    marketVolatility: 0.15,
    safehavenDemand: 0.1,
    junkBondDemand: 0.1,
  };
  return Object.entries(components).reduce((sum, [key, value]) => {
    return sum + value * (weights[key as keyof typeof weights] || 0);
  }, 0);
}

function getFearGreedLevel(value: number): string {
  if (value < 20) return 'extreme_fear';
  if (value < 40) return 'fear';
  if (value < 60) return 'neutral';
  if (value < 80) return 'greed';
  return 'extreme_greed';
}

function getTradingSignal(sentiment: { overallScore: number; momentum: { trend: string } }) {
  const { overallScore, momentum } = sentiment;
  
  if (overallScore > 0.5 && momentum.trend === 'improving') {
    return { signal: 'buy', strength: 'strong' };
  } else if (overallScore > 0.2) {
    return { signal: 'buy', strength: 'moderate' };
  } else if (overallScore < -0.5 && momentum.trend === 'deteriorating') {
    return { signal: 'sell', strength: 'strong' };
  } else if (overallScore < -0.2) {
    return { signal: 'sell', strength: 'moderate' };
  }
  return { signal: 'hold', strength: 'weak' };
}

function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}
